import { fetchImages, parseArgs } from './fetch-images.js';

const args = process.argv.slice(2);
const options = parseArgs(args);

if (options.help) {
    console.log(`Usage: npm run fetch-screenshots [options]

Download screenshots from LibRetro Thumbnails repository.

Options:
  -d, --debug         Show detailed debug output
  -f, --fail-fast     Exit on first download failure
  -r, --refetch       Re-download existing images
  --platform=NAME     Filter to specific platform (e.g., --platform=Saturn)
  -h, --help          Show this help message
`);
    process.exit(0);
}

fetchImages({ type: 'screenshot', ...options });
