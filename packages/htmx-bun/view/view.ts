import {
    HtmlFragment,
    HtmlTransformer,
    parseHtml,
    printHtmlSyntaxTree,
    transformHtmlSyntaxTree,
} from "../lib/html";
import { Template } from "./template";

export class View {
    #assembled = false;
    #html: HtmlFragment;
    #locals: Record<string, unknown> = {};
    #attributes: Record<string, unknown> = {};

    constructor(public template: Template) {
        this.#html = parseHtml(template.html);
    }

    async render(attributes: Record<string, unknown> = {}): Promise<string> {
        if (!this.#assembled) {
            await this.assemble(attributes);
        }
        return await printHtmlSyntaxTree(this.#html);
    }

    async assemble(attributes: Record<string, unknown> = {}) {
        this.#attributes = attributes;
        this.#locals = await this.template.run(attributes);
        await transformHtmlSyntaxTree(this.#html, async (node) => {
            if (node.type === "element") {
                // Handling the 'for' attribute
                const iterator = node.attrs.find((attr) => attr.name === "for");
                if (iterator) {
                    // Matches something like "item of $ext1"
                    // const match = iterator.value.match(
                    //     /([^\s]+)\s+of\s+(\$exp\d+)/,
                    // );
                    // Matches something like "item of items"
                    const match = iterator.value.match(
                        /([^\s]+)\s+of\s+([^\s]+)/,
                    );
                    if (match) {
                        // const list = this.interpolationValue(
                        //     match[2],
                        // ) as unknown[];
                        const list = this.#locals[match[2]] as unknown[];
                        return list.map((item, i) => {
                            const child = structuredClone(node);
                            child.attrs = child.attrs.filter(
                                (attr) => attr.name !== "for",
                            );
                            for (const attr of child.attrs) {
                                attr.value = this.interpolate(attr.value, {
                                    [match[1]]: item,
                                });
                            }
                            return child;
                        });
                    }
                }
                const subtemplate = this.template.register.get(node.tag);
                if (subtemplate) {
                    const subview = subtemplate.present();
                    const subenv: Record<string, unknown> = {};
                    for (const attribute of subtemplate.attributes) {
                        const attr = node.attrs.find(
                            (it) => attribute.name === it.name,
                        );
                        if (attr) {
                            if (attribute.type === "number") {
                                subenv[attribute.name] = Number(attr.value);
                                continue;
                            }
                            subenv[attr.name] = attr.value;
                        }
                    }
                    await subview.assemble(subenv);
                    return subview.children;
                }
                for (const attr of node.attrs) {
                    attr.value = this.interpolate(attr.value);
                }
            } else if (node.type === "text") {
                node.content = this.interpolate(node.content);
            }
            return node;
        });
    }

    private interpolate(text: string, env: Record<string, unknown> = {}) {
        return text.replace(/\$exp\d+/g, (match) => {
            const value = this.interpolationValue(match, env);
            return (value as object).toString();
        });
    }

    private interpolationValue(
        exp: string,
        env: Record<string, unknown> = {},
    ): unknown {
        const expression = this.#locals[exp];
        if (expression) {
            return (expression as (env: Record<string, unknown>) => unknown)(
                Object.assign({}, this.#attributes, this.#locals, env),
            );
        }
    }

    private get children() {
        return this.#html.children;
    }

    async transform(transformer: HtmlTransformer) {
        await transformHtmlSyntaxTree(this.#html, transformer);
    }
}
