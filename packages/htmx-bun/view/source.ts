import { SAXParser } from "parse5-sax-parser";
import { formatHtml, formatTypeScript } from "./lib/format";

/**
 * Represents a source file that contains HTML tags and code blocks.
 */
export class Source {
    code: string[] = [];
    html: string[] = [];
    interpolationIndex = 0;

    constructor(public path: string) {}

    /**
     * Compile template by parsing it, formatting the HTML and TypeScript code,
     * and returning the final typescript representation source.
     * @returns The typescript output.
     */
    async compile() {
        const text = await Bun.file(this.path).text();
        await this.parse(text);
        const html = await formatHtml(this.html.join(""));
        const code = await formatTypeScript(`
            export const presentation = ${JSON.stringify(html)};

            ${this.code.join("\n")}
        `);
        return code;
    }

    /**
     * Parses the given text and extracts HTML tags and code blocks.
     *
     * @param text - The text to parse.
     * @returns A Promise that resolves when the parsing is complete.
     */
    async parse(text: string) {
        const parser = new SAXParser();
        let inCode = false;
        parser.on("startTag", (tag) => {
            if (tag.tagName === "server") {
                inCode = true;
            } else {
                this.html.push(`<${tag.tagName} `);
                for (const attr of tag.attrs) {
                    this.html.push(`${attr.name}="`);
                    this.interpolate(attr.value);
                    this.html.push(`"`);
                }
                if (tag.selfClosing) {
                    this.html.push(" />");
                } else {
                    this.html.push(">");
                }
            }
        });
        parser.on("endTag", (tag) => {
            if (tag.tagName === "server") {
                inCode = false;
            } else {
                this.html.push(`</${tag.tagName}>`);
            }
        });
        parser.on("text", (text) => {
            if (inCode) {
                this.code.push(text.text);
            } else {
                this.interpolate(text.text);
            }
        });
        parser.on("doctype", (doctype) => {
            this.html.push("<!DOCTYPE html>");
        });
        parser.on("error", (error) => {
            console.error(error);
        });
        parser.write(text);
    }

    /**
     * Interpolates the given text by marking code snippets and pushing them into the code and html arrays.
     *
     * @param text - The text to be interpolated.
     */
    interpolate(text: string) {
        const marks = markCode(text);
        let i = 0;
        for (const mark of marks) {
            console.log("INTERPOLATE", this.interpolationIndex, mark.code);
            this.code.push(
                `const $ext${this.interpolationIndex} = () => (${mark.code})`,
            );
            this.html.push(text.slice(i, mark.start));
            this.html.push(`$ext${this.interpolationIndex}`);
            i = mark.end;
            this.interpolationIndex++;
        }
        this.html.push(text.slice(i));
    }
}

interface CodeMark {
    start: number;
    end: number;
    code: string;
}

/**
 * Marks the code blocks within the given text.
 *
 * Code blocks are marked by curly braces, and the code within them is extracted.
 *
 * @param text - The text to search for code blocks.
 * @returns An array of CodeMark objects representing the code blocks found.
 */
export function markCode(text: string): CodeMark[] {
    let depth = 0;
    let start = -1;
    let inString = false;
    const codes = [];

    for (let i = 0; i < text.length; i++) {
        if (text[i] === '"' || text[i] === "'") {
            inString = !inString;
        } else if (!inString && text[i] === "{") {
            if (depth === 0) {
                start = i;
            }
            depth++;
        } else if (!inString && text[i] === "}") {
            depth--;
            if (depth === 0 && start !== -1) {
                codes.push({
                    start,
                    end: i + 1,
                    code: text.slice(start + 1, i).trim(),
                });
                start = -1;
            }
        }
    }

    return codes;
}
