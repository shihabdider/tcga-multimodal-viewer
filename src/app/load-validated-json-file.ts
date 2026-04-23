import { readFile } from "node:fs/promises";

export async function loadValidatedJsonFile<T>(
  filePath: string,
  validate: (value: unknown) => T,
): Promise<T> {
  const json = await readFile(filePath, "utf8");
  const parsed = JSON.parse(json) as unknown;

  return validate(parsed);
}
