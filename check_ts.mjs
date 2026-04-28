import { execSync } from "child_process";
import fs from "fs";

try {
  const out = execSync("npx tsc --noEmit -p server/tsconfig.json", { encoding: "utf8", stdio: "pipe" });
  fs.writeFileSync("ts_errors.txt", "SUCCESS:\n" + out);
} catch (e) {
  fs.writeFileSync("ts_errors.txt", "ERROR:\n" + (e.stdout || "") + "\n" + (e.stderr || ""));
}
