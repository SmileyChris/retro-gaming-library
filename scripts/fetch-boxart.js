import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { platformConfig, allGames } from '../src/lib/data.js';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CLI args
const args = process.argv.slice(2);
const FAIL_FAST = args.includes('--fail-fast') || args.includes('-f');
const DEBUG = args.includes('--debug') || args.includes('-d');
const REFETCH = args.includes('--refetch') || args.includes('-r');

// Check if pngquant is available
let hasPngquant = false;
try {
    execSync('pngquant --version', { stdio: 'ignore' });
    hasPngquant = true;
    console.log('pngquant found - images will be compressed after download');
} catch {
    console.log('pngquant not found - using sharp for compression');
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

const compressImage = async (filepath) => {
    try {
        if (hasPngquant) {
            execSync(`pngquant --quality=65-80 --force --ext .png "${filepath}"`, { stdio: 'ignore' });
        } else {
            const buffer = await sharp(filepath)
                .png({ palette: true, quality: 80 })
                .toBuffer();
            fs.writeFileSync(filepath, buffer);
        }
        if (DEBUG) console.log(`  Compressed: ${path.basename(filepath)}`);
    } catch (error) {
        if (DEBUG) console.log(`  Compression failed: ${path.basename(filepath)}`);
    }
};

const PUBLIC_DIR = path.join(__dirname, '../public/boxart');

if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

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

// Get list of boxart files for a system from GitHub using Git Trees API (handles >1000 files)
const getBoxartList = async (systemName) => {
    if (dirListingCache.has(systemName)) {
        return dirListingCache.get(systemName);
    }

    const repoName = systemName.replace(/ /g, '_');

    // First get the default branch's tree SHA
    const repoUrl = `https://api.github.com/repos/libretro-thumbnails/${repoName}/branches/master`;

    if (DEBUG) console.log(`  Fetching repo info from: ${repoUrl}`);

    try {
        const branchInfo = await fetchJson(repoUrl);
        const treeSha = branchInfo.commit.commit.tree.sha;

        // Get the full tree recursively
        const treeUrl = `https://api.github.com/repos/libretro-thumbnails/${repoName}/git/trees/${treeSha}?recursive=1`;
        if (DEBUG) console.log(`  Fetching tree from: ${treeUrl}`);

        const tree = await fetchJson(treeUrl);

        // Filter for Named_Boxarts/*.png files
        const names = tree.tree
            .filter(f => f.path.startsWith('Named_Boxarts/') && f.path.endsWith('.png'))
            .map(f => f.path.replace('Named_Boxarts/', '').replace(/\.png$/i, ''));

        if (DEBUG) console.log(`  Found ${names.length} boxart files`);
        dirListingCache.set(systemName, names);
        return names;
    } catch (error) {
        console.error(`  Failed to fetch file list for ${systemName}: ${error.message}`);
        dirListingCache.set(systemName, []);
        return [];
    }
};

// Normalize string for comparison
const normalize = (str) => {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
};

// Find best match for a game name in the file list
const findBestMatch = (gameName, fileList) => {
    // Extract the base game name (without region/language info)
    const baseGameName = gameName.replace(/\s*\([^)]*\)\s*/g, '').trim();
    const normalizedBase = normalize(baseGameName);

    let bestMatch = null;
    let bestScore = 0;

    for (const fileName of fileList) {
        const fileBase = fileName.replace(/\s*\([^)]*\)\s*/g, '').trim();
        const normalizedFile = normalize(fileBase);

        // Exact base name match
        if (normalizedFile === normalizedBase) {
            // Prefer USA versions
            if (fileName.includes('(USA)') || fileName.includes('(USA,')) {
                return fileName; // Perfect match
            }
            if (!bestMatch || !bestMatch.includes('(USA')) {
                bestMatch = fileName;
                bestScore = 100;
            }
        }
        // Check if one contains the other
        else if (normalizedFile.includes(normalizedBase) || normalizedBase.includes(normalizedFile)) {
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

const processGames = async () => {
    console.log('Starting box art download...');
    if (DEBUG) console.log('Debug mode enabled');
    if (FAIL_FAST) console.log('Fail-fast mode enabled');
    if (REFETCH) console.log('Refetch mode enabled - will re-download existing images');

    for (const game of allGames) {
        const config = platformConfig[game.platform];

        if (!config.libretro) {
            console.log(`Skipping ${game.name} (No platform mapping)`);
            continue;
        }

        // Create platform directory
        const platformDir = path.join(PUBLIC_DIR, game.platform);
        if (!fs.existsSync(platformDir)) {
            fs.mkdirSync(platformDir, { recursive: true });
        }

        const filename = `${game.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
        const filepath = path.join(platformDir, filename);

        if (fs.existsSync(filepath) && !REFETCH) {
            if (DEBUG) console.log(`Exists: ${game.name}`);
            continue;
        }

        if (DEBUG) {
            console.log(`\n--- ${game.name} ---`);
        }

        try {
            // Get list of available boxarts for this system
            const fileList = await getBoxartList(config.libretro);

            // Find best match
            const searchName = game.libretroName || game.name;
            let matchedName = findBestMatch(searchName, fileList);

            if (!matchedName) {
                // Try with just the game name if libretroName didn't match
                if (game.libretroName) {
                    matchedName = findBestMatch(game.name, fileList);
                }
            }

            if (!matchedName) {
                throw new Error('No matching boxart found');
            }

            if (DEBUG) {
                console.log(`  Search: ${searchName}`);
                console.log(`  Match:  ${matchedName}`);
            }

            // Construct download URL using matched name
            const repoName = config.libretro.replace(/ /g, '_');
            const encodedName = encodeURIComponent(matchedName);
            const url = `https://raw.githubusercontent.com/libretro-thumbnails/${repoName}/master/Named_Boxarts/${encodedName}.png`;

            if (DEBUG) console.log(`  URL: ${url}`);

            console.log(`Downloading: ${game.name}...`);
            const baseUrl = `https://raw.githubusercontent.com/libretro-thumbnails/${repoName}/master/Named_Boxarts/`;
            await downloadImage(url, filepath);

            // Handle redirects (text files pointing to another file in the same directory)
            if (!isValidPng(filepath)) {
                const redirect = fs.readFileSync(filepath, 'utf8').trim();
                fs.unlinkSync(filepath);
                if (!redirect.endsWith('.png')) {
                    throw new Error('Downloaded file is not a valid PNG');
                }
                if (DEBUG) console.log(`  Redirect -> ${redirect}`);
                await downloadImage(baseUrl + encodeURIComponent(redirect), filepath);
                if (!isValidPng(filepath)) {
                    fs.unlinkSync(filepath);
                    throw new Error('Redirected file is not a valid PNG');
                }
            }

            // Compress image
            await compressImage(filepath);
            if (DEBUG) console.log(`  Success!`);
        } catch (error) {
            console.error(`Failed to download ${game.name}: ${error.message}`);
            if (FAIL_FAST) {
                console.error('Exiting due to --fail-fast');
                process.exit(1);
            }
        }
    }
    console.log('Download complete!');
};

processGames();
