import { expect, test } from "bun:test";
import { Parent, parseHtml, printHtml } from "./ast";

test("parse and print", async () => {
    const html = `<div>\n    <h1 class="monk">Test</h1>\n    <p>Test</p>\n</div>\n`;
    const ast = parseHtml(html);
    const printed = await printHtml(ast);
    expect(printed).toBe(html);
});

test("embedded fragment", async () => {
    const a = "<div></div>";
    const b = "<span></span>";
    const aa = parseHtml(a);
    const bb = parseHtml(b);
    (aa.children[0] as Parent).children.push(bb);
    expect(await printHtml(aa)).toBe("<div><span></span></div>\n");
});
