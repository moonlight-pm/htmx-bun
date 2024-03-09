import { expect, test } from "bun:test";
import { makeTemporaryDirectory } from "~/lib/test";
import { Context } from "~/server/context";
import { Director } from "./director";
import { MarkdownSource } from "./kinds/markdown/source";

const director = new Director(makeTemporaryDirectory());

test("representation present", () => {
    director.prepare("alpha", new MarkdownSource("# Hello"));
    const alphaR = director.represent("alpha")!;
    const alphaP = alphaR.present({} as Context, {});
    expect(alphaP).toBeDefined();
});
