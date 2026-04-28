import { execSync } from "child_process";
import fs from "fs";

try {
  const out1 = execSync("npm run build --prefix server", { encoding: "utf8", stdio: "pipe" });
  fs.writeFileSync("server_build_log.txt", "SERVER BUILD SUCCESS:\n" + out1);
} catch (e) {
  fs.writeFileSync("server_build_log.txt", "SERVER BUILD ERROR:\n" + (e.stdout || "") + "\n" + (e.stderr || "") + "\n" + e.message);
}

try {
  const out2 = execSync("npm run build --prefix client", { encoding: "utf8", stdio: "pipe" });
  fs.writeFileSync("client_build_log.txt", "CLIENT BUILD SUCCESS:\n" + out2);
} catch (e) {
  fs.writeFileSync("client_build_log.txt", "CLIENT BUILD ERROR:\n" + (e.stdout || "") + "\n" + (e.stderr || "") + "\n" + e.message);
}
