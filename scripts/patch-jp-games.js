import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROMS_DIR = path.join(__dirname, '../roms');
const TEMP_DIR = path.join(__dirname, '../roms/.temp_patch');
const PATCHES_DIR = path.join(__dirname, '../patches');

// Game configurations
// All patches are stored locally in the patches/ folder
const GAMES = {
  mother3: {
    name: 'Mother 3',
    platform: 'gba',
    romZip: 'mother_3.zip',
    romExt: '.gba',
    patchFormat: 'ups',
    patchFile: 'mother3_v1.3.zip', // Contains .ups file
    patchInZip: true,
    patchExt: '.ups',
    outputName: 'Mother 3 (English).gba',
    fetchRomsFilter: 'Mother 3',
    patchSource: 'https://mother3.fobby.net/',
  },
  rhythm_tengoku: {
    name: 'Rhythm Tengoku',
    platform: 'gba',
    romZip: 'rhythm_tengoku.zip',
    romExt: '.gba',
    patchFormat: 'ips',
    patchFile: 'rhythm_tengoku.ips',
    patchInZip: false,
    patchExt: '.ips',
    outputName: 'Rhythm Tengoku (English).gba',
    fetchRomsFilter: 'Rhythm Tengoku',
    patchSource: 'https://github.com/ShaffySwitcher/RhythmHeavenSilver',
  },
  magical_popn: {
    name: "Magical Pop'n",
    platform: 'snes',
    romZip: 'magical_popn.zip',
    romExt: '.sfc',
    altRomExts: ['.smc'],
    patchFormat: 'ips',
    patchFile: 'magical_popn.ips',
    patchInZip: false,
    patchExt: '.ips',
    outputName: 'Magical Popn (English).sfc', // No apostrophe to avoid shell escaping issues
    fetchRomsFilter: "Magical Pop'n",
    patchSource: 'https://aeongenesis.net/',
  },
};

// --- IPS Patching Logic ---
function applyIpsPatch(romBuffer, patchBuffer) {
  const PATCH_HEADER = 'PATCH';
  const EOF_MARKER = 'EOF';

  // Verify header
  const header = patchBuffer.subarray(0, 5).toString();
  if (header !== PATCH_HEADER) {
    throw new Error(`Invalid IPS header: ${header}`);
  }

  // Create output buffer (may need to expand)
  let outBuffer = Buffer.from(romBuffer);

  let offset = 5;
  while (offset < patchBuffer.length) {
    // Check for EOF
    if (offset + 3 <= patchBuffer.length) {
      const marker = patchBuffer.subarray(offset, offset + 3).toString();
      if (marker === EOF_MARKER) break;
    }

    // Read 3-byte offset
    const recordOffset =
      (patchBuffer[offset] << 16) |
      (patchBuffer[offset + 1] << 8) |
      patchBuffer[offset + 2];
    offset += 3;

    // Read 2-byte size
    const size = (patchBuffer[offset] << 8) | patchBuffer[offset + 1];
    offset += 2;

    if (size === 0) {
      // RLE encoded
      const rleSize = (patchBuffer[offset] << 8) | patchBuffer[offset + 1];
      offset += 2;
      const rleValue = patchBuffer[offset];
      offset += 1;

      // Expand buffer if needed
      if (recordOffset + rleSize > outBuffer.length) {
        const newBuffer = Buffer.alloc(recordOffset + rleSize);
        outBuffer.copy(newBuffer);
        outBuffer = newBuffer;
      }

      for (let i = 0; i < rleSize; i++) {
        outBuffer[recordOffset + i] = rleValue;
      }
    } else {
      // Normal patch data
      // Expand buffer if needed
      if (recordOffset + size > outBuffer.length) {
        const newBuffer = Buffer.alloc(recordOffset + size);
        outBuffer.copy(newBuffer);
        outBuffer = newBuffer;
      }

      patchBuffer.copy(outBuffer, recordOffset, offset, offset + size);
      offset += size;
    }
  }

  return outBuffer;
}

// --- UPS Patching Logic ---
function applyUpsPatch(romBuffer, patchBuffer) {
  let pOffset = 0;

  function readByte() {
    return patchBuffer[pOffset++];
  }

  function readVLI() {
    let data = 0;
    let shift = 1;
    while (true) {
      let b = readByte();
      data += (b & 0x7f) * shift;
      if (b & 0x80) break;
      shift <<= 7;
      data += shift;
    }
    return data;
  }

  // Header check
  const header = patchBuffer.subarray(0, 4).toString();
  if (header !== 'UPS1') {
    throw new Error(`Invalid UPS header: ${header}`);
  }
  pOffset = 4;

  const inputSize = readVLI();
  const outputSize = readVLI();

  console.log(`   [UPS] Input Size Expected: ${inputSize}, Actual: ${romBuffer.length}`);
  console.log(`   [UPS] Output Size: ${outputSize}`);

  if (romBuffer.length !== inputSize) {
    console.warn('   [UPS] WARNING: Input size mismatch! Patch might not apply correctly.');
  }

  let outBuffer = Buffer.alloc(outputSize);
  romBuffer.copy(outBuffer);

  let romOffset = 0;

  while (pOffset < patchBuffer.length - 12) {
    const offset = readVLI();
    romOffset += offset;

    while (true) {
      const b = readByte();
      if (romOffset < outBuffer.length) {
        outBuffer[romOffset] ^= b;
      }
      romOffset++;
      if (b === 0) break;
    }
  }
  return outBuffer;
}

// --- Utility Functions ---
function findFile(dir, exts) {
  const extList = Array.isArray(exts) ? exts : [exts];
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      const found = findFile(full, extList);
      if (found) return found;
    } else if (extList.some((ext) => f.toLowerCase().endsWith(ext.toLowerCase()))) {
      return full;
    }
  }
  return null;
}


// --- Revert Function ---
async function revertGame(gameKey) {
  const game = GAMES[gameKey];
  if (!game) {
    throw new Error(`Unknown game: ${gameKey}`);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Reverting: ${game.name}`);
  console.log('='.repeat(50));

  const romDir = path.join(ROMS_DIR, game.platform);
  const romZipPath = path.join(romDir, game.romZip);

  // Step 1: Delete the patched ROM if it exists
  if (fs.existsSync(romZipPath)) {
    console.log('1. Removing patched ROM...');
    fs.unlinkSync(romZipPath);
    console.log(`   Deleted: ${game.romZip}`);
  } else {
    console.log('1. No patched ROM found, skipping deletion.');
  }

  // Step 2: Re-download the original using fetch-roms
  console.log('2. Re-downloading original JP ROM...');
  const fetchRomsScript = path.join(__dirname, 'fetch-roms.js');

  if (!fs.existsSync(fetchRomsScript)) {
    throw new Error('fetch-roms.js not found. Cannot re-download original ROM.');
  }

  try {
    const cmd = `node "${fetchRomsScript}" --game="${game.fetchRomsFilter}" --refetch`;
    console.log(`   Running: ${cmd}`);
    execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    return true;
  } catch (err) {
    throw new Error(`fetch-roms failed: ${err.message}`);
  }
}

// --- Main Patching Function ---
async function patchGame(gameKey) {
  const game = GAMES[gameKey];
  if (!game) {
    throw new Error(`Unknown game: ${gameKey}`);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Patching: ${game.name}`);
  console.log('='.repeat(50));

  const romDir = path.join(ROMS_DIR, game.platform);
  const romZipPath = path.join(romDir, game.romZip);

  // Check if ROM exists
  if (!fs.existsSync(romZipPath)) {
    console.log(`   SKIP: ROM not found at ${romZipPath}`);
    return false;
  }

  // Ensure temp dir exists
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

  try {
    let patchPath;

    // Step 1: Get the patch file from local patches/ folder
    console.log('1. Loading patch file...');
    const localPatchPath = path.join(PATCHES_DIR, game.patchFile);

    if (!fs.existsSync(localPatchPath)) {
      console.log(`   SKIP: Patch file not found at: ${localPatchPath}`);
      console.log(`   Download from: ${game.patchSource}`);
      return false;
    }

    if (game.patchInZip) {
      // Extract patch from zip
      console.log(`   Extracting from ${game.patchFile}...`);
      const patchExtractDir = path.join(TEMP_DIR, 'patch_extract');
      execSync(
        `powershell -command "Expand-Archive -Path '${localPatchPath}' -DestinationPath '${patchExtractDir}' -Force"`
      );

      patchPath = findFile(patchExtractDir, game.patchExt);
      if (!patchPath) throw new Error(`No ${game.patchExt} file found in patch archive`);
    } else {
      patchPath = localPatchPath;
    }
    console.log(`   Patch ready: ${path.basename(patchPath)}`);

    // Ensure temp dir exists (may not be created yet for non-zip patches)
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

    // Step 2: Extract the ROM
    console.log('2. Extracting ROM...');
    const romExtractDir = path.join(TEMP_DIR, 'rom_extract');
    execSync(`powershell -command "Expand-Archive -Path '${romZipPath}' -DestinationPath '${romExtractDir}' -Force"`);

    const romExts = [game.romExt, ...(game.altRomExts || [])];
    const romPath = findFile(romExtractDir, romExts);
    if (!romPath) throw new Error(`No ROM file (${romExts.join('/')}) found in zip`);
    const romFilename = path.basename(romPath);
    console.log(`   Found ROM: ${romFilename}`);

    // Check if already patched (look for "English" in filename)
    if (romFilename.toLowerCase().includes('english')) {
      console.log('   SKIP: ROM is already patched (contains "English" in filename)');
      console.log('   Use --revert first to restore the original JP ROM.');
      return false;
    }

    // Step 3: Apply the patch
    console.log(`3. Applying ${game.patchFormat.toUpperCase()} patch...`);
    const romBuffer = fs.readFileSync(romPath);
    const patchBuffer = fs.readFileSync(patchPath);

    let patchedBuffer;
    if (game.patchFormat === 'ips') {
      patchedBuffer = applyIpsPatch(romBuffer, patchBuffer);
    } else if (game.patchFormat === 'ups') {
      patchedBuffer = applyUpsPatch(romBuffer, patchBuffer);
    } else {
      throw new Error(`Unknown patch format: ${game.patchFormat}`);
    }

    const patchedRomPath = path.join(TEMP_DIR, game.outputName);
    fs.writeFileSync(patchedRomPath, patchedBuffer);
    console.log('   Patch applied successfully!');

    // Step 4: Create new archive
    console.log('4. Creating new archive...');
    if (fs.existsSync(romZipPath)) fs.unlinkSync(romZipPath);
    execSync(`powershell -command "Compress-Archive -Path '${patchedRomPath}' -DestinationPath '${romZipPath}'"`);
    console.log(`   Updated: ${game.romZip}`);

    return true;
  } finally {
    // Cleanup temp directory
    if (fs.existsSync(TEMP_DIR)) {
      execSync(`powershell -command "Remove-Item -Path '${TEMP_DIR}' -Recurse -Force"`);
    }
  }
}

// --- CLI ---
async function main() {
  const args = process.argv.slice(2);
  const REVERT_MODE = args.includes('--revert') || args.includes('-R');
  const HELP = args.includes('--help') || args.includes('-h');

  if (HELP) {
    console.log(`
JP Games English Patcher

Usage:
  node patch-jp-games.js [games...] [options]

Games:
  mother3, rhythm_tengoku, magical_popn
  (If no games specified, all games are processed)

Options:
  --revert, -R    Remove patched ROMs and re-download originals
  --help, -h      Show this help message

Examples:
  bun patch-jp                      # Patch all games
  bun patch-jp mother3              # Patch only Mother 3
  bun patch-jp --revert             # Revert all games to JP originals
  bun patch-jp mother3 --revert     # Revert only Mother 3
`);
    return;
  }

  const modeTitle = REVERT_MODE ? 'JP Games Reverter' : 'JP Games English Patcher';
  console.log('╔══════════════════════════════════════════════════╗');
  console.log(`║         ${modeTitle.padEnd(40)}║`);
  console.log('╚══════════════════════════════════════════════════╝');

  // Filter out flags from game list
  let gamesToProcess = args.filter((a) => !a.startsWith('-'));
  if (gamesToProcess.length === 0) {
    gamesToProcess = Object.keys(GAMES);
  }

  // Validate game keys
  for (const key of gamesToProcess) {
    if (!GAMES[key]) {
      console.error(`Unknown game: ${key}`);
      console.error(`Available games: ${Object.keys(GAMES).join(', ')}`);
      process.exit(1);
    }
  }

  // Ensure patches directory exists (for patch mode)
  if (!REVERT_MODE && !fs.existsSync(PATCHES_DIR)) {
    fs.mkdirSync(PATCHES_DIR, { recursive: true });
  }

  const results = { success: [], skipped: [], failed: [] };
  const actionVerb = REVERT_MODE ? 'Reverted' : 'Patched';

  for (const gameKey of gamesToProcess) {
    try {
      let success;
      if (REVERT_MODE) {
        success = await revertGame(gameKey);
      } else {
        success = await patchGame(gameKey);
      }

      if (success) {
        results.success.push(GAMES[gameKey].name);
      } else {
        results.skipped.push(GAMES[gameKey].name);
      }
    } catch (err) {
      console.error(`   ERROR: ${err.message}`);
      results.failed.push(GAMES[gameKey].name);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  if (results.success.length) console.log(`${actionVerb}: ${results.success.join(', ')}`);
  if (results.skipped.length) console.log(`Skipped: ${results.skipped.join(', ')}`);
  if (results.failed.length) console.log(`Failed:  ${results.failed.join(', ')}`);
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
