import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROMS_DIR = path.join(__dirname, '../roms');
const MULTI_DISC_PLATFORMS = [
  { folder: 'psx', name: 'PS1' },
  { folder: 'saturn', name: 'Saturn' }
];

// CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run') || args.includes('-n');
const VERBOSE = args.includes('--verbose') || args.includes('-v');

if (DRY_RUN) {
  console.log('=== DRY RUN MODE - No files will be modified ===\n');
}

function findMultiDiscGames(platformDir) {
  const files = fs.readdirSync(platformDir);
  const discPattern = /^(.+)_disc(\d+)\.zip$/i;
  const groups = {};

  for (const file of files) {
    const match = file.match(discPattern);
    if (match) {
      const baseName = match[1];
      const discNum = parseInt(match[2], 10);
      if (!groups[baseName]) {
        groups[baseName] = [];
      }
      groups[baseName].push({ file, discNum });
    }
  }

  // Sort discs by number
  for (const baseName of Object.keys(groups)) {
    groups[baseName].sort((a, b) => a.discNum - b.discNum);
  }

  return groups;
}

function createM3uContent(discs) {
  return discs.map(d => d.file).join('\n') + '\n';
}

function parseGameEntries(xml) {
  // Extract all game entries as individual strings with their paths
  const entries = [];
  const gameRegex = /<game[^>]*>[\s\S]*?<\/game>/gi;
  let match;

  while ((match = gameRegex.exec(xml)) !== null) {
    const entry = match[0];
    const pathMatch = entry.match(/<path>\.\/([^<]+)<\/path>/);
    if (pathMatch) {
      entries.push({
        fullMatch: entry,
        path: pathMatch[1],
        startIndex: match.index,
        endIndex: match.index + entry.length
      });
    }
  }

  return entries;
}

function getXmlHeader(xml) {
  // Get everything before the first <game> tag
  const firstGame = xml.indexOf('<game');
  if (firstGame === -1) return xml;
  return xml.substring(0, firstGame);
}

function getXmlFooter(xml) {
  // Get the closing </gameList> tag
  const lastGame = xml.lastIndexOf('</game>');
  if (lastGame === -1) return '</gameList>';
  return xml.substring(lastGame + '</game>'.length);
}

function createM3uEntry(disc1Entry, m3uPath, baseName) {
  let entry = disc1Entry;

  // Replace path
  entry = entry.replace(/<path>[^<]+<\/path>/, `<path>./${m3uPath}</path>`);

  // Update image path to use base name
  entry = entry.replace(/<image>[^<]*<\/image>/, `<image>./images/${baseName}.png</image>`);

  // Update video path to use base name
  entry = entry.replace(/<video>[^<]*<\/video>/, `<video>./videos/${baseName}.mp4</video>`);

  return entry;
}

function processGamelist(gamelistPath, multiDiscGames) {
  if (!fs.existsSync(gamelistPath)) {
    return { xml: null, changes: [] };
  }

  const xml = fs.readFileSync(gamelistPath, 'utf-8');
  const entries = parseGameEntries(xml);
  const changes = [];

  // Build a map of path -> entry
  const entryMap = new Map();
  for (const entry of entries) {
    entryMap.set(entry.path, entry);
  }

  // Determine which entries to keep and which to add
  const entriesToKeep = [];
  const entriesToAdd = [];

  for (const entry of entries) {
    const pathLower = entry.path.toLowerCase();
    let shouldKeep = true;

    // Check if this is a disc entry for any multi-disc game
    for (const baseName of Object.keys(multiDiscGames)) {
      const discPattern = new RegExp(`^${baseName}_disc\\d+\\.zip$`, 'i');
      if (discPattern.test(entry.path)) {
        shouldKeep = false;
        changes.push({ type: 'remove', path: entry.path });
        break;
      }
    }

    if (shouldKeep) {
      entriesToKeep.push(entry);
    }
  }

  // For each multi-disc game, ensure we have an m3u entry
  for (const baseName of Object.keys(multiDiscGames)) {
    const m3uPath = `${baseName}.m3u`;
    const discs = multiDiscGames[baseName];

    // Check if m3u entry already exists
    const existingM3u = entryMap.get(m3uPath);
    if (existingM3u) {
      // Already have it, make sure it's in entriesToKeep
      if (!entriesToKeep.find(e => e.path === m3uPath)) {
        entriesToKeep.push(existingM3u);
      }
      continue;
    }

    // Need to create m3u entry from disc1
    const disc1Path = discs[0].file;
    const disc1Entry = entryMap.get(disc1Path);

    if (disc1Entry) {
      const m3uEntry = createM3uEntry(disc1Entry.fullMatch, m3uPath, baseName);
      entriesToAdd.push({
        fullMatch: m3uEntry,
        path: m3uPath
      });
      changes.push({ type: 'add', path: m3uPath });
    } else {
      changes.push({ type: 'warning', message: `No disc1 entry found for ${baseName}` });
    }
  }

  // Rebuild XML
  const header = getXmlHeader(xml);
  const footer = getXmlFooter(xml);

  const allEntries = [...entriesToKeep, ...entriesToAdd];
  const newXml = header + allEntries.map(e => '  ' + e.fullMatch).join('\n') + '\n' + footer.trim() + '\n';

  return { xml: newXml, changes };
}

function main() {
  console.log('Multi-Disc Game Cleanup\n');
  console.log('Scanning for multi-disc games...\n');

  let totalGames = 0;
  let totalM3uCreated = 0;
  let totalEntriesRemoved = 0;

  for (const platform of MULTI_DISC_PLATFORMS) {
    const platformDir = path.join(ROMS_DIR, platform.folder);
    if (!fs.existsSync(platformDir)) {
      console.log(`[${platform.name}] Directory not found, skipping`);
      continue;
    }

    console.log(`[${platform.name}] Scanning ${platform.folder}/...`);

    const multiDiscGames = findMultiDiscGames(platformDir);
    const gameNames = Object.keys(multiDiscGames);

    if (gameNames.length === 0) {
      console.log(`  No multi-disc games found\n`);
      continue;
    }

    console.log(`  Found ${gameNames.length} multi-disc games:\n`);

    // Create .m3u files first
    for (const baseName of gameNames) {
      const discs = multiDiscGames[baseName];
      const m3uPath = `${baseName}.m3u`;
      const m3uFullPath = path.join(platformDir, m3uPath);

      console.log(`  ${baseName}:`);
      console.log(`    ${discs.length} discs: ${discs.map(d => `disc${d.discNum}`).join(', ')}`);

      const m3uExists = fs.existsSync(m3uFullPath);
      if (!m3uExists) {
        const m3uContent = createM3uContent(discs);
        if (DRY_RUN) {
          console.log(`    Would create: ${m3uPath}`);
          if (VERBOSE) console.log(`      Content: ${discs.map(d => d.file).join(', ')}`);
        } else {
          fs.writeFileSync(m3uFullPath, m3uContent);
          console.log(`    Created: ${m3uPath}`);
        }
        totalM3uCreated++;
      } else {
        console.log(`    ${m3uPath} already exists`);
      }

      totalGames++;
      console.log('');
    }

    // Process gamelist
    const gamelistPath = path.join(platformDir, 'gamelist.xml');
    const { xml: newXml, changes } = processGamelist(gamelistPath, multiDiscGames);

    if (newXml && changes.length > 0) {
      // Backup original gamelist
      const backupPath = gamelistPath + '.backup';
      if (!DRY_RUN && !fs.existsSync(backupPath)) {
        fs.copyFileSync(gamelistPath, backupPath);
        console.log(`  Backed up: gamelist.xml -> gamelist.xml.backup`);
      } else if (DRY_RUN && !fs.existsSync(backupPath)) {
        console.log(`  Would backup: gamelist.xml -> gamelist.xml.backup`);
      }
      const removed = changes.filter(c => c.type === 'remove').length;
      const added = changes.filter(c => c.type === 'add').length;

      if (VERBOSE) {
        for (const change of changes) {
          if (change.type === 'remove') {
            console.log(`    Removing: ${change.path}`);
          } else if (change.type === 'add') {
            console.log(`    Adding: ${change.path}`);
          } else if (change.type === 'warning') {
            console.log(`    Warning: ${change.message}`);
          }
        }
      }

      console.log(`  Gamelist: removing ${removed} disc entries, adding ${added} m3u entries`);
      totalEntriesRemoved += removed;

      if (DRY_RUN) {
        console.log(`  Would update: gamelist.xml\n`);
      } else {
        fs.writeFileSync(gamelistPath, newXml);
        console.log(`  Updated: gamelist.xml\n`);
      }
    }
  }

  console.log('='.repeat(50));
  console.log('Summary:');
  console.log(`  Multi-disc games processed: ${totalGames}`);
  console.log(`  .m3u files created: ${totalM3uCreated}`);
  console.log(`  Disc entries removed: ${totalEntriesRemoved}`);
  if (DRY_RUN) {
    console.log('\n(Dry run - no files were modified)');
  }
}

main();
