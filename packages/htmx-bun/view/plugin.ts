import { plugin } from "bun";
import { Source } from "./source";

plugin({
    setup: ({ onLoad }) => {
        onLoad({ filter: /\.part$/ }, async (args) => {
            const source = new Source(args.path);
            const code = await source.compile();
            console.log(code);
            return { contents: code, loader: "ts" };
        });
    },
});

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
