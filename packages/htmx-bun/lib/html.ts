import { SAXParser } from "parse5-sax-parser";
import { formatHtml } from "~/lib/format";

/**
 * An array of void tag names.
 * Void tags are HTML tags that do not require a closing tag.
 */
export const voidTags = [
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
];

export type HtmlFragment = {
    type: "fragment";
    parent?: HtmlParent;
    children: HtmlNode[];
};

export type HtmlDoctype = {
    type: "doctype";
    parent: HtmlFragment;
};

export type HtmlText = {
    type: "text";
    parent: HtmlParent;
    content: string;
};

export type HtmlElementAttribute = {
    name: string;
    value: string;
};

export type HtmlElement = {
    type: "element";
    parent: HtmlParent;
    children: HtmlNode[];
    tag: string;
    void: boolean;
    attrs: HtmlElementAttribute[];
};

export type HtmlNode = HtmlFragment | HtmlDoctype | HtmlElement | HtmlText;
export type HtmlParent = HtmlFragment | HtmlElement;

export const createHtmlFragment = (
    parent?: HtmlParent,
    ...children: HtmlNode[]
): HtmlFragment => ({
    type: "fragment",
    children,
});

export const createHtmlElement = (
    parent: HtmlParent,
    tag: string,
    attrs: HtmlElementAttribute[] | Record<string, unknown> = [],
    ...children: (HtmlElement | HtmlText)[]
): HtmlElement => ({
    type: "element",
    parent,
    tag,
    void: voidTags.includes(tag),
    attrs: Array.isArray(attrs)
        ? attrs
        : Object.entries(attrs).map(
              ([name, value]) => ({ name, value }) as HtmlElementAttribute,
          ),
    children,
});

export const createHtmlText = (
    parent: HtmlParent,
    content: string,
): HtmlText => ({
    type: "text",
    parent,
    content,
});

export const createHtmlDoctype = (parent: HtmlFragment): HtmlDoctype => ({
    type: "doctype",
    parent,
});

export function parseHtml(html: string): HtmlFragment {
    const stack: HtmlParent[] = [createHtmlFragment()];
    const parser = new SAXParser();

    function parent() {
        return stack[stack.length - 1];
    }

    function addElement(tag: string, attrs: HtmlElementAttribute[] = []) {
        const node = createHtmlElement(parent(), tag, attrs);
        parent().children.push(node);
        return node;
    }

    function addText(content: string) {
        parent().children.push(createHtmlText(parent(), content));
    }

    function addDoctype() {
        const p = parent();
        if (p.type === "fragment") {
            parent().children.push(createHtmlDoctype(p));
        }
    }

    parser.on("doctype", () => {
        addDoctype();
    });

    parser.on("startTag", (tag) => {
        const node = addElement(tag.tagName, tag.attrs);
        if (!tag.selfClosing && !voidTags.includes(tag.tagName)) {
            stack.push(node);
        }
    });

    parser.on("text", (text) => {
        const parent = stack[stack.length - 1] as HtmlParent;
        parent.children.push(createHtmlText(parent, text.text));
    });

    parser.on("endTag", (tag) => {
        stack.pop();
    });

    parser.write(html);
    return stack[0] as HtmlFragment;
}

export async function printHtmlSyntaxTree(node: HtmlNode): Promise<string> {
    function visit(node: HtmlNode): string {
        switch (node.type) {
            case "fragment":
                return node.children.map(visit).join("");
            case "doctype":
                return "<!DOCTYPE html>";
            case "element":
                return `<${node.tag}${node.attrs
                    .map((attr) => ` ${attr.name}="${attr.value}"`)
                    .join("")}>${node.children.map(visit).join("")}${
                    node.void ? "" : `</${node.tag}>`
                }`;
            case "text":
                return node.content;
        }
    }
    return formatHtml(visit(node));
}

// XXX: Changed to require returning the existing node, update to allow undefined to mean remove, or an array is allowed to
// This is to follow the pattern set forth by the typescript transformer
export type HtmlTransformer = (
    node: HtmlNode,
) =>
    | Promise<HtmlNode | HtmlNode[] | undefined>
    | HtmlNode
    | HtmlNode[]
    | undefined;

export async function transformHtmlSyntaxTree(
    root: HtmlFragment,
    visit: HtmlTransformer,
) {
    await visitNodeChildren(root, visit);
}

async function visitNodeChildren(
    parent: HtmlParent,
    visit: HtmlTransformer,
    path = "",
) {
    // path += `> ${parent.tag ?? "frag"} `;
    // console.log("VISIT", path);
    const resultingChildren = [];
    for (const child of parent.children) {
        const result = await visit(child);
        if (Array.isArray(result)) {
            resultingChildren.push(...result);
        } else if (result) {
            resultingChildren.push(result);
        }
    }
    parent.children = resultingChildren;
    for (const child of parent.children) {
        child.parent = parent;
        if (child.type === "fragment" || child.type === "element") {
            await visitNodeChildren(child, visit, path);
        }
    }
}
