import fs from 'fs';
import path from 'path';

const root = process.cwd();
const clientDir = path.join(root, 'client');
const serverDir = path.join(root, 'server');
const sharedDir = path.join(root, 'shared');

// Create directories
[clientDir, serverDir, sharedDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Move function
function move(src, dest) {
  const fullSrc = path.join(root, src);
  const fullDest = path.join(root, dest);
  if (fs.existsSync(fullSrc)) {
    const destDir = path.dirname(fullDest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.renameSync(fullSrc, fullDest);
    console.log(`Moved ${src} to ${dest}`);
  } else {
    console.warn(`Source not found: ${src}`);
  }
}

// 1. Move frontend to client
move('src/components', 'client/src/components');
move('src/hooks', 'client/src/hooks');
move('src/routes', 'client/src/routes');
move('src/routeTree.gen.ts', 'client/src/routeTree.gen.ts');
move('src/router.tsx', 'client/src/router.tsx');
move('src/styles.css', 'client/src/styles.css');
move('src/lib/utils.ts', 'client/src/lib/utils.ts');
move('index.html', 'client/index.html');
move('vite.config.ts', 'client/vite.config.ts');
move('tsconfig.json', 'client/tsconfig.json');
move('eslint.config.js', 'client/eslint.config.js');
move('components.json', 'client/components.json');
move('bunfig.toml', 'client/bunfig.toml'); // if needed

// 2. Move backend to server
move('src/server', 'server/src');
move('src/lib/db.ts', 'server/src/db.ts');

// 3. Move shared
move('src/lib/supply-chain.ts', 'shared/supply-chain.ts');
move('src/lib/assistant.ts', 'shared/assistant.ts'); // assuming assistant is shared or backend

console.log("Move operations completed.");
