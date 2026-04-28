import { execSync } from "child_process";
import fs from "fs";

try {
  const out = execSync("npm run build:client", { encoding: "utf8", stdio: "pipe" });
  fs.writeFileSync("client_build_status.txt", "SUCCESS:\n" + out);
} catch (e) {
  fs.writeFileSync("client_build_status.txt", "ERROR:\n" + (e.stdout || "") + "\n" + (e.stderr || ""));
}
