import { expect, test } from "bun:test";
import { parseHtml, printHtml } from "./ast";

test("parse and print", async () => {
    const html = `<div>\n    <h1 class="monk">Test</h1>\n    <p>Test</p>\n</div>\n`;
    const ast = parseHtml(html);
    const printed = await printHtml(ast);
    expect(printed).toBe(html);
});
