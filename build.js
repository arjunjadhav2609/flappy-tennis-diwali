import fs from 'fs';
import path from 'path';

const order = [
  'src/config.js',
  'src/audio.js',
  'src/court.js',
  'src/player.js',
  'src/ball.js',
  'src/ai.js',
  'src/controls.js',
  'src/game.js'
];

let bundleContent = '(() => {\n"use strict";\n\n';

for (const relPath of order) {
  let content = fs.readFileSync(relPath, 'utf8');
  // Strip import statements
  content = content.replace(/^import\s+[^;]+;\s*$/gm, '');
  // Strip export statements (export const, export class, export function, export default)
  content = content.replace(/^export\s+(const|class|function|let|var)\s+/gm, '$1 ');
  content = content.replace(/^export\s*\{[^}]+\};?\s*$/gm, '');
  bundleContent += `// --- ${relPath} ---\n` + content + '\n\n';
}

bundleContent += `
window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new TennisGame('courtCanvas');
});
})();
`;

fs.writeFileSync('game.bundle.js', bundleContent, 'utf8');
console.log('Successfully bundled to game.bundle.js (' + bundleContent.length + ' bytes)');
