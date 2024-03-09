import { expect, test } from "bun:test";
import { flowEachTransformHtml } from "./flow";
import { parseSource, printHtml } from "./template";

const source1 = `
<hr mx-each={[1,2,3,4]}>
`;

test("simple each", () => {
    const node = parseSource(source1);
    flowEachTransformHtml({}, node);
    expect(printHtml(node, { trim: true })).toBe("<hr><hr><hr><hr>");
});
