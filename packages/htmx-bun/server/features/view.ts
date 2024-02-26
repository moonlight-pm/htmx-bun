import { Glob } from "bun";
import { existsSync, mkdir } from "fs";
import { resolve } from "path";
import { Child, parseHtml, serializeHtml } from "~/lib/html";
import { error, info, warn } from "~/lib/log";
import { ServerOptions } from "~/lib/options";
import { watch } from "~/lib/watch";
import { ServerFeature } from ".";

interface View {
    path: string;
    pathname: string;
    tag: string;
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

    async function walk(sourceChildren: Child[]): Promise<Child[]> {
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
                continue;
            }
            const view = elements.find((it) => it.tag === sourceChild.tag);
            if (view) {
                const module = await import(
                    `${process.cwd()}/view/${view.path}`
                );
                const { env, presentation } =
                    await module.default(
                        // XXX: pass attributes
                    );
                // console.log("PRESENTATION", presentation);
                // console.log("ENV", sourceChild.env, env);
                Object.assign(sourceChild.env, env);
                // XXX: These would go in the slot
                // const slotChildren = sourceChild.children;
                const presentationChildren = await walk(
                    parseHtml(presentation, sourceChild.env).children,
                );
                targetChildren.push(...presentationChildren);
            } else {
                if (sourceChild.tag === "each") {
                    // console.log("EACH", sourceChild.env);
                    if (!sourceChild.attrs.of) {
                        error("view", "missing 'of' attribute in <each />");
                        continue;
                    }
                    if (!sourceChild.attrs.as) {
                        error("view", "missing 'as' attribute in <each />");
                        continue;
                    }
                    const count = sourceChild.env[sourceChild.attrs.of].length;
                    for (let i = 0; i < count; i++) {
                        for (const eachChild of sourceChild.children) {
                            const eachRoot = parseHtml(
                                serializeHtml(eachChild),
                                sourceChild.env,
                            );
                            for (const eachRootChild of eachRoot.children) {
                                targetChildren.push(eachRootChild);
                            }
                        }
                    }
                    // const children = `
                    //     ${sourceChild.children.map(serializeHtml).join("")}
                    // `;
                    // console.log(children);
                }
                sourceChild.children = await walk(sourceChild.children);
                targetChildren.push(sourceChild);
            }
        }
        return targetChildren;
    }

    async function render(content: string): Promise<string> {
        const root = parseHtml(content);
        root.children = await walk(root.children);
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
            const content = await render(
                `<${element.tag} ${attrs.join(" ")} />`,
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
    };
    await reloadElement(element);
    elements.push(element);
}

async function reloadElement(element: View) {
    info("view", `(re)-loading 'view/${element.path}' AKA <${element.tag} />`);
    delete require.cache[resolve(`view/${element.path}`)];
}
