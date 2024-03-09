import { plugin } from "bun";
import { existsSync } from "fs";
import { resolve } from "path";
import { warn } from "~/lib/log";
import { Artifact, Representation, Source } from ".";

/**
 * A singleton class that manages the list of prepared hypermedia
 * representations.
 */
export class Director {
    public static readonly shared = new Director();

    /**
     * The base lookup path for representation sources.  This is initially unset
     * and may be set once only.
     */
    #base?: string;

    constructor() {
        if (Director.shared) {
            throw new Error(
                "Cannot instantiate another Director.  Access with Director.shared",
            );
        }
    }

    set base(base: string) {
        if (this.#base) {
            throw new Error("Director base path may only be set once");
        }
        this.#base = base;
    }

    get base(): string | undefined {
        return this.#base;
    }

    private readonly representations: Map<string, Representation> = new Map();

    /**
     * Compiles a string or source instance and registers with the
     * module system and retains a mapping to it via the provided tag.
     * @param tag The tag name.
     * @param source The string or source instance.
     */
    prepare(tag: string, source: Source | string) {
        plugin({
            setup: ({ module }) => {
                module(tag, () => {
                    return {
                        contents:
                            typeof source === "string"
                                ? source
                                : source.compile(),
                        loader: "tsx",
                    };
                });
            },
        });
        const artifact = require(tag) as Artifact;
        const representation = new Representation(artifact);
        this.representations.set(tag, representation);
    }

    watch() {
        // Set up watcher
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
                warn("compositor", `No representation found for '${tag}'`);
                return;
            }
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
                    return resolve(path);
                }
            }
        }
    }
}
