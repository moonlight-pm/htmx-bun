import { warn } from "~/lib/log";
import { Scope } from ".";
import { expressAttribute } from "./expressor";
import { HtmlNode, simpleTransformHtml } from "./template";

/**
 * Transforms an html ast by looking for `mx-each` attributes,
 * evaluating that attribute, and duplicating the element by
 * its array length.
 * @param scope The scope to use for evaluating expressions.
 * @param node The ast to apply the each transform on.
 */
export function flowEachTransformHtml(scope: Scope, node: HtmlNode) {
    simpleTransformHtml(node, (node) => {
        if (node.type === "element") {
            const each = expressAttribute(scope, node, "mx-each") as unknown[];
            // const as = this.expressAttributeValue(node, "mx-as") as string;
            // if (!each) {
            //     if (as) {
            //         warn("view", `Unused 'mx-as' attribute for ${node.tag}`);
            //     }
            //     return;
            // }
            // if (!as) {
            //     warn(
            //         "view",
            //         `Missing 'mx-as' attribute in 'mx-each' iterator for ${node.tag}`,
            //     );
            //     return;
            // }
            if (!Array.isArray(each)) {
                warn(
                    "flow",
                    `Invalid 'mx-each' attribute for ${node.tag}, not an Array`,
                );
                return;
            }
            const children = [];
            for (const _ of each) {
                const child = structuredClone(node);
                child.attrs = child.attrs.filter(
                    (attr) => !["mx-each", "mx-as"].includes(attr.name),
                );
                children.push(child);
                // this.interpolateAttributesToString(
                //     child,
                //     Object.assign({}, additionalScope, {
                //         [as]: item,
                //     }),
                // );
                // children.push(
                //     await visitNode(
                //         child,
                //         Object.assign({}, additionalScope, {
                //             [as]: item,
                //         }),
                //     ),
                // );
            }
            return children;
        }
        return node;
    });
}
