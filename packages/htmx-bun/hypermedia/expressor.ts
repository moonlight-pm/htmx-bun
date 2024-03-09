import { error } from "~/lib/log";
import { Scope } from ".";
import {
    HtmlElement,
    HtmlNode,
    createHtmlText,
    simpleTransformHtml,
} from "./template";

/**
 * Evaluates an expression with a given scope.
 *
 * @param scope - The scope to evaluate the expression with.
 * @param expression - The expression to evaluate.
 * @returns The result of evaluating the expression.
 */
export function express(scope: Scope, expression: string): unknown {
    const express = new Function("$scope", `return ${expression}`);
    try {
        return express(scope);
    } catch (e) {
        error("expressor", `Error evaluating expression '${expression}`);
        console.log("$scope:", scope);
        console.log(e);
        return undefined;
    }
}

/**
 * Evaluates all the expressions in a html ast with a given scope,
 * and coercing expressed results into strings.
 *
 * @param scope - The scope to evaluate the expression with.
 * @param template - The HtmlFragment root.
 * @returns The transformed template.
 */
export function expressTransformHtmlIntoStrings(
    scope: Scope,
    node: HtmlNode,
): HtmlNode {
    simpleTransformHtml(node, (node) => {
        if (node.type === "element") {
            node.attrs = node.attrs.map((attr) => {
                attr.value = attr.value.map((value) =>
                    value.type === "text"
                        ? value
                        : {
                              type: "text",
                              content: String(express(scope, value.content)),
                          },
                );
                return attr;
            });
        }
        if (node.type === "expression") {
            return createHtmlText(
                node.parent,
                String(express(scope, node.content)),
            );
        }
        return node;
    });
    return node;
}

/**
 * Retrieves the expressed value of a node attribute.  If the attribute
 * has multiple values, none are returned.
 * @param node The node to extract the attribute from
 * @param name The name of the attribute to express
 * @returns The expressed value, or undefined.
 */
export function expressAttribute(
    scope: Scope,
    node: HtmlElement,
    name: string,
): unknown {
    for (const attr of node.attrs) {
        if (attr.name === name) {
            if (
                attr.value.length === 1 &&
                attr.value[0].type === "expression"
            ) {
                return express(scope, attr.value[0].content);
            }
        }
    }
}