import { afterAll } from "bun:test";
import { mkdtempSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";

export function makeTemporaryDirectory() {
    const dir = mkdtempSync(`${tmpdir()}/htmx-bun-`);
    afterAll(() => {
        rmdirSync(dir, { recursive: true });
    });
    return dir;
}
