import { format } from "prettier";

export async function formatHtml(html: string): Promise<string> {
    return format(html, {
        parser: "html",
        htmlWhitespaceSensitivity: "ignore",
        tabWidth: 4,
    });
}
