import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { platformConfig, allGames } from '../src/lib/data.js';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if pngquant is available
let hasPngquant = false;
try {
    execSync('pngquant --version', { stdio: 'ignore' });
    hasPngquant = true;
} catch {
    // pngquant not available
}

// PNG magic bytes
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const isValidPng = (filepath) => {
    try {
        const fd = fs.openSync(filepath, 'r');
        const buffer = Buffer.alloc(8);
        fs.readSync(fd, buffer, 0, 8, 0);
        fs.closeSync(fd);
        return buffer.equals(PNG_MAGIC);
    } catch {
        return false;
    }
};

const compressImage = async (filepath, debug) => {
    try {
        if (hasPngquant) {
            execSync(`pngquant --quality=65-80 --force --ext .png "${filepath}"`, { stdio: 'ignore' });
        } else {
            const buffer = await sharp(filepath)
                .png({ palette: true, quality: 80 })
                .toBuffer();
            fs.writeFileSync(filepath, buffer);
        }
        if (debug) console.log(`  Compressed: ${path.basename(filepath)}`);
    } catch (error) {
        if (debug) console.log(`  Compression failed: ${path.basename(filepath)}`);
    }
};

// Cache for GitHub directory listings
const dirListingCache = new Map();

// Fetch JSON from URL
const fetchJson = (url) => {
    return new Promise((resolve, reject) => {
        const options = {
            headers: { 'User-Agent': 'retro-gaming-app' }
        };
        https.get(url, options, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Status Code: ${response.statusCode}`));
                return;
            }
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
};

// Get list of image files for a system from GitHub using Git Trees API
const getImageList = async (systemName, folder, debug) => {
    const cacheKey = `${systemName}:${folder}`;
    if (dirListingCache.has(cacheKey)) {
        return dirListingCache.get(cacheKey);
    }

    const repoName = systemName.replace(/ /g, '_');
    const repoUrl = `https://api.github.com/repos/libretro-thumbnails/${repoName}/branches/master`;

    if (debug) console.log(`  Fetching repo info from: ${repoUrl}`);

    try {
        const branchInfo = await fetchJson(repoUrl);
        const treeSha = branchInfo.commit.commit.tree.sha;

        const treeUrl = `https://api.github.com/repos/libretro-thumbnails/${repoName}/git/trees/${treeSha}?recursive=1`;
        if (debug) console.log(`  Fetching tree from: ${treeUrl}`);

        const tree = await fetchJson(treeUrl);

        const names = tree.tree
            .filter(f => f.path.startsWith(`${folder}/`) && f.path.endsWith('.png'))
            .map(f => f.path.replace(`${folder}/`, '').replace(/\.png$/i, ''));

        if (debug) console.log(`  Found ${names.length} ${folder} files`);
        dirListingCache.set(cacheKey, names);
        return names;
    } catch (error) {
        console.error(`  Failed to fetch file list for ${systemName}/${folder}: ${error.message}`);
        dirListingCache.set(cacheKey, []);
        return [];
    }
};

// Normalize string for comparison
const normalize = (str) => {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

// Find best match for a game name in the file list
const findBestMatch = (gameName, fileList) => {
    const baseGameName = gameName.replace(/\s*\([^)]*\)\s*/g, '').trim();
    const normalizedBase = normalize(baseGameName);

    let bestMatch = null;
    let bestScore = 0;

    for (const fileName of fileList) {
        const fileBase = fileName.replace(/\s*\([^)]*\)\s*/g, '').trim();
        const normalizedFile = normalize(fileBase);

        if (normalizedFile === normalizedBase) {
            if (fileName.includes('(USA)') || fileName.includes('(USA,')) {
                return fileName;
            }
            if (!bestMatch || !bestMatch.includes('(USA')) {
                bestMatch = fileName;
                bestScore = 100;
            }
        } else if (normalizedFile.includes(normalizedBase) || normalizedBase.includes(normalizedFile)) {
            const score = Math.min(normalizedFile.length, normalizedBase.length) /
                         Math.max(normalizedFile.length, normalizedBase.length) * 90;
            if (score > bestScore) {
                bestMatch = fileName;
                bestScore = score;
            }
        }
    }

    return bestMatch;
};

const downloadImage = (url, filepath) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve(true);
                });
            } else {
                fs.unlink(filepath, () => { });
                reject(new Error(`Status Code: ${response.statusCode}`));
            }
        }).on('error', (err) => {
            fs.unlink(filepath, () => { });
            reject(err);
        });
    });
};

/**
 * Download images for all games
 * @param {Object} options
 * @param {string} options.type - 'boxart' or 'screenshot'
 * @param {boolean} options.debug - Show debug output
 * @param {boolean} options.failFast - Exit on first failure
 * @param {boolean} options.refetch - Re-download existing images
 * @param {string} options.platform - Filter to specific platform
 */
export async function fetchImages(options) {
    const { type, debug = false, failFast = false, refetch = false, platform = null } = options;

    const isBoxart = type === 'boxart';
    const folder = isBoxart ? 'Named_Boxarts' : 'Named_Snaps';
    const baseDir = path.join(__dirname, '../public', isBoxart ? 'boxart' : 'screenshots');
    const label = isBoxart ? 'box art' : 'screenshots';

    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }

    if (hasPngquant) {
        console.log('pngquant found - images will be compressed');
    } else {
        console.log('pngquant not found - using sharp for compression');
    }

    console.log(`Fetching ${label}...`);
    if (platform) console.log(`  Platform filter: ${platform}`);
    if (debug) console.log('  Debug mode enabled');
    if (failFast) console.log('  Fail-fast mode enabled');
    if (refetch) console.log('  Refetch mode enabled');

    const gamesToProcess = platform
        ? allGames.filter(g => g.platform === platform)
        : allGames;

    console.log(`Processing ${gamesToProcess.length} games...\n`);

    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (const game of gamesToProcess) {
        const config = platformConfig[game.platform];

        if (!config.libretro) {
            if (debug) console.log(`Skipping ${game.name} (no platform mapping)`);
            skipped++;
            continue;
        }

        const platformDir = path.join(baseDir, game.platform);
        if (!fs.existsSync(platformDir)) {
            fs.mkdirSync(platformDir, { recursive: true });
        }

        const filename = `${game.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
        const filepath = path.join(platformDir, filename);

        if (fs.existsSync(filepath) && !refetch) {
            if (debug) console.log(`Exists: ${game.name}`);
            skipped++;
            continue;
        }

        if (debug) console.log(`\n--- ${game.name} ---`);

        try {
            const fileList = await getImageList(config.libretro, folder, debug);

            const searchName = game.libretroName || game.name;
            let matchedName = findBestMatch(searchName, fileList);

            if (!matchedName && game.libretroName) {
                matchedName = findBestMatch(game.name, fileList);
            }

            if (!matchedName) {
                throw new Error(`No matching ${label} found`);
            }

            if (debug) {
                console.log(`  Search: ${searchName}`);
                console.log(`  Match:  ${matchedName}`);
            }

            const repoName = config.libretro.replace(/ /g, '_');
            const encodedName = encodeURIComponent(matchedName);
            const url = `https://raw.githubusercontent.com/libretro-thumbnails/${repoName}/master/${folder}/${encodedName}.png`;
            const baseUrl = `https://raw.githubusercontent.com/libretro-thumbnails/${repoName}/master/${folder}/`;

            if (debug) console.log(`  URL: ${url}`);

            console.log(`Downloading: ${game.name}...`);
            await downloadImage(url, filepath);

            // Handle redirects (text files pointing to another file)
            if (!isValidPng(filepath)) {
                const redirect = fs.readFileSync(filepath, 'utf8').trim();
                fs.unlinkSync(filepath);
                if (!redirect.endsWith('.png')) {
                    throw new Error('Downloaded file is not a valid PNG');
                }
                if (debug) console.log(`  Redirect -> ${redirect}`);
                await downloadImage(baseUrl + encodeURIComponent(redirect), filepath);
                if (!isValidPng(filepath)) {
                    fs.unlinkSync(filepath);
                    throw new Error('Redirected file is not a valid PNG');
                }
            }

            await compressImage(filepath, debug);
            if (debug) console.log(`  Success!`);
            success++;
        } catch (error) {
            console.error(`Failed: ${game.name} - ${error.message}`);
            failed++;
            if (failFast) {
                console.error('Exiting due to --fail-fast');
                process.exit(1);
            }
        }
    }

    console.log(`\nComplete! ${success} downloaded, ${failed} failed, ${skipped} skipped`);
}

// Parse common CLI args
export function parseArgs(args) {
    return {
        debug: args.includes('--debug') || args.includes('-d'),
        failFast: args.includes('--fail-fast') || args.includes('-f'),
        refetch: args.includes('--refetch') || args.includes('-r'),
        platform: args.find(a => a.startsWith('--platform='))?.split('=')[1],
        help: args.includes('--help') || args.includes('-h'),
    };
}
