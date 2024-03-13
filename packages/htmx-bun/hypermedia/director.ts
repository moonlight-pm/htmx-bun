import { plugin } from "bun";
import { readFileSync } from "node:fs";
// import { resolveTag } from "~/lib/ai/resolve-tag";
import { info, warn } from "~/lib/log";
import { watch } from "~/lib/watch";
import { Context } from "~/server/context";
import { Artifact, Representation, Source, VariableRepresentation } from ".";
import { MarkdownSource } from "./kinds/markdown/source";
import { PartialSource } from "./kinds/partial/source";
import { resolveTag } from "./resolve";
import { PrintHtmlOptions, htmlTags } from "./template";

/**
 * Manages hypermedia representations and their modules.
 */
export class Director {
    /**
     * @param base The base lookup path for representation sources.
     */
    constructor(readonly base?: string) {}

    private readonly representations: Map<string, Representation> = new Map();

    /**
     * Registers a source with the module system, imports it, and retains a mapping
     * of the resulting representation.
     * @param tag The tag name.
     * @param source The string or source instance.
     */
    async prepare(tag: string, source: Source) {
        if (htmlTags.includes(tag)) {
            warn("director", `tag name '${tag}' is reserved, ignoring`);
            return;
        }
        plugin({
            setup: ({ module }) => {
                module(tag, () => {
                    return {
                        contents: source.code,
                        loader: "tsx",
                    };
                });
            },
        });
        const artifact = (await import(tag)) as Artifact;
        const representation = new Representation(
            this,
            tag,
            artifact,
            source.path,
        );
        this.representations.set(tag, representation);
    }

    revert(tag: string) {
        info("director", `reverting '${tag}'`);
        this.representations.delete(tag);
    }

    watch() {
        if (!this.base) {
            return;
        }
        info("director", `watching for changes in '${this.base}'`);
        watch(this.base, async (_, path) => {
            if (/\.(part|md)$/.test(path ?? "")) {
                info("director", `reloading '${path}'`);
                const rep = Array.from(this.representations.values()).find(
                    (r) => r.path === path,
                );
                if (rep) {
                    this.revert(rep.tag);
                }
            }
        });
    }

    /**
     * Return the representation associated with a given tag name.
     *
     * If the representation is not found, a lookup will be attempted by deriving a
     * path name from the configured base path and tag name.
     *
     * If no base path has been configured, no lookup will be performed, and
     * only manually registered tags can be retrieved.
     *
     * @param tag The tag name.
     * @returns The representation, if found, or undefined.
     */
    async represent(tag: string): Promise<Representation | undefined> {
        console.log("Represent", tag);
        if (!this.representations.has(tag) && this.base) {
            const { path, amendedTag, resolvedVariables } = resolveTag(
                tag,
                this.base,
            );
            console.log(amendedTag, path);
            if (!path) {
                warn("director", `No representation found for '${tag}'`);
                return;
            }
            if (amendedTag) {
                if (!this.representations.has(amendedTag)) {
                    const text = readFileSync(path, "utf8");
                    const shortpath = path.replace(
                        new RegExp(`^${this.base}/`),
                        "",
                    );
                    if (path.endsWith(".part")) {
                        await this.prepare(
                            amendedTag,
                            new PartialSource(text, shortpath),
                        );
                    } else if (path.endsWith(".md")) {
                        await this.prepare(
                            amendedTag,
                            new MarkdownSource(text, shortpath),
                        );
                    }
                }
                let representation = this.representations.get(amendedTag);
                if (
                    representation &&
                    Object.keys(resolvedVariables).length > 0
                ) {
                    representation = new VariableRepresentation(
                        representation,
                        resolvedVariables,
                    );
                }
                return representation;
            }
            // } catch (e) {
            //     error("director", `Failed to load '${path}'`);
            //     // @ts-ignore
            //     const cause = e.cause?.toString();
            //     if (cause) {
            //         console.log(cause);
            //     } else {
            //         console.log(e);
            //     }
            //     return;
            // }
        }
        return this.representations.get(tag);
    }

    /**
     * A helper to immediately get the presentation, if available.
     * @param tag The tag name.
     * @param context The server context.
     * @param attributes The attributes.
     * @returns
     */
    async present(tag: string, context: Context) {
        return (await this.represent(tag))?.present(context);
    }

    /**
     * A helper to run through the whole render pipeline.
     *
     * @param tag The tag name.
     * @param context The server context.
     * @param attributes The attributes.
     * @param options Options to pass to the printer.
     * @returns The rendered html string.
     */
    async render(
        tag: string,
        context: Context,
        options: Partial<PrintHtmlOptions> = {},
    ): Promise<string | undefined> {
        const rep = await this.represent(tag);
        if (!rep) {
            return;
        }
        const pres = rep.present(context);
        await pres.activate();
        await pres.compose();
        pres.flatten();
        return pres.render(options);
    }
}
