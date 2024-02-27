import { expect, test } from "bun:test";
import { markCode } from "./source";

test("extractCode", () => {
    let text = "<div>{item.name}</div>";
    let code = markCode(text);
    expect(code[0].code).toEqual("item.name");
    // Multiple results
    text = "<div id={ item.id }>{item.name}</div>";
    code = markCode(text);
    expect(code[0].code).toEqual("item.id");
    expect(code[1].code).toEqual("item.name");
    // Nested brackets
    text = "<li id={`${id-li}`} />";
    code = markCode(text);
    expect(code[0].code).toEqual("`${id-li}`");
    // Uneven brackets
    // text = "<li id={`${id-li`} />";
    // code = extractCode(text);
    // expect(code).toEqual(["`${id-li`"]);
});
