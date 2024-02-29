import { SAXParser } from "parse5-sax-parser";
import * as ts from "typescript";
import { formatHtml, formatTypeScript } from "../lib/format";

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
        let code = this.code.join("\n");
        const meta = extractMeta(code);
        code = await formatTypeScript(`
            export const meta = ${JSON.stringify(meta)};
            export const presentation = ${JSON.stringify(html)};

            ${code}
        `);
        // console.log(code);
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
            this.code.push(
                `export const $ext${
                    this.interpolationIndex
                } = (env) => (${prefixReferences(mark.code)})`,
            );
            this.html.push(text.slice(i, mark.start));
            this.html.push(`$ext${this.interpolationIndex}`);
            i = mark.end;
            this.interpolationIndex++;
        }
        this.html.push(text.slice(i));
    }
}

/**
 * Represents the metadata for a source.
 */
export interface Meta {
    attributes: Record<string, string>;
}

/**
 * Extracts meta information from the provided code.
 * @param code The code to extract meta information from.
 * @returns The extracted meta information.
 */
function extractMeta(code: string) {
    const meta: Meta = { attributes: {} };
    const source = ts.createSourceFile("", code, ts.ScriptTarget.Latest, true);
    ts.forEachChild(source, (node) => {
        if (
            ts.isInterfaceDeclaration(node) &&
            node.name.text === "Attributes"
        ) {
            for (const member of node.members) {
                if (ts.isPropertySignature(member) && member.type) {
                    meta.attributes[member.name.getText()] =
                        member.type.getText();
                }
            }
        }
    });
    return meta;
}

/**
 * Applies an 'env.' prefix to references in the given code.
 *
 * @param code The code to be transformed.
 * @returns The transformed code with prefixed references.
 */
function prefixReferences(code: string): string {
    const sourceFile = ts.createSourceFile(
        "",
        code,
        ts.ScriptTarget.Latest,
        true,
    );

    const transformer: ts.TransformerFactory<ts.Node> = (context) => {
        return (rootNode) => {
            let originalExpression: ts.Expression | ts.Identifier =
                ts.factory.createIdentifier("x");
            function visit(inNode: ts.Node): ts.Node {
                const node = ts.visitEachChild(inNode, visit, context);
                if (ts.isIdentifier(node)) {
                    if (ts.isExpressionStatement(node.parent)) {
                        originalExpression = node;
                        return context.factory.createPropertyAccessExpression(
                            context.factory.createIdentifier("env"),
                            node,
                        );
                    }
                    if (ts.isPropertyAccessExpression(node.parent)) {
                        originalExpression = node.parent;
                        if (node.parent.expression === node) {
                            return context.factory.createPropertyAccessExpression(
                                context.factory.createIdentifier("env"),
                                node,
                            );
                        }
                    }
                }
                return node;
            }
            const source = ts.visitNode(rootNode, visit) as ts.SourceFile;
            const statement = source.statements[0] as ts.ExpressionStatement;
            const modifiedExpression = statement.expression;
            const binaryExpression = ts.factory.createBinaryExpression(
                modifiedExpression,
                ts.factory.createToken(ts.SyntaxKind.QuestionQuestionToken),
                originalExpression,
            );
            return ts.factory.createSourceFile(
                [ts.factory.createExpressionStatement(binaryExpression)],
                ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
                source.flags,
            );
        };
    };

    const result = ts.transform(sourceFile, [transformer]);
    const transformed = result.transformed[0] as ts.SourceFile;
    const printer = ts.createPrinter({ omitTrailingSemicolon: true });
    return printer.printNode(
        ts.EmitHint.Unspecified,
        transformed.statements[0],
        sourceFile,
    );
}

/**
 * Locates a delimited code section in an html file.
 */
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
