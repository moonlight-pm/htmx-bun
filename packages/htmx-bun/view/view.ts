import {
    HtmlFragment,
    HtmlTransformer,
    createHtmlFragment,
    parseHtml,
    printHtmlSyntaxTree,
    transformHtmlSyntaxTree,
} from "../lib/html";
import { Template } from "./template";

export class View {
    root: HtmlFragment;
    assembled?: boolean;

    constructor(public template: Template) {
        this.root = parseHtml(template.presentation);
    }

    async render(env: Record<string, unknown> = {}): Promise<string> {
        if (!this.assembled) {
            this.assemble(env);
        }
        return await printHtmlSyntaxTree(this.root);
    }

    assemble(env: Record<string, unknown> = {}) {
        this.root = transformHtmlSyntaxTree(
            structuredClone(this.root),
            (node) => {
                if (node.type === "element") {
                    const forAttr = node.attrs.find(
                        (attr) => attr.name === "for",
                    );
                    if (forAttr) {
                        // Matches something like "item of $ext1"
                        const match = forAttr.value.match(
                            /([^\s]+)\s+of\s+(\$ext\d+)/,
                        );
                        if (match) {
                            const list = this.template.interpolate(
                                match[2],
                                env,
                            );
                            const listFragment = createHtmlFragment(
                                ...Array.from(
                                    { length: list.length },
                                    (_, i) => {
                                        const child = structuredClone(node);
                                        child.attrs = child.attrs.filter(
                                            (attr) => attr.name !== "for",
                                        );
                                        const fragmentEnv = Object.assign(
                                            { [match[1]]: list[i] },
                                            env,
                                        );
                                        for (const attr of child.attrs) {
                                            attr.value = interpolate(
                                                this.template,
                                                fragmentEnv,
                                                attr.value,
                                            );
                                        }
                                        return child;
                                    },
                                ),
                            );
                            return listFragment;
                        }
                    }
                    const subtemplate = this.template.register.get(node.tag);
                    if (subtemplate) {
                        const subview = subtemplate.present();
                        const subenv: Record<string, unknown> = {};
                        for (const name of Object.keys(
                            subtemplate.module.meta.attributes,
                        )) {
                            const attr = node.attrs.find(
                                (attr) => attr.name === name,
                            );
                            if (attr) {
                                subenv[attr.name] = attr.value;
                            }
                        }
                        return subview.assemble(subenv);
                    }
                    for (const attr of node.attrs) {
                        attr.value = interpolate(
                            this.template,
                            env,
                            attr.value,
                        );
                    }
                }
                if (node.type === "text") {
                    node.content = interpolate(
                        this.template,
                        env,
                        node.content,
                    );
                }
                return node;
            },
        ) as HtmlFragment;
        return this.root;
    }

    transform(transformer: HtmlTransformer) {
        this.root = transformHtmlSyntaxTree(
            this.root,
            transformer,
        ) as HtmlFragment;
    }
}

function interpolate(
    template: Template,
    env: Record<string, unknown>,
    str: string,
) {
    return str.replace(/\$ext\d+/g, (match) =>
        template.interpolate(match, env),
    );
}
