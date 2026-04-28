import fs from "fs";
import path from "path";

const root = process.cwd();

const moves = [
  // UI & Routes -> client
  ["src/components", "client/src/components"],
  ["src/hooks", "client/src/hooks"],
  ["src/routes", "client/src/routes"],
  ["src/styles.css", "client/src/styles.css"],
  ["src/lib/utils.ts", "client/src/lib/utils.ts"],
  ["src/lib/assistant.ts", "client/src/lib/assistant.ts"],
  ["components.json", "client/components.json"],
  ["eslint.config.js", "client/eslint.config.js"],
  ["tsconfig.json", "client/tsconfig.json"],
  
  // Backend -> server
  ["src/server/gemini.functions.ts", "server/src/gemini.ts"],
  ["src/server/supply-chain.functions.ts", "server/src/supply-chain.ts"],
  
  // Shared
  ["src/lib/supply-chain.ts", "shared/supply-chain.ts"],
];

for (const [src, dest] of moves) {
  const fullSrc = path.join(root, src);
  const fullDest = path.join(root, dest);
  if (fs.existsSync(fullSrc)) {
    fs.mkdirSync(path.dirname(fullDest), { recursive: true });
    fs.renameSync(fullSrc, fullDest);
    console.log(`Moved ${src} -> ${dest}`);
  }
}

// Cleanup old files we replace
const toDelete = [
  "src/lib/db.ts",
  "src/server/db.functions.ts",
  "src/router.tsx",
  "src/routeTree.gen.ts",
  "vite.config.ts",
  "package.json"
];

for (const file of toDelete) {
  const full = path.join(root, file);
  if (fs.existsSync(full)) {
    // Check if it's a dir
    if (fs.statSync(full).isDirectory()) {
      fs.rmSync(full, { recursive: true, force: true });
    } else {
      fs.unlinkSync(full);
    }
    console.log(`Deleted ${file}`);
  }
}

// Remove empty src dir
if (fs.existsSync(path.join(root, "src"))) {
  fs.rmSync(path.join(root, "src"), { recursive: true, force: true });
}

console.log("Restructuring complete. Please run 'npm install' in client and server directories.");
