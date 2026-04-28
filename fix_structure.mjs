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
  ["src/routeTree.gen.ts", "client/src/routeTree.gen.ts"],
  
  // Shared
  ["src/lib/supply-chain.ts", "shared/supply-chain.ts"],
];

for (const [src, dest] of moves) {
  const fullSrc = path.join(root, src);
  const fullDest = path.join(root, dest);
  if (fs.existsSync(fullSrc)) {
    fs.mkdirSync(path.dirname(fullDest), { recursive: true });
    try {
      // Use cpSync instead of renameSync to avoid EBUSY/EPERM on Windows
      fs.cpSync(fullSrc, fullDest, { recursive: true, force: true });
      console.log(`Copied ${src} -> ${dest}`);
    } catch (err) {
      console.error(`Failed to copy ${src} to ${dest}:`, err.message);
    }
  }
}

// Cleanup old files safely
const toDelete = [
  "src/lib/db.ts",
  "src/server/db.functions.ts",
  "src/server/gemini.functions.ts",
  "src/server/supply-chain.functions.ts",
  "src/router.tsx",
  "src/routeTree.gen.ts",
];

for (const file of toDelete) {
  const full = path.join(root, file);
  if (fs.existsSync(full)) {
    try {
      if (fs.statSync(full).isDirectory()) {
        fs.rmSync(full, { recursive: true, force: true });
      } else {
        fs.unlinkSync(full);
      }
      console.log(`Deleted old ${file}`);
    } catch(err) {
       console.log(`Could not delete ${file} (might be open in editor)`);
    }
  }
}

console.log("Restructuring complete. Try running 'npm run install:all' now.");
