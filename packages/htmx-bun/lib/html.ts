import format from "html-format";
import { SAXParser } from "parse5-sax-parser";

const voidTags = [
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

interface Doctype {
    type: "doctype";
}

type Env = Record<string, string>;

export interface Root {
    type: "root";
    env: Env;
    children: Child[];
}

export interface Element {
    type: "element";
    env: Env;
    tag: string;
    attrs: Record<string, string>;
    children: Child[];
    append: (
        tag: string,
        attrs: Record<string, string>,
        ...children: (Element | Text)[]
    ) => Element;
}

function createElement(
    parent: Parent,
    tag: string,
    attrs: Record<string, string> = {},
    ...children: (Element | Text)[]
): Element {
    return {
        type: "element",
        env: Object.create(parent.env),
        tag,
        attrs,
        children,
        append(tag, attrs = {}, ...content) {
            const element = createElement(this, tag, attrs, ...content);
            this.children.push(element);
            return element;
        },
    };
}

interface Text {
    type: "text";
    env: Env;
    content: string;
}

export function createText(parent: Parent, content: string): Text {
    return {
        type: "text",
        env: Object.create(parent.env),
        content,
    };
}

export type Parent = Root | Element;
export type Child = Element | Text | Doctype;
export type Node = Parent | Text | Doctype;

export function parseHtml(html: string): Root {
    const stack: Node[] = [
        {
            type: "root",
            env: {},
            children: [],
        },
    ];

    const parser = new SAXParser();

    parser.on("doctype", (doctype) => {
        const parent = stack[stack.length - 1] as Parent;
        parent.children.push({
            type: "doctype",
        });
    });

    parser.on("startTag", (tag) => {
        const parent = stack[stack.length - 1] as Parent;
        const attrs = Object.fromEntries(
            tag.attrs.map((attr) => [attr.name, attr.value]),
        );
        const node = createElement(parent, tag.tagName, attrs);
        parent.children.push(node);
        if (!tag.selfClosing && !voidTags.includes(tag.tagName)) {
            stack.push(node);
        }
    });

    parser.on("text", (text) => {
        const parent = stack[stack.length - 1] as Parent;
        parent.children.push({
            type: "text",
            content: text.text,
        } as Text);
    });

    parser.on("endTag", (tag) => {
        stack.pop();
    });

    parser.write(html);
    return stack[0] as Root;
}

export function serializeHtml(node: Node): string {
    switch (node.type) {
        case "doctype":
            return "<!DOCTYPE html>";
        case "root":
            return format(node.children.map(serializeHtml).join(""), "    ");
        case "element":
            return `<${node.tag}${Object.entries(node.attrs)
                .map(([key, value]) => ` ${key}="${value}"`)
                .join("")}>${node.children.map(serializeHtml).join("")}${
                voidTags.includes(node.tag) ? "" : `</${node.tag}>`
            }`;
        case "text":
            return node.content;
    }
}

export function walkHtml(
    input: Element | string,
    callback: (node: Element) => void,
): Parent | string {
    const node = typeof input === "string" ? parseHtml(input) : input;
    for (const child of node.children) {
        if (child.type === "element") {
            callback(child);
            walkHtml(child, callback);
        }
    }
    if (typeof input === "string") {
        return serializeHtml(node);
    }
    return node;
}

// XXX: Put in unit test
// const html = `
//     <div>
//         <link rel="stylesheet" href="/_tailwind">
//         <foo />
//         <bar />
//         <baz>
//             <bam>Foo</bam>
//         </baz>
//     </div>
// `;

// const root = parseHtml(html);
// console.log(serializeHtml(root));
