import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const STORAGE_STATE_PATH = path.resolve(
  __dirname,
  "../.auth/user.json"
);

export const TEST_CREDENTIALS = {
  email: "admin@brewplan.local",
  password: "changeme",
};
