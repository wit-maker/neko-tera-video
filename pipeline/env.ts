/** プロジェクト直下の .env を process.env に読み込む(既存の環境変数は上書きしない)。 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const envPath = join(import.meta.dirname, "..", ".env");
if (existsSync(envPath)) {
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line
      .slice(eq + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, "$2");
    if (!(key in process.env)) process.env[key] = value;
  }
}
