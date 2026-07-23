import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pngPath = path.join(__dirname, '../public/jolly-joker.png');
const outPath = path.join(__dirname, '../public/favicon.svg');
const b64 = fs.readFileSync(pngPath).toString('base64');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#f5f0e6"/>
  <rect x="1" y="1" width="62" height="62" rx="11" fill="none" stroke="#ca8a04" stroke-width="1.5" opacity="0.75"/>
  <image href="data:image/png;base64,${b64}" x="5" y="2" width="54" height="60" preserveAspectRatio="xMidYMin slice"/>
</svg>
`;

fs.writeFileSync(outPath, svg);
console.log('favicon.svg updated', `${Math.round(svg.length / 1024)} KB`);
