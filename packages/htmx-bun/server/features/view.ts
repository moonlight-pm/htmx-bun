import { Glob } from "bun";
import { existsSync, mkdir } from "fs";
import { Child, parseHtml, serializeHtml } from "~/lib/html";
import { info, warn } from "~/lib/log";
import { ServerOptions } from "~/lib/options";
import { watch } from "~/lib/watch";
import { ServerFeature } from ".";

interface View {
    path: string;
    pathname: string;
    tag: string;
    presentation: string;
    code?: (
        attrs: Record<string, string>,
    ) => Promise<string | undefined> | string | undefined;
}

export default async function (options: ServerOptions): Promise<ServerFeature> {
    const elements = await buildElements();
    const elementRegex = new RegExp(
        elements.map((it) => `(<${it.tag}[\s>])`).join("|"),
    );
    if (options?.features?.dev) {
        info("view", "watching 'view' directory...");
        watch("view", async (_, path) => {
            if (!path) {
                return;
            }
            const element = elements.find((it) => it.path === path);
            if (element) {
                if (existsSync(`view/${element.path}`)) {
                    reloadElement(element);
                } else {
                    info(
                        "view",
                        `unloading 'view/${element.path}' (<${element.tag}>)`,
                    );
                    elements.splice(elements.indexOf(element), 1);
                }
            } else {
                buildElement(elements, path);
            }
        });
    }

    function walk(sourceChildren: Child[]): Child[] {
        const targetChildren = [];
        for (const sourceChild of sourceChildren) {
            if (sourceChild.type === "doctype") {
                targetChildren.push(sourceChild);
                continue;
            }
            if (sourceChild.type === "text") {
                targetChildren.push(sourceChild);
                continue;
            }
            if (sourceChild.tag === "server") {
                console.log("SERVER");
                // Evaluate server code
                continue;
            }
            const view = elements.find((it) => it.tag === sourceChild.tag);
            if (view) {
                // XXX: These would go in the slot
                const slotChildren = sourceChild.children;
                const presentationChildren = walk(
                    parseHtml(view.presentation).children,
                );
                console.log(presentationChildren);
                targetChildren.push(...presentationChildren);
            } else {
                sourceChild.children = walk(sourceChild.children);
                targetChildren.push(sourceChild);
            }
        }
        return targetChildren;
    }

    function render(content: string): string {
        const root = parseHtml(content);
        root.children = walk(root.children);
        return serializeHtml(root);
    }

    return {
        name: "view",
        async fetch(request) {
            const url = new URL(request.url);
            const pathname = url.pathname === "/" ? "/index" : url.pathname;
            const element = elements.find((it) => it.pathname === pathname);
            if (!element) {
                return;
            }
            const attrs = [];
            for (const [name, value] of url.searchParams) {
                attrs.push(`${name}="${value}"`);
            }
            // XXX: Need to handle recursive views.
            const content = render(
                `<${element.tag} ${attrs.join(" ")}></${element.tag}>`,
            );
            return new Response(content, {
                headers: {
                    "Content-Type": "text/html;charset=utf-8",
                },
            });
        },
    };
}

async function buildElements() {
    const elements: View[] = [];
    if (!existsSync("view")) {
        info("view", "creating 'view' directory");
        mkdir("view", { recursive: true }, () => {});
    }
    for await (const path of new Glob("**/*.part").scan("view")) {
        await buildElement(elements, path);
    }
    return elements;
}

async function buildElement(elements: View[], path: string) {
    const pathname = path.replace(/\.part/g, "");
    let tag = pathname.replace(/\//g, "-");
    if (tag === "index") {
        tag = "root";
    }
    if (tag.endsWith("-index")) {
        tag = tag.replace(/-index$/, "");
    }
    const existingTag = elements.find((it) => it.tag === tag);
    if (existingTag) {
        warn("view", `Duplicate tag '${tag}' defined in 'view/${path}'`);
        warn("view", `Using 'view/${existingTag.path}'`);
        return;
    }
    const element: View = {
        path,
        pathname: `/${pathname}`,
        tag,
        presentation: "",
    };
    await reloadElement(element);
    elements.push(element);
}

async function reloadElement(element: View) {
    info("view", `(re)-loading 'view/${element.path}' AKA <${element.tag} />`);
    element.presentation = await Bun.file(`view/${element.path}`).text();
}
