import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import dotenv from "dotenv";
await mkdir("storage", { recursive: true });
try {
  await access(".env");
} catch {
  let code;
  try {
    code = (await readFile("storage/local-access-code.txt", "utf8")).trim();
  } catch {
    code = randomBytes(9).toString("base64url");
  }
  await writeFile(
    ".env",
    `PORT=3001\nFAMILY_ACCESS_CODE=${code}\nSESSION_SECRET=${randomBytes(32).toString("hex")}\nDATA_DIR=./storage\nSITE_URL=http://localhost:3001\n`,
    { mode: 0o600 },
  );
}
const env = dotenv.parse(await readFile(".env", "utf8"));
if (env.FAMILY_ACCESS_CODE)
  await writeFile("storage/local-access-code.txt", env.FAMILY_ACCESS_CODE, {
    mode: 0o600,
  });
console.log(
  "Local setup ready. Access code: storage/local-access-code.txt (not committed).",
);
