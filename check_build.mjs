import { execSync } from "child_process";
import fs from "fs";

try {
  const out = execSync("npm run build:server", { encoding: "utf8" });
  fs.writeFileSync("build_output.txt", "SUCCESS:\n" + out);
} catch (e) {
  fs.writeFileSync("build_output.txt", "ERROR:\n" + e.stdout + "\n" + e.stderr);
}
