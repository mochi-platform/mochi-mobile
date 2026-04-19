import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

async function ensureShim(filePath, target) {
  const body = JSON.stringify({ extends: target }, null, 2) + "\n";
  await writeFile(filePath, body, "utf8");
}

async function main() {
  const packageDir = path.join(
    process.cwd(),
    "node_modules",
    "expo-module-scripts",
  );

  try {
    await mkdir(packageDir, { recursive: true });

    await ensureShim(path.join(packageDir, "tsconfig.base"), "./tsconfig.base.json");
    await ensureShim(
      path.join(packageDir, "tsconfig.plugin"),
      "./tsconfig.plugin.json",
    );

    process.stdout.write("[fix-expo-tsconfig-shims] Shims preparados.\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[fix-expo-tsconfig-shims] Error: ${message}\n`);
    process.exitCode = 0;
  }
}

void main();
