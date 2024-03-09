import { plugin } from "bun";
import { existsSync, readFileSync } from "fs";
import { info, warn } from "~/lib/log";
import { watch } from "~/lib/watch";
import { Artifact, Representation, Source } from ".";
import { MarkdownSource } from "./kinds/markdown/source";

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
    prepare(tag: string, source: Source) {
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
        const artifact = require(tag) as Artifact;
        const representation = new Representation(tag, artifact, source.path);
        this.representations.set(tag, representation);
    }

    revert(tag: string) {
        this.representations.delete(tag);
    }

    watch() {
        if (!this.base) {
            return;
        }
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
    represent(tag: string): Representation | undefined {
        if (!this.representations.has(tag)) {
            const path = this.pathForTag(tag);
            if (!path) {
                warn("director", `No representation found for '${tag}'`);
                return;
            }
            const text = readFileSync(path, "utf8");
            const source = new MarkdownSource(
                text,
                path.replace(new RegExp(`^${this.base}/`), ""),
            );
            this.prepare(tag, source);
            // try {
            //     if (path.endsWith(".part")) {
            //         const module = require(path) as PartialModule;
            //         this.#templates.set(
            //             tag,
            //             new PartialTemplate(this, tag, path, module),
            //         );
            //     } else if (path.endsWith(".md")) {
            //         const module = require(path) as MarkdownModule;
            //         this.#templates.set(
            //             tag,
            //             new MarkdownTemplate(this, tag, path, module),
            //         );
            //     }
            // } catch (e) {
            //     error("compositor", `Failed to load '${path}'`);
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
     * Searches all possible file paths derived from the configured base path
     * and the tag name, returning the first one found.
     * @param tag The tag name.
     * @returns A path, or undefined.
     */
    pathForTag(tag: string) {
        const pathname = tag.replace(/-/g, "/");
        if (this.base) {
            const possibles = [
                `${this.base}/${pathname}/index.part`,
                `${this.base}/${pathname}/index.md`,
                `${this.base}/${pathname}.part`,
                `${this.base}/${pathname}.md`,
            ];
            for (const path of possibles) {
                if (existsSync(path)) {
                    return path;
                }
            }
        }
    }
}
