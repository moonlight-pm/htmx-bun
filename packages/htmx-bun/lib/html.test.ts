import { expect, test } from "bun:test";
import { HtmlParent, parseHtml, printHtmlSyntaxTree } from "./html";

test("parse and print", async () => {
    const html = `<div>\n    <h1 class="monk">Test</h1>\n    <p>Test</p>\n</div>\n`;
    const ast = parseHtml(html);
    const printed = await printHtmlSyntaxTree(ast);
    expect(printed).toBe(html);
});

test("embedded fragment", async () => {
    const a = "<div></div>";
    const b = "<span></span>";
    const aa = parseHtml(a);
    const bb = parseHtml(b);
    (aa.children[0] as HtmlParent).children.push(bb);
    expect(await printHtmlSyntaxTree(aa)).toBe("<div><span></span></div>\n");
});
