import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { platformConfig, allGames } from '../src/lib/data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CLI args
const args = process.argv.slice(2);
const FAIL_FAST = args.includes('--fail-fast') || args.includes('-f');
const DEBUG = args.includes('--debug') || args.includes('-d');
const REFETCH = args.includes('--refetch') || args.includes('-r');
const CHECK_DISCS = args.includes('--check-discs') || args.includes('--multi-disc') || args.includes('--check-disks');
const HEADLESS = !args.includes('--visible');

const platformArg = args.find(a => a.startsWith('--platform='));
const PLATFORM_FILTER = platformArg ? platformArg.split('=')[1] : null;

const scoreArg = args.find(a => a.startsWith('--min-score='));
const MIN_SCORE = scoreArg ? parseInt(scoreArg.split('=')[1], 10) : 60;

const sourceArg = args.find(a => a.startsWith('--source='));
const SOURCE = sourceArg ? sourceArg.split('=')[1] : 'auto';

const gameArg = args.find(a => a.startsWith('--game='));
const GAME_FILTER = gameArg ? gameArg.split('=')[1].toLowerCase() : null;

const ROMS_DIR = path.join(__dirname, '../roms');
const TEMP_DIR = path.join(__dirname, '../roms/.temp', `proc-${process.pid}`);
const FAILED_LOG = path.join(ROMS_DIR, 'failed.log');

// Myrient Config
const MYRIENT_BASE = 'https://myrient.erista.me/files';
const MYRIENT_PATHS = {
    'SNES': '/No-Intro/Nintendo - Super Nintendo Entertainment System/',
    'GBA': '/No-Intro/Nintendo - Game Boy Advance/',
    'Genesis': '/No-Intro/Sega - Mega Drive - Genesis/',
    'NES': '/No-Intro/Nintendo - Nintendo Entertainment System (Headered)/',
    'N64': '/No-Intro/Nintendo - Nintendo 64 (BigEndian)/',
    'GB/GBC': ['/No-Intro/Nintendo - Game Boy Color/', '/No-Intro/Nintendo - Game Boy/'],
    'Master System': '/No-Intro/Sega - Master System - Mark III/',
    'PS1': '/Redump/Sony - PlayStation/',
    'Saturn': '/Redump/Sega - Saturn/'
};

const MULTI_DISC_PLATFORMS = ['PS1', 'Saturn'];

if (!fs.existsSync(ROMS_DIR)) fs.mkdirSync(ROMS_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const normalizeFilename = (name) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/'/g, '').replace(/[^a-z0-9]/gi, '_').replace(/^_+|_+$/g, '').toLowerCase();

const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const printSizeSummary = () => {
    console.log('\n--- ROMs Directory Size Summary ---\n');
    let totalSize = 0;
    let totalCount = 0;

    const platforms = Object.entries(platformConfig)
        .filter(([key, config]) => config.arkosFolder)
        .sort((a, b) => a[0].localeCompare(b[0]));

    console.log(`${'Platform'.padEnd(15)} | ${'Count'.padEnd(8)} | ${'Size'.padEnd(10)}`);
    console.log('-'.repeat(40));

    for (const [name, config] of platforms) {
        const platformDir = path.join(ROMS_DIR, config.arkosFolder);
        let count = 0;
        let size = 0;

        if (fs.existsSync(platformDir)) {
            const files = fs.readdirSync(platformDir).filter(f => !f.startsWith('.'));

            const uniqueGames = new Set();

            for (const file of files) {
                try {
                    const filePath = path.join(platformDir, file);
                    const stats = fs.statSync(filePath);
                    size += stats.size;

                    // Only count files, exclude gamelist.xml
                    if (stats.isFile() && file !== 'gamelist.xml') {
                        const ext = path.extname(file);
                        const nameWithoutExt = path.basename(file, ext);
                        // Remove _disc suffix (e.g. game_disc1 -> game)
                        const baseName = nameWithoutExt.replace(/_disc\w+$/, '');
                        uniqueGames.add(baseName);
                    }
                } catch (e) { }
            }
            count = uniqueGames.size;
        }

        console.log(`${name.padEnd(15)} | ${count.toString().padEnd(8)} | ${formatBytes(size).padEnd(10)}`);
        totalSize += size;
        totalCount += count;
    }

    console.log('-'.repeat(40));
    console.log(`${'TOTAL'.padEnd(15)} | ${totalCount.toString().padEnd(8)} | ${formatBytes(totalSize).padEnd(10)}\n`);
};

const cleanSearchTerm = (name) => {
    let clean = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/'/g, '').replace(/[^a-z0-9\s]/gi, ' ');
    const stopWords = [
        'the', 'and', 'of', 'a', 'an', 'to', 'in', 'for', 'with', 'on', 'at', 'by', 'from',
        'usa', 'europe', 'japan', 'eu', 'us', 'jp', 'rev', 'v1', 'v2', 'v3',
        'beta', 'demo', 'proto', 'sample', 'sgb', 'enhanced', 'compatible'
    ];
    return clean.toLowerCase().split(/\s+/).filter(w => w && !stopWords.includes(w)).join(' ');
};

const logFailure = (game, error) => {
    const entry = `${new Date().toISOString()} | ${game.platform} | ${game.name} | ${error}\n`;
    fs.appendFileSync(FAILED_LOG, entry);
};

const clearTemp = () => {
    if (fs.existsSync(TEMP_DIR)) {
        for (const file of fs.readdirSync(TEMP_DIR)) {
            try {
                fs.rmSync(path.join(TEMP_DIR, file), { recursive: true, force: true });
            } catch (e) { }
        }
    }
};

const getDiscSuffix = (filename) => {
    const match = filename.match(/\(Disc\s*(\d+|[A-Z])\)/i);
    return match ? `_disc${match[1].toLowerCase()}` : '';
};

const findMultiDiscSiblings = (index, mainMatch) => {
    const mainSuffix = getDiscSuffix(mainMatch.text);
    if (!mainSuffix) return [];

    const baseName = mainMatch.text.replace(/\(Disc\s*(\d+|[A-Z])\)/i, '').trim();
    return index.filter(g => {
        if (g.text === mainMatch.text) return false;
        const subSuffix = getDiscSuffix(g.text);
        if (!subSuffix) return false;
        const subBase = g.text.replace(/\(Disc\s*(\d+|[A-Z])\)/i, '').trim();
        return subBase === baseName;
    });
};

const waitForDownload = async (downloadPath, timeout, logPrefix = '   ') => {
    const start = Date.now();
    let lastLog = 0;
    let lastSize = -1;
    let lastSizeChange = Date.now();

    while (Date.now() - start < timeout) {
        let files = [];
        try { files = fs.readdirSync(downloadPath); } catch (e) { }

        const activeFile = files.find(f => {
            if (f.startsWith('.')) return false;
            try { return fs.statSync(path.join(downloadPath, f)).isFile(); } catch { return false; }
        });

        if (activeFile) {
            let currentSize = 0;
            try {
                const stats = fs.statSync(path.join(downloadPath, activeFile));
                currentSize = stats.size;
            } catch (e) { }

            if (currentSize !== lastSize) {
                lastSize = currentSize;
                lastSizeChange = Date.now();
            }

            if (Date.now() - lastLog > 3000) {
                const elapsed = Math.round((Date.now() - start) / 1000);
                process.stdout.write(`\r${logPrefix} Downloading: ${formatBytes(currentSize)} (${elapsed}s)    `);
                lastLog = Date.now();
            }

            const isCrDownload = activeFile.endsWith('.crdownload') || activeFile.endsWith('.part');
            if (!isCrDownload && currentSize > 0 && !files.some(f => f.endsWith('.crdownload'))) {
                process.stdout.write(`\r${logPrefix} Finished: ${formatBytes(currentSize)}                \n`);
                return path.join(downloadPath, activeFile);
            }

            if (Date.now() - lastSizeChange > 45000 && currentSize > 0) {
                process.stdout.write('\n');
                throw new Error('Download stalled');
            }
        }
        await new Promise(r => setTimeout(r, 1000));
    }
    process.stdout.write('\n');
    throw new Error(`Timeout after ${timeout / 1000}s`);
};

// --- Myrient ---
const myrientIndexes = {};

const buildMyrientIndex = async (page, pathSuffix) => {
    if (myrientIndexes[pathSuffix]) return myrientIndexes[pathSuffix];

    if (!pathSuffix) return null;

    console.log(`[Myrient] Indexing ${pathSuffix}...`);
    const fullUrl = `${MYRIENT_BASE}${pathSuffix}`;

    try {
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('table#list tbody tr', { timeout: 30000 });

        const games = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('table#list tbody tr'))
                .map(row => {
                    const link = row.querySelector('a');
                    return link ? { text: link.textContent.trim(), href: link.href } : null;
                })
                .filter(g => g && !g.text.startsWith('.') && g.text !== 'Parent Directory');
        });
        console.log(`[Myrient] Indexed ${games.length} games for ${pathSuffix}`);
        myrientIndexes[pathSuffix] = games;
        return games;
    } catch (err) {
        console.error(`[Myrient] Indexing failed for ${pathSuffix}: ${err.message}`);
        return null;
    }
};

const findBestMatchMyrient = (games, gameName) => {
    if (!games || games.length === 0) return null;
    const normalizedTarget = cleanSearchTerm(gameName).replace(/\s+/g, '');
    const targetWords = cleanSearchTerm(gameName).split(' ');

    // Check if target implies a sequel
    const sequelMarkers = ['2', '3', '4', '5', 'ii', 'iii', 'iv', 'v'];
    const targetHasSequel = targetWords.some(w => sequelMarkers.includes(w));

    const ratedGames = games.map(g => {
        const fileText = g.text;
        const nameNoExt = fileText.replace(/\.[^/.]+$/, "");
        const normalizedFile = cleanSearchTerm(nameNoExt).replace(/\s+/g, '');
        const fileWords = cleanSearchTerm(nameNoExt).split(' ');
        let score = 0;

        // Exact match preference
        if (normalizedFile === normalizedTarget) score = 100;
        else if (normalizedFile.includes(normalizedTarget)) {
            // Check if file is a sequel but target isn't
            const fileHasSequel = fileWords.some(w => sequelMarkers.includes(w));
            if (fileHasSequel && !targetHasSequel) {
                // If file ends with target, the sequel number is likely a prefix (e.g. "SMW 2 - Yoshi's Island"), so match is valid.
                // We strip trailing digits (e.g. from "Rev 1") to ensure we match
                const cleanFileEnd = normalizedFile.replace(/\d+$/, '');
                if (cleanFileEnd.endsWith(normalizedTarget)) {
                    score = 80;
                } else {
                    score = 10;
                }
            } else {
                score = 80;
                // Penalize if file is significantly longer
                // e.g. "Super Mario World" (3 words) vs "Super Mario All-Stars + Super Mario World" (8 words)
                if (fileWords.length > targetWords.length + 3) score -= 15;
            }
        }
        else if (normalizedTarget.includes(normalizedFile)) {
            // Target is longer than file (e.g. searching "Super Mario World 2" and finding "Super Mario World")
            // usually safer than the reverse, but still risky
            score = 60;
        }
        else {
            // Use strict word matching instead of substring inclusion
            // This avoids "land" matching "island"
            const matchCount = targetWords.filter(w => fileWords.includes(w)).length;
            const ratio = matchCount / targetWords.length;

            if (ratio === 1) {
                // All target words are in file
                // Penalize if file is much longer (e.g. "SimCity" -> "SimCity 2000")
                if (fileWords.length > targetWords.length + 4) score = 40;
                else score = 70;
            }
            else if (ratio >= 0.75) score = 50; // Require 75% match (3/4 words)

            // Reverse check: how many file words are in target?
            const fileMatchCount = fileWords.filter(w => targetWords.includes(w)).length;
            if (fileWords.length > 0 && fileMatchCount / fileWords.length >= 0.8) {
                score = Math.max(score, 60);
            }
        }

        if (fileText.includes('(USA)')) score += 20;
        if (fileText.includes('Rev') || fileText.includes('v1.')) score += 5;

        if (fileText.includes('(Japan)') || fileText.includes('(Europe)') || fileText.includes('(Germany)') || fileText.includes('(France)')) score -= 10;
        if (fileText.includes('Beta') || fileText.includes('Demo') || fileText.includes('Proto') || fileText.includes('Pirate')) score -= 40;

        return { ...g, score };
    }).filter(g => g.score > 60).sort((a, b) => b.score - a.score);

    return ratedGames.length > 0 ? ratedGames[0] : null;
};

// --- Retrostic ---
const searchGameRetrostic = async (page, platform, gameName) => {
    const retrosticPlatform = platformConfig[platform] ? platformConfig[platform].retrostic : null;
    if (!retrosticPlatform) throw new Error('No retrostic platform config');
    const searchUrl = `https://www.retrostic.com/roms/${retrosticPlatform}?search=${encodeURIComponent(gameName)}`;
    await page.goto(searchUrl, { waitUntil: 'load', timeout: 45000 });
    const noResults = await page.evaluate(() => document.body.textContent.toLowerCase().includes('no results found'));
    if (noResults) throw new Error('No results');
};

const findBestMatchRetrostic = async (page, gameName) => {
    const gameLinks = await page.$$eval('a[href*="/roms/"]', (links, targetName) => {
        const normalizedTarget = targetName.toLowerCase().replace(/[^a-z0-9]/g, '');
        return links.filter(link => {
            const href = link.getAttribute('href');
            return href && href.match(/\/roms\/[^/]+\/[^/]+-\d+$/);
        }).map(link => {
            const text = link.textContent.trim();
            const normalizedText = text.toLowerCase().replace(/[^a-z0-9]/g, '');
            let score = normalizedText === normalizedTarget ? 100 : (normalizedText.includes(normalizedTarget) ? 90 : 50);
            if (text.includes('(USA)')) score += 10;
            return { text, href: link.href, score };
        }).filter(r => r.score > 0).sort((a, b) => b.score - a.score);
    }, gameName);

    if (gameLinks.length === 0) throw new Error('No matches');
    return gameLinks[0];
};

const downloadRomRetrostic = async (page, downloadDir, timeout) => {
    const downloadBtn = await page.$('.romdownbtn');
    if (downloadBtn) await downloadBtn.click();
    else await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('a, button')).find(el => el.textContent.toLowerCase().includes('download') && !el.textContent.toLowerCase().includes('emulator'));
        if (btn) btn.click();
    });
    for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 1000));
        let files = [];
        try { files = fs.readdirSync(downloadDir); } catch (e) { }
        if (files.some(f => !f.startsWith('.'))) break;
    }
    return await waitForDownload(downloadDir, timeout, '   [Retrostic]');
};

// --- Main Process ---
const processGames = async () => {
    fs.appendFileSync(FAILED_LOG, `\n--- RUN START: ${new Date().toISOString()} ---\n`);

    const browser = await puppeteer.launch({
        headless: HEADLESS,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const client = await page.createCDPSession();
    await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: TEMP_DIR });
    await page.setViewport({ width: 1280, height: 800 });

    const gamesToProcess = allGames.filter((g) => {
        if (PLATFORM_FILTER && g.platform !== PLATFORM_FILTER) return false;
        if (GAME_FILTER && !g.name.toLowerCase().includes(GAME_FILTER)) return false;
        return true;
    });
    console.log(`Processing ${gamesToProcess.length} games...\n`);

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (const game of gamesToProcess) {
        try {
            const platformDir = path.join(ROMS_DIR, platformConfig[game.platform].arkosFolder);
            if (!fs.existsSync(platformDir)) fs.mkdirSync(platformDir, { recursive: true });

            const baseFilename = normalizeFilename(game.name);
            const mainFileExists = fs.readdirSync(platformDir).some(f => f.startsWith(baseFilename + '.') && !f.includes('_disc'));

            const shouldCheckDiscs = CHECK_DISCS && MULTI_DISC_PLATFORMS.includes(game.platform);

            if (!REFETCH && !shouldCheckDiscs && (mainFileExists || fs.readdirSync(platformDir).some(f => f.startsWith(baseFilename + '_disc1')))) {
                if (DEBUG) {
                    // Fall through to check matches
                } else {
                    skipCount++;
                    continue;
                }
            }

            console.log(`[${game.platform}] ${game.name}...`);
            clearTemp();

            // Default timeout 10 minutes (600s) for all, lengthy downloads common
            const downloadTimeout = 600000;
            let downloadedMain = false;
            let downloadedFile = null;
            let usedSource = null;

            // Strategy 1: Myrient
            if (MYRIENT_PATHS[game.platform]) {
                const paths = Array.isArray(MYRIENT_PATHS[game.platform])
                    ? MYRIENT_PATHS[game.platform]
                    : [MYRIENT_PATHS[game.platform]];

                let candidates = [];

                for (const pathSuffix of paths) {
                    try {
                        const index = await buildMyrientIndex(page, pathSuffix);
                        const match = findBestMatchMyrient(index, game.name);

                        if (match) {
                            candidates.push({ match, pathSuffix });
                        }
                    } catch (e) {
                        if (DEBUG) console.log(`   [Debug] Myrient check failed for path ${pathSuffix}: ${e.message}`);
                    }
                }

                candidates.sort((a, b) => b.match.score - a.match.score);

                if (candidates.length > 0) {
                    const best = candidates[0];
                    const { match, pathSuffix } = best;

                    // Re-fetch index for the best path to handle multi-disc siblings correctly
                    // (Unless we want to store the index in candidates, which is heavy)
                    const index = await buildMyrientIndex(page, pathSuffix);

                    const downloads = [{ match, suffix: getDiscSuffix(match.text) }];

                    if (downloads[0].suffix) {
                        const siblings = findMultiDiscSiblings(index, match);
                        siblings.forEach(s => downloads.push({ match: s, suffix: getDiscSuffix(s.text) }));
                        if (siblings.length > 0) console.log(`   Detailed multi-disc detected: ${siblings.length + 1} discs found.`);
                    }

                    for (const item of downloads) {
                        const finalExt = path.extname(item.match.text) || '.zip';
                        const targetName = item.suffix
                            ? `${baseFilename}${item.suffix}${finalExt}`
                            : `${baseFilename}${finalExt}`;

                        const targetPath = path.join(platformDir, targetName);
                        let alreadyExists = fs.existsSync(targetPath);

                        if (!alreadyExists && item.suffix === '_disc1') {
                            const legacyPath = path.join(platformDir, `${baseFilename}${finalExt}`);
                            if (fs.existsSync(legacyPath)) {
                                try {
                                    fs.renameSync(legacyPath, targetPath);
                                    console.log(`   Renamed legacy file to ${targetName}`);
                                    alreadyExists = true;
                                } catch (e) { }
                            }
                        }

                        if (alreadyExists && !REFETCH) {
                            if (DEBUG) console.log(`   [Debug Match]: ${item.match.text} (${pathSuffix})`);
                            if (downloads.length > 1) console.log(`   Skipping ${targetName} (already exists)`);
                            if (item === downloads[0]) downloadedMain = true;
                            continue;
                        }

                        process.stdout.write(`   Found: ${item.match.text}\n`);

                        const targetUrl = `${MYRIENT_BASE}${pathSuffix}`;
                        if (page.url() !== targetUrl) {
                            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
                            await page.waitForSelector('table#list tbody tr');
                        }

                        const linkHandle = await page.evaluateHandle((targetHref) => {
                            return Array.from(document.querySelectorAll('a')).find(a => a.href === targetHref);
                        }, item.match.href);

                        if (linkHandle && linkHandle.asElement()) {
                            await linkHandle.asElement().click();

                            let dlFile = null;
                            for (let i = 0; i < 20; i++) {
                                await new Promise(r => setTimeout(r, 500));
                                if (fs.readdirSync(TEMP_DIR).some(f => !f.startsWith('.'))) {
                                    try {
                                        dlFile = await waitForDownload(TEMP_DIR, downloadTimeout, `   [Myrient]`);
                                        usedSource = 'myrient';
                                    } catch (e) { console.log(`   Stalled: ${e.message}`); }
                                    break;
                                }
                            }

                            if (dlFile) {
                                fs.renameSync(dlFile, targetPath);
                                console.log(`   Saved: ${targetName}`);
                                if (item === downloads[0]) downloadedMain = true;
                            } else {
                                console.log('   Download failed to start.');
                            }
                        }
                    }

                    // Generate .m3u if multi-disc
                    if (downloads.length > 1 && MULTI_DISC_PLATFORMS.includes(game.platform)) {
                        const m3uPath = path.join(platformDir, `${baseFilename}.m3u`);
                        const m3uContent = downloads.map(d => {
                            const suffix = d.suffix ? d.suffix : '';
                            const fExt = path.extname(d.match.text) || '.zip';
                            return `${baseFilename}${suffix}${fExt}`;
                        }).join('\n');

                        try {
                            fs.writeFileSync(m3uPath, m3uContent);
                            console.log(`   Created playlist: ${baseFilename}.m3u`);
                        } catch (e) { console.error(`   Failed to write m3u: ${e.message}`); }
                    }
                } else if (DEBUG) {
                    console.log('   [Debug] No match found in any Myrient path.');
                }
            }

            if (downloadedMain) {
                console.log(`   Success (via myrient)!`);
                successCount++;
            } else if (!downloadedMain && !shouldCheckDiscs && (SOURCE === 'auto' || SOURCE === 'retrostic')) {
                // Strategy 2: Retrostic
                const terms = Array.from(new Set([game.name, cleanSearchTerm(game.name)]));
                for (const term of terms) {
                    try {
                        await searchGameRetrostic(page, game.platform, term);
                        const match = await findBestMatchRetrostic(page, term);
                        await page.goto(match.href, { waitUntil: 'load', timeout: 45000 });
                        downloadedFile = await downloadRomRetrostic(page, TEMP_DIR, downloadTimeout);
                        usedSource = 'retrostic';
                        break;
                    } catch (e) { }
                }

                if (downloadedFile) {
                    const ext = path.extname(downloadedFile).toLowerCase();
                    const finalName = `${normalizeFilename(game.name)}${ext}`;
                    fs.renameSync(downloadedFile, path.join(platformDir, finalName));
                    console.log(`   Success (via ${usedSource})!`);
                    successCount++;
                } else {
                    throw new Error('No matches found');
                }
            } else {
                if (!downloadedMain) throw new Error('No matches found');
            }

        } catch (error) {
            console.error(`   Failed: ${error.message}`);
            logFailure(game, error.message);
            failCount++;
        }

        await new Promise(r => setTimeout(r, 3000));
    }

    await browser.close();
    try { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); } catch (e) { }

    printSizeSummary();
    console.log(`\nAll Done! Success: ${successCount}, Skipped: ${skipCount}, Failed: ${failCount}`);
};

processGames().catch(err => { console.error(err); process.exit(1); });
