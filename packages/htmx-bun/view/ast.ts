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

export type Fragment = {
    type: "fragment";
    parent?: Parent;
    children: Node[];
};

export type Doctype = {
    type: "doctype";
    parent: Fragment;
};

export type Text = {
    type: "text";
    parent: Parent;
    content: string;
};

export type Attribute = {
    name: string;
    value: string;
};

export type Element = {
    type: "element";
    parent: Parent;
    children: Node[];
    tag: string;
    void: boolean;
    attrs: Attribute[];
};

export type Node = Fragment | Doctype | Element | Text;
export type Parent = Fragment | Element;

export const createFragment = (...children: Node[]): Fragment => ({
    type: "fragment",
    children,
});

const createElement = (
    parent: Parent,
    tag: string,
    attrs: Attribute[] = [],
    ...children: (Element | Text)[]
): Element => ({
    type: "element",
    parent,
    tag,
    void: voidTags.includes(tag),
    attrs,
    children,
});

const createText = (parent: Parent, content: string): Text => ({
    type: "text",
    parent,
    content,
});

const createDoctype = (parent: Fragment): Doctype => ({
    type: "doctype",
    parent,
});

export function parseHtml(html: string): Fragment {
    const stack: Parent[] = [createFragment()];
    const parser = new SAXParser();

    function parent() {
        return stack[stack.length - 1];
    }

    function addElement(tag: string, attrs: Attribute[] = []) {
        const node = createElement(parent(), tag, attrs);
        parent().children.push(node);
        return node;
    }

    function addText(content: string) {
        parent().children.push(createText(parent(), content));
    }

    function addDoctype() {
        const p = parent();
        if (p.type === "fragment") {
            parent().children.push(createDoctype(p));
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
        const parent = stack[stack.length - 1] as Parent;
        parent.children.push(createText(parent, text.text));
    });

    parser.on("endTag", (tag) => {
        stack.pop();
    });

    parser.write(html);
    return stack[0] as Fragment;
}

export async function printHtml(node: Node): Promise<string> {
    function visit(node: Node): string {
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

export function transformAst(
    source: Node,
    visit: (node: Node) => Node | undefined,
): Node {
    const target = visit(source) ?? source;
    if (target.type === "fragment" || target.type === "element") {
        for (let i = 0; i < target.children.length; i++) {
            target.children[i] = transformAst(target.children[i], visit);
        }
    }
    return target;
}
