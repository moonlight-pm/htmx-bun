import { expect, test } from "bun:test";
import {
    express,
    expressAttribute,
    expressTransformHtmlIntoStrings,
} from "./expressor";
import { HtmlElement, parseSource, printHtml } from "./template";

test("express", () => {
    expect(express({ value: "Joy" }, "$scope.value")).toBe("Joy");
});

test("express template to strings", () => {
    const scope = {
        gifts: ["Love", "Joy", "Peace"],
    };
    const template = parseSource(
        "<h1 name={$scope.gifts[0]}>{$scope.gifts[1]} {$scope.gifts[2]}</h1>",
        scope,
    );
    expect(printHtml(expressTransformHtmlIntoStrings(template))).toBe(
        `<h1 name="Love">Joy Peace</h1>\n`,
    );
});

test("express attribute", () => {
    const scope = {
        gifts: ["Love", "Joy", "Peace"],
    };
    const template = parseSource("<hr gifts={$scope.gifts}>", scope);
    expect(expressAttribute(template.children[0] as HtmlElement, "gifts")).toBe(
        scope.gifts,
    );
});
