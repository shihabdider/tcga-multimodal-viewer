import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";

export async function withTempProjectRoot(
  prefix: string,
  run: (projectRoot: string) => Promise<void>,
): Promise<void> {
  const projectRoot = await mkdtemp(join(tmpdir(), prefix));
  const previousWorkingDirectory = process.cwd();

  try {
    process.chdir(projectRoot);
    await run(projectRoot);
  } finally {
    process.chdir(previousWorkingDirectory);
    await rm(projectRoot, { recursive: true, force: true });
  }
}

export function resolvePathFromCwd(path: string): string {
  return isAbsolute(path) ? path : join(process.cwd(), path);
}
