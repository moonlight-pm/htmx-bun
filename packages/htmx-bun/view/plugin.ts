import { plugin } from "bun";
import { SAXParser } from "parse5-sax-parser";
import { formatHtml, formatTypeScript } from "./lib/format";

plugin({
    setup: ({ onLoad }) => {
        onLoad({ filter: /\.part$/ }, async (args) => {
            const text = await Bun.file(args.path).text();
            let { code, presentation } = await parse(text);
            code = await formatTypeScript(code);
            presentation = await formatHtml(presentation);
            const source = `
                    export const presentation = ${JSON.stringify(presentation)};

                    export default async function () {
                        ${code}
                        return {
                        }
                    }
                `;
            return { contents: source, loader: "ts" };
        });
    },
});

interface ParseResult {
    code: string;
    presentation: string;
}

function parse(html: string): ParseResult {
    const parser = new SAXParser();
    const presentation: string[] = [];
    const code: string[] = [];
    let inCode = false;
    parser.on("startTag", (tag) => {
        if (tag.tagName === "server") {
            inCode = true;
        } else {
            presentation.push(`<${tag.tagName}${tag.selfClosing ? " /" : ""}>`);
        }
    });
    parser.on("endTag", (tag) => {
        if (tag.tagName === "server") {
            inCode = false;
        } else {
            presentation.push(`</${tag.tagName}>`);
        }
    });
    parser.on("text", (text) => {
        if (inCode) {
            code.push(text.text);
        } else {
            presentation.push(text.text);
        }
    });
    parser.on("doctype", (doctype) => {
        presentation.push("<!DOCTYPE html>");
    });
    parser.on("error", (error) => {
        console.error(error);
    });
    parser.write(html);

    return {
        code: code.join("\n"),
        presentation: presentation.join("\n"),
    };
}
