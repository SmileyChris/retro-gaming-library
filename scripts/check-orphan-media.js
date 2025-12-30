#!/usr/bin/env node
/**
 * Checks for orphan images/videos in the roms directory
 * (media files that don't have a corresponding ROM file)
 *
 * Usage:
 *   node scripts/check-orphan-media.js [options]
 *
 * Options:
 *   --delete        Delete orphan files (will prompt for confirmation)
 *   --delete-force  Delete orphan files without confirmation
 *   --missing       Show ROMs that are missing images/videos
 *   --platform=X    Only check specific platform (e.g., --platform=snes)
 *   --verbose       Show detailed matching info
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const romsDir = path.join(__dirname, "..", "roms");

// Parse CLI args
const args = process.argv.slice(2);
const deleteMode = args.includes("--delete");
const deleteForce = args.includes("--delete-force");
const showMissing = args.includes("--missing");
const verbose = args.includes("--verbose");
const platformArg = args.find((a) => a.startsWith("--platform="));
const filterPlatform = platformArg ? platformArg.split("=")[1].toLowerCase() : null;

// Extensions to treat as ROMs
const ROM_EXTENSIONS = [".zip", ".7z", ".chd", ".cue", ".bin", ".iso", ".m3u"];
// Extensions to treat as media
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".avi", ".mkv"];

function getBaseName(filename) {
  // Remove extension and return base name
  const ext = path.extname(filename).toLowerCase();
  return path.basename(filename, ext);
}

function stripDiscSuffix(name) {
  // Strip disc suffixes like _disc1, _disc2, etc. for multi-disc games
  return name.replace(/_disc\d+$/i, "");
}

function scanPlatformDirectory(platformPath, platformName) {
  const results = {
    platform: platformName,
    platformPath: platformPath,
    orphanImages: [],
    orphanVideos: [],
    missingImages: [],
    missingVideos: [],
    romsCount: 0,
    imagesCount: 0,
    videosCount: 0,
  };

  // Get all ROM base names (without extensions)
  const romBaseNames = new Set();
  const romFiles = [];
  const platformContents = fs.readdirSync(platformPath, { withFileTypes: true });

  for (const entry of platformContents) {
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ROM_EXTENSIONS.includes(ext)) {
        const baseName = getBaseName(entry.name);
        romBaseNames.add(baseName);
        romFiles.push({ name: entry.name, baseName });
        // Also add the base name without disc suffix for multi-disc matching
        romBaseNames.add(stripDiscSuffix(baseName));
        results.romsCount++;
      }
    }
  }

  // Get all image base names
  const imageBaseNames = new Set();
  const imagesDir = path.join(platformPath, "images");
  if (fs.existsSync(imagesDir)) {
    const images = fs.readdirSync(imagesDir);
    for (const image of images) {
      const ext = path.extname(image).toLowerCase();
      if (IMAGE_EXTENSIONS.includes(ext)) {
        results.imagesCount++;
        const baseName = getBaseName(image);
        const baseNameNoDisc = stripDiscSuffix(baseName);
        imageBaseNames.add(baseName);
        imageBaseNames.add(baseNameNoDisc);
        // Check if there's a matching ROM (with or without disc suffix)
        if (!romBaseNames.has(baseName) && !romBaseNames.has(baseNameNoDisc)) {
          results.orphanImages.push(image);
        }
      }
    }
  }

  // Get all video base names
  const videoBaseNames = new Set();
  const videosDir = path.join(platformPath, "videos");
  if (fs.existsSync(videosDir)) {
    const videos = fs.readdirSync(videosDir);
    for (const video of videos) {
      const ext = path.extname(video).toLowerCase();
      if (VIDEO_EXTENSIONS.includes(ext)) {
        results.videosCount++;
        const baseName = getBaseName(video);
        const baseNameNoDisc = stripDiscSuffix(baseName);
        videoBaseNames.add(baseName);
        videoBaseNames.add(baseNameNoDisc);
        // Check if there's a matching ROM (with or without disc suffix)
        if (!romBaseNames.has(baseName) && !romBaseNames.has(baseNameNoDisc)) {
          results.orphanVideos.push(video);
        }
      }
    }
  }

  // Check for ROMs missing media (if --missing flag)
  if (showMissing) {
    for (const rom of romFiles) {
      const baseNameNoDisc = stripDiscSuffix(rom.baseName);
      if (!imageBaseNames.has(rom.baseName) && !imageBaseNames.has(baseNameNoDisc)) {
        results.missingImages.push(rom.name);
      }
      if (!videoBaseNames.has(rom.baseName) && !videoBaseNames.has(baseNameNoDisc)) {
        results.missingVideos.push(rom.name);
      }
    }
  }

  return results;
}

async function promptConfirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

async function deleteOrphanFiles(allResults) {
  const filesToDelete = [];

  for (const results of allResults) {
    const imagesDir = path.join(results.platformPath, "images");
    const videosDir = path.join(results.platformPath, "videos");

    for (const image of results.orphanImages) {
      filesToDelete.push(path.join(imagesDir, image));
    }
    for (const video of results.orphanVideos) {
      filesToDelete.push(path.join(videosDir, video));
    }
  }

  if (filesToDelete.length === 0) {
    console.log("\nNo files to delete.");
    return;
  }

  console.log(`\nFiles to delete (${filesToDelete.length}):`);
  for (const file of filesToDelete) {
    console.log(`  ${file}`);
  }

  let shouldDelete = deleteForce;
  if (!deleteForce) {
    shouldDelete = await promptConfirm(`\nDelete ${filesToDelete.length} files? (y/N): `);
  }

  if (shouldDelete) {
    let deleted = 0;
    for (const file of filesToDelete) {
      try {
        fs.unlinkSync(file);
        deleted++;
        if (verbose) {
          console.log(`Deleted: ${file}`);
        }
      } catch (err) {
        console.error(`Failed to delete ${file}: ${err.message}`);
      }
    }
    console.log(`\nDeleted ${deleted} files.`);
  } else {
    console.log("\nDeletion cancelled.");
  }
}

async function main() {
  console.log("Scanning for orphan images/videos in roms directory...\n");

  if (!fs.existsSync(romsDir)) {
    console.error(`ROMs directory not found: ${romsDir}`);
    process.exit(1);
  }

  let platforms = fs.readdirSync(romsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name);

  // Filter by platform if specified
  if (filterPlatform) {
    platforms = platforms.filter((p) => p.toLowerCase() === filterPlatform);
    if (platforms.length === 0) {
      console.error(`Platform not found: ${filterPlatform}`);
      process.exit(1);
    }
  }

  let totalOrphanImages = 0;
  let totalOrphanVideos = 0;
  let totalMissingImages = 0;
  let totalMissingVideos = 0;
  const allResults = [];

  for (const platform of platforms) {
    const platformPath = path.join(romsDir, platform);
    const results = scanPlatformDirectory(platformPath, platform);
    allResults.push(results);

    totalOrphanImages += results.orphanImages.length;
    totalOrphanVideos += results.orphanVideos.length;
    totalMissingImages += results.missingImages.length;
    totalMissingVideos += results.missingVideos.length;
  }

  // Print results by platform
  for (const results of allResults) {
    const hasOrphans = results.orphanImages.length > 0 || results.orphanVideos.length > 0;
    const hasMissing = results.missingImages.length > 0 || results.missingVideos.length > 0;

    if (hasOrphans || (showMissing && hasMissing)) {
      console.log(`\n=== ${results.platform.toUpperCase()} ===`);
      console.log(`ROMs: ${results.romsCount} | Images: ${results.imagesCount} | Videos: ${results.videosCount}`);

      if (results.orphanImages.length > 0) {
        console.log(`\nOrphan images (${results.orphanImages.length}):`);
        for (const image of results.orphanImages) {
          console.log(`  - ${image}`);
        }
      }

      if (results.orphanVideos.length > 0) {
        console.log(`\nOrphan videos (${results.orphanVideos.length}):`);
        for (const video of results.orphanVideos) {
          console.log(`  - ${video}`);
        }
      }

      if (showMissing && results.missingImages.length > 0) {
        console.log(`\nROMs missing images (${results.missingImages.length}):`);
        for (const rom of results.missingImages) {
          console.log(`  - ${rom}`);
        }
      }

      if (showMissing && results.missingVideos.length > 0) {
        console.log(`\nROMs missing videos (${results.missingVideos.length}):`);
        for (const rom of results.missingVideos) {
          console.log(`  - ${rom}`);
        }
      }
    }
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("SUMMARY");
  console.log("=".repeat(50));

  if (totalOrphanImages === 0 && totalOrphanVideos === 0) {
    console.log("\nNo orphan media files found!");
  } else {
    console.log(`\nTotal orphan images: ${totalOrphanImages}`);
    console.log(`Total orphan videos: ${totalOrphanVideos}`);
  }

  if (showMissing) {
    console.log(`\nTotal ROMs missing images: ${totalMissingImages}`);
    console.log(`Total ROMs missing videos: ${totalMissingVideos}`);
  }

  // Also print platforms without any orphans
  const cleanPlatforms = allResults.filter(
    (r) => r.orphanImages.length === 0 && r.orphanVideos.length === 0
  );
  if (cleanPlatforms.length > 0 && !filterPlatform) {
    console.log(`\nPlatforms with no orphans: ${cleanPlatforms.map((r) => r.platform).join(", ")}`);
  }

  // Handle deletion if requested
  if (deleteMode || deleteForce) {
    await deleteOrphanFiles(allResults);
  }
}

main();
