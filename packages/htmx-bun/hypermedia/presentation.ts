import { warn } from "~/lib/log";
import { Context } from "~/server/context";
import { Attributes, Representation } from ".";
import { Director } from "./director";
import {
    expressDefinedAttributesToStrings,
    transformExpressionsIntoStrings,
} from "./expressor";
import { transformFlowEach } from "./flow";
import {
    HtmlElement,
    HtmlFragment,
    PrintHtmlOptions,
    htmlTags,
    printHtml,
    simpleTransformHtml,
} from "./template";

export class Presentation {
    constructor(
        private readonly director: Director,
        protected readonly representation: Representation,
        protected readonly template: HtmlFragment,
        protected readonly context: Context,
        protected readonly attributes: Attributes,
    ) {}

    /**
     * Execute the action tied to this presentation with the contained server context
     * and the attributes passed into this presentation instance.
     */
    async activate(): Promise<void> {
        Object.assign(
            this.template.scope,
            this.attributes,
            await this.representation.artifact.action(
                this.context,
                this.attributes,
            ),
        );
    }

    async compose() {
        transformFlowEach(this.template);
        await this.transformComposedHypermedia();
    }

    /**
     * Transforms a copy of the template evaluating all expressions into
     * strings, returning the final html string.
     * @returns
     */
    render(options: Partial<PrintHtmlOptions> = {}) {
        transformExpressionsIntoStrings(this.template);
        return printHtml(this.template, options);
    }

    /**
     * Recursively searches the html ast and resolves embedded hypermedia tags,
     * replacing them with their composed presentation.
     */
    async transformComposedHypermedia() {
        const queue: [HtmlElement, Presentation][] = [];
        simpleTransformHtml(this.template, (node) => {
            if (node.type === "element") {
                if (htmlTags.includes(node.tag)) {
                    return node;
                }
                const rep = this.director.represent(node.tag);
                if (!rep) {
                    warn(
                        "presentation",
                        `No representation found for '${node.tag}'`,
                    );
                    return node;
                }
                const attributes = expressDefinedAttributesToStrings(
                    node,
                    rep.artifact.attributes,
                );
                queue.push([node, rep.present(this.context, attributes)]);
            }
            return node;
        });
        for (const [node, presentation] of queue) {
            await presentation.activate();
            await presentation.compose();
            // XXX: If the node has any content, that would go in a slot, deal with that here.
            // Note, the attached presentation contents will have an isolated scope.
            node.parent.children.splice(
                node.parent.children.indexOf(node),
                1,
                ...presentation.template.children,
            );
        }
    }
}
