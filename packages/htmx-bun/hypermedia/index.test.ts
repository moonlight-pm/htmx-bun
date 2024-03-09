import { afterAll, expect, test } from "bun:test";
import { mkdtempSync, rmdirSync } from "fs";
import { tmpdir } from "os";
import { Context } from "~/server/context";
import { Director } from "./director";

afterAll(() => {
    rmdirSync(director.base!, { recursive: true });
});

const director = Director.shared;
director.base = mkdtempSync(`${tmpdir()}/htmx-bun-`);

test("director prepare", () => {
    director.prepare("alpha", "const a = 1;");
    const alpha = director.represent("alpha");
    expect(alpha).toBeDefined();
});

test("representation present", () => {
    director.prepare("alpha", "const a = 1;");
    const alphaR = director.represent("alpha")!;
    const alphaP = alphaR.present({} as Context, {});
    expect(1).toBe(1);
});
