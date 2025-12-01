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
const HEADLESS = !args.includes('--visible');

// Platform filter (e.g., --platform=SNES)
const platformArg = args.find(a => a.startsWith('--platform='));
const PLATFORM_FILTER = platformArg ? platformArg.split('=')[1] : null;

// Minimum match score threshold (e.g., --min-score=60)
const scoreArg = args.find(a => a.startsWith('--min-score='));
const MIN_SCORE = scoreArg ? parseInt(scoreArg.split('=')[1], 10) : 60;

// Source selection (e.g., --source=romspedia|retrostic|auto)
const sourceArg = args.find(a => a.startsWith('--source='));
const SOURCE = sourceArg ? sourceArg.split('=')[1] : 'auto';
const VALID_SOURCES = ['romspedia', 'retrostic', 'auto'];
if (!VALID_SOURCES.includes(SOURCE)) {
    console.error(`Invalid source: ${SOURCE}. Valid options: ${VALID_SOURCES.join(', ')}`);
    process.exit(1);
}

const ROMS_DIR = path.join(__dirname, '../roms');
const TEMP_DIR = path.join(__dirname, '../roms/.temp');
const FAILED_LOG = path.join(ROMS_DIR, 'failed.log');

// Rate limiting delay (ms)
const DELAY_BETWEEN_DOWNLOADS = 3000;

// Ensure directories exist
if (!fs.existsSync(ROMS_DIR)) {
    fs.mkdirSync(ROMS_DIR, { recursive: true });
}
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Normalize game name for filename
const normalizeFilename = (name) => {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
};

// Wait for download to complete
const waitForDownload = async (downloadPath, timeout = 120000) => {
    const start = Date.now();
    let lastLog = 0;
    while (Date.now() - start < timeout) {
        const files = fs.readdirSync(downloadPath);

        // Log progress every 10 seconds
        if (DEBUG && Date.now() - lastLog > 10000) {
            console.log(`  Waiting for download... Files: ${files.join(', ') || '(none)'}`);
            lastLog = Date.now();
        }

        const downloadedFile = files.find(f => !f.endsWith('.crdownload') && !f.startsWith('.'));
        if (downloadedFile) {
            return path.join(downloadPath, downloadedFile);
        }

        // Check if download is in progress
        const inProgress = files.find(f => f.endsWith('.crdownload'));
        if (inProgress && DEBUG && Date.now() - lastLog > 10000) {
            console.log(`  Download in progress: ${inProgress}`);
        }

        await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error('Download timeout');
};

// Clear temp directory
const clearTemp = () => {
    if (fs.existsSync(TEMP_DIR)) {
        const files = fs.readdirSync(TEMP_DIR);
        for (const file of files) {
            fs.unlinkSync(path.join(TEMP_DIR, file));
        }
    }
};

// Log failed download
const logFailure = (game, error) => {
    const entry = `${new Date().toISOString()} | ${game.platform} | ${game.name} | ${error}\n`;
    fs.appendFileSync(FAILED_LOG, entry);
};

// Search for a game on retrostic
const searchGameRetrostic = async (page, platform, gameName) => {
    const retrosticPlatform = platformConfig[platform].retrostic;
    const searchUrl = `https://www.retrostic.com/roms/${retrosticPlatform}?search=${encodeURIComponent(gameName)}`;

    if (DEBUG) console.log(`  Search URL: ${searchUrl}`);

    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000)); // Wait for results to render

    return searchUrl;
};

// Find and click the best matching game result (retrostic)
const findBestMatchRetrostic = async (page, gameName) => {
    // Get all game links on the page
    const gameLinks = await page.$$eval('a[href*="/roms/"]', (links, targetName) => {
        const normalizedTarget = targetName.toLowerCase().replace(/[^a-z0-9]/g, '');
        // Extract key words from target (for games like "Zelda: Ocarina of Time" -> ["zelda", "ocarina", "time"])
        const targetWords = targetName.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);

        const results = links
            .filter(link => {
                const href = link.getAttribute('href');
                const text = link.textContent.trim();
                // Filter to game detail pages with actual text content
                return href && text.length > 0 && href.match(/\/roms\/[^/]+\/[^/]+-\d+$/);
            })
            .map(link => {
                const text = link.textContent.trim();
                const href = link.getAttribute('href');
                const normalizedText = text.toLowerCase().replace(/[^a-z0-9]/g, '');
                // Also check the URL slug
                const slug = href.split('/').pop().replace(/-\d+$/, '').replace(/-/g, '');

                // Calculate match score
                let score = 0;

                // Exact match
                if (normalizedText === normalizedTarget) score = 100;
                else if (normalizedText.includes(normalizedTarget)) score = 90;
                else if (normalizedTarget.includes(normalizedText) && normalizedText.length > 5) score = 70;
                // Check if key words from search appear in text or slug
                else {
                    const matchingWords = targetWords.filter(w =>
                        normalizedText.includes(w) || slug.includes(w)
                    );
                    if (matchingWords.length >= 2) {
                        score = 50 + (matchingWords.length / targetWords.length) * 40;
                    } else if (matchingWords.length === 1 && targetWords.length <= 2) {
                        score = 40;
                    }
                }

                // Prefer USA versions
                if (text.includes('(USA)') || text.includes('(U)') || text.includes('USA')) score += 10;
                // Prefer non-hacked versions
                if (text.toLowerCase().includes('hack')) score -= 30;
                // Prefer v1.0 or latest versions
                if (text.includes('(V1.2)') || text.includes('(V1.1)')) score += 2;

                return { text, href, score };
            })
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score);

        // Deduplicate by href
        const seen = new Set();
        return results.filter(r => {
            if (seen.has(r.href)) return false;
            seen.add(r.href);
            return true;
        });
    }, gameName);

    if (DEBUG) {
        console.log(`  Found ${gameLinks.length} potential matches`);
        gameLinks.slice(0, 5).forEach((m, i) => console.log(`    ${i + 1}. ${m.text} (score: ${m.score})`));
    }

    if (gameLinks.length === 0) {
        throw new Error('No matching games found on search results page');
    }

    const bestMatch = gameLinks[0];

    // Minimum score threshold to avoid bad matches
    if (bestMatch.score < MIN_SCORE) {
        throw new Error(`Best match score too low (${bestMatch.score.toFixed(0)} < ${MIN_SCORE}): "${bestMatch.text}"`);
    }

    if (DEBUG) console.log(`  Selected: ${bestMatch.text}`);

    // Navigate to the game page
    const gameUrl = bestMatch.href.startsWith('http')
        ? bestMatch.href
        : `https://www.retrostic.com${bestMatch.href}`;
    await page.goto(gameUrl, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    return bestMatch;
};

// Download ROM from game page (retrostic)
const downloadRomRetrostic = async (page) => {
    // Click the download button (has class .romdownbtn)
    const downloadBtn = await page.$('.romdownbtn');

    if (!downloadBtn) {
        // Fallback: try finding by text
        const clicked = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('button, a'));
            const btn = elements.find(el =>
                el.textContent.toLowerCase().includes('download') &&
                !el.textContent.toLowerCase().includes('emulator')
            );
            if (btn) {
                btn.click();
                return true;
            }
            return false;
        });

        if (!clicked) {
            throw new Error('Download button not found');
        }
    } else {
        if (DEBUG) console.log('  Clicking download button...');
        await downloadBtn.click();
    }

    // Wait for navigation to download page
    if (DEBUG) console.log('  Waiting for download page...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});

    if (DEBUG) console.log(`  Current URL: ${page.url()}`);

    // Wait for download to start (the site may have a delay)
    await new Promise(r => setTimeout(r, 3000));

    // Wait for download to complete (longer timeout for large files)
    const downloadedFile = await waitForDownload(TEMP_DIR, 180000); // 3 min timeout
    return downloadedFile;
};

// ============ ROMSPEDIA FUNCTIONS ============

// Search for a game on romspedia
const searchGameRomspedia = async (page, platform, gameName) => {
    const searchUrl = `https://www.romspedia.com/search.php?search_term_string=${encodeURIComponent(gameName)}`;

    if (DEBUG) console.log(`  [Romspedia] Search URL: ${searchUrl}`);

    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000)); // Wait for results to render

    return searchUrl;
};

// Find and click the best matching game result (romspedia)
const findBestMatchRomspedia = async (page, gameName, platform) => {
    const romspediaPlatform = platformConfig[platform].romspedia;

    // Get all game links on the page - specifically those with h2 titles
    const gameLinks = await page.$$eval('a[href*="/roms/"]', (links, { targetName, targetPlatform }) => {
        const normalizedTarget = targetName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetWords = targetName.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);

        // Helper to get clean title text from link
        const getTitleText = (link) => {
            // Try h2 element first
            const h2 = link.querySelector('h2');
            if (h2) {
                return h2.textContent.trim();
            }
            // Try image alt text (cover images often have game title as alt)
            const img = link.querySelector('img');
            if (img && img.alt) {
                return img.alt.trim();
            }
            // Skip links with SVG/CSS noise or just numbers
            const text = link.textContent.trim().replace(/\s+/g, ' ');
            if (/^\d+/.test(text) || text.includes('.svg-')) {
                return '';
            }
            return text;
        };

        const results = links
            .filter(link => {
                const href = link.getAttribute('href');
                const text = getTitleText(link);
                // Filter to game pages on the correct platform with actual title text
                return href && text.length > 0 && href.includes(`/roms/${targetPlatform}/`);
            })
            .map(link => {
                const text = getTitleText(link);
                const href = link.getAttribute('href');
                const normalizedText = text.toLowerCase().replace(/[^a-z0-9]/g, '');
                // Extract slug from URL
                const slug = href.split('/').pop().replace(/-/g, '');

                // Calculate match score
                let score = 0;

                // Exact match
                if (normalizedText === normalizedTarget) score = 100;
                else if (normalizedText.includes(normalizedTarget)) score = 90;
                else if (normalizedTarget.includes(normalizedText) && normalizedText.length > 5) score = 70;
                // Check if key words from search appear in text or slug
                else {
                    const matchingWords = targetWords.filter(w =>
                        normalizedText.includes(w) || slug.includes(w)
                    );
                    if (matchingWords.length >= 2) {
                        score = 50 + (matchingWords.length / targetWords.length) * 40;
                    } else if (matchingWords.length === 1 && targetWords.length <= 2) {
                        score = 40;
                    }
                }

                // Prefer USA versions
                if (href.includes('-usa') || text.includes('(USA)') || text.includes('(U)')) score += 10;
                // Penalize Japanese versions
                if (href.includes('-jap') || href.includes('-japan') || text.includes('(J)') || text.includes('(Japan)')) score -= 15;
                // Prefer non-hacked versions
                if (text.toLowerCase().includes('hack')) score -= 30;

                return { text, href, score };
            })
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score);

        // Deduplicate by href
        const seen = new Set();
        return results.filter(r => {
            if (seen.has(r.href)) return false;
            seen.add(r.href);
            return true;
        });
    }, { targetName: gameName, targetPlatform: romspediaPlatform });

    if (DEBUG) {
        console.log(`  [Romspedia] Found ${gameLinks.length} potential matches`);
        gameLinks.slice(0, 5).forEach((m, i) => console.log(`    ${i + 1}. ${m.text} (score: ${m.score})`));
    }

    if (gameLinks.length === 0) {
        throw new Error('No matching games found on romspedia');
    }

    const bestMatch = gameLinks[0];

    // Minimum score threshold
    if (bestMatch.score < MIN_SCORE) {
        throw new Error(`Best match score too low (${bestMatch.score.toFixed(0)} < ${MIN_SCORE}): "${bestMatch.text}"`);
    }

    if (DEBUG) console.log(`  [Romspedia] Selected: ${bestMatch.text}`);

    // Navigate to the game page
    const gameUrl = bestMatch.href.startsWith('http')
        ? bestMatch.href
        : `https://www.romspedia.com${bestMatch.href}`;
    await page.goto(gameUrl, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    return bestMatch;
};

// Download ROM from game page (romspedia)
const downloadRomRomspedia = async (page) => {
    // Navigate to the download page
    const currentUrl = page.url();
    const downloadPageUrl = `${currentUrl}/download?speed=fast`;

    if (DEBUG) console.log(`  [Romspedia] Download page: ${downloadPageUrl}`);

    await page.goto(downloadPageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000));

    // Extract the direct download URL from the page
    // The page has a countdown that redirects to downloads.romspedia.com
    const directDownloadUrl = await page.evaluate(() => {
        // Look for link to downloads.romspedia.com
        const links = Array.from(document.querySelectorAll('a[href*="downloads.romspedia.com"]'));
        if (links.length > 0) {
            return links[0].href;
        }
        // Fallback: look in page content for the URL pattern
        const pageContent = document.body.innerHTML;
        const match = pageContent.match(/https:\/\/downloads\.romspedia\.com\/[^"'\s]+/);
        return match ? match[0] : null;
    });

    if (!directDownloadUrl) {
        throw new Error('Could not find direct download URL on romspedia');
    }

    if (DEBUG) console.log(`  [Romspedia] Direct URL: ${directDownloadUrl}`);

    // Navigate to the direct download URL to trigger the download
    await page.goto(directDownloadUrl, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});

    // Wait for download to complete
    const downloadedFile = await waitForDownload(TEMP_DIR, 180000);
    return downloadedFile;
};

// ============ END ROMSPEDIA FUNCTIONS ============

// Move ROM to final location (keep as ZIP - most emulators support loading from ZIP)
const moveRom = (downloadedFile, finalPath, gameName) => {
    const ext = path.extname(downloadedFile).toLowerCase();
    const baseFilename = normalizeFilename(gameName);
    const finalFilePath = path.join(finalPath, `${baseFilename}${ext}`);

    fs.renameSync(downloadedFile, finalFilePath);
    if (DEBUG) console.log(`  Saved: ${baseFilename}${ext}`);
};

// Check if game already downloaded
const isAlreadyDownloaded = (platformDir, gameName) => {
    if (!fs.existsSync(platformDir)) return false;

    const baseFilename = normalizeFilename(gameName);
    const files = fs.readdirSync(platformDir);
    return files.some(f => f.startsWith(baseFilename + '.'));
};

// Main processing function
const processGames = async () => {
    console.log('Starting ROM download...');
    console.log(`Output directory: ${ROMS_DIR}`);
    console.log(`Source: ${SOURCE}${SOURCE === 'auto' ? ' (romspedia -> retrostic fallback)' : ''}`);
    if (DEBUG) console.log('Debug mode enabled');
    if (FAIL_FAST) console.log('Fail-fast mode enabled');
    if (REFETCH) console.log('Refetch mode enabled - will re-download existing ROMs');
    if (PLATFORM_FILTER) console.log(`Platform filter: ${PLATFORM_FILTER}`);
    if (!HEADLESS) console.log('Visible browser mode enabled');
    console.log(`Minimum match score: ${MIN_SCORE}`);

    // Launch browser
    const browser = await puppeteer.launch({
        headless: HEADLESS,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set download directory
    const client = await page.createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: TEMP_DIR
    });

    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Filter games
    const gamesToProcess = PLATFORM_FILTER
        ? allGames.filter(g => g.platform === PLATFORM_FILTER)
        : allGames;

    console.log(`\nProcessing ${gamesToProcess.length} games...\n`);

    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const game of gamesToProcess) {
        const config = platformConfig[game.platform];
        const platformDir = path.join(ROMS_DIR, config.arkosFolder);

        // Create platform directory
        if (!fs.existsSync(platformDir)) {
            fs.mkdirSync(platformDir, { recursive: true });
        }

        // Check if already downloaded
        if (!REFETCH && isAlreadyDownloaded(platformDir, game.name)) {
            if (DEBUG) console.log(`Exists: ${game.name}`);
            skipCount++;
            continue;
        }

        console.log(`[${game.platform}] Downloading: ${game.name}...`);

        try {
            clearTemp();

            // Build list of search terms
            const searchTerms = [game.name];
            if (game.libretroName) {
                const cleanLibretro = game.libretroName.replace(/\s*\([^)]*\)\s*/g, '').trim();
                if (cleanLibretro !== game.name) {
                    searchTerms.push(cleanLibretro);
                }
            }

            let downloadedFile = null;
            let usedSource = null;

            // Try romspedia first (if source is 'auto' or 'romspedia')
            if (SOURCE === 'auto' || SOURCE === 'romspedia') {
                let bestNonUsaMatch = null;
                for (const searchTerm of searchTerms) {
                    try {
                        if (DEBUG) console.log(`  [Romspedia] Searching: ${searchTerm}`);
                        await searchGameRomspedia(page, game.platform, searchTerm);
                        const match = await findBestMatchRomspedia(page, searchTerm, game.platform);
                        // Check if this is a USA version
                        const isUsa = match.href.includes('-usa') || match.text.includes('(USA)') || match.text.includes('(U)');
                        if (isUsa) {
                            // Found USA version, download it
                            downloadedFile = await downloadRomRomspedia(page);
                            usedSource = 'romspedia';
                            break;
                        } else if (!bestNonUsaMatch || match.score > bestNonUsaMatch.match.score) {
                            // Save best non-USA match as fallback
                            bestNonUsaMatch = { match, searchTerm };
                            if (DEBUG) console.log(`  [Romspedia] No USA indicator, saving as fallback (score: ${match.score})`);
                        }
                    } catch (err) {
                        if (DEBUG) console.log(`  [Romspedia] Failed: ${err.message}`);
                    }
                }
                // If no USA version found but we have a non-USA match, use it
                if (!downloadedFile && bestNonUsaMatch) {
                    try {
                        if (DEBUG) console.log(`  [Romspedia] Using best available: ${bestNonUsaMatch.match.text}`);
                        await searchGameRomspedia(page, game.platform, bestNonUsaMatch.searchTerm);
                        await findBestMatchRomspedia(page, bestNonUsaMatch.searchTerm, game.platform);
                        downloadedFile = await downloadRomRomspedia(page);
                        usedSource = 'romspedia';
                    } catch (err) {
                        if (DEBUG) console.log(`  [Romspedia] Failed: ${err.message}`);
                    }
                }
            }

            // Fallback to retrostic (if source is 'auto' or 'retrostic')
            if (!downloadedFile && (SOURCE === 'auto' || SOURCE === 'retrostic')) {
                if (SOURCE === 'auto' && DEBUG) console.log('  Falling back to retrostic...');
                clearTemp(); // Clear any partial downloads

                for (const searchTerm of searchTerms) {
                    try {
                        if (DEBUG) console.log(`  [Retrostic] Searching: ${searchTerm}`);
                        await searchGameRetrostic(page, game.platform, searchTerm);
                        await findBestMatchRetrostic(page, searchTerm);
                        downloadedFile = await downloadRomRetrostic(page);
                        usedSource = 'retrostic';
                        break;
                    } catch (err) {
                        if (DEBUG) console.log(`  [Retrostic] Failed: ${err.message}`);
                        if (searchTerms.indexOf(searchTerm) === searchTerms.length - 1) {
                            throw err; // Last attempt failed
                        }
                    }
                }
            }

            if (!downloadedFile) {
                throw new Error('All download sources failed');
            }

            // Move to final location (keep as ZIP)
            moveRom(downloadedFile, platformDir, game.name);

            console.log(`  Success! (via ${usedSource})`);
            successCount++;

            // Rate limiting
            await new Promise(r => setTimeout(r, DELAY_BETWEEN_DOWNLOADS));

        } catch (error) {
            console.error(`  Failed: ${error.message}`);
            logFailure(game, error.message);
            failCount++;

            if (FAIL_FAST) {
                console.error('Exiting due to --fail-fast');
                await browser.close();
                process.exit(1);
            }

            // Brief delay before next attempt
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    await browser.close();

    // Clean up temp directory
    if (fs.existsSync(TEMP_DIR)) {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }

    console.log('\n--- Summary ---');
    console.log(`Success: ${successCount}`);
    console.log(`Skipped: ${skipCount}`);
    console.log(`Failed: ${failCount}`);

    if (failCount > 0) {
        console.log(`\nFailed downloads logged to: ${FAILED_LOG}`);
    }

    console.log('\nDownload complete!');
};

processGames().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
