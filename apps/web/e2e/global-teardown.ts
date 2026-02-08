import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.resolve(__dirname, "brewplan-test.db");

export default async function globalTeardown() {
  // Only clean up in CI — leave test DB for local debugging
  if (!process.env.CI) return;

  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const file = testDbPath + suffix;
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }
}
