import { Root, parseHtml, printHtml, transformAst } from "./ast";
import { Template } from "./template";

export class View {
    root: Root;
    constructor(public template: Template) {
        this.root = parseHtml(template.presentation);
    }

    transform(env: Record<string, unknown>): Root {
        return transformAst(structuredClone(this.root), (node) => {
            if (node.type === "element") {
                for (const attr of node.attrs) {
                    attr.value = interpolate(this.template, env, attr.value);
                }
            }
            if (node.type === "text") {
                node.content = interpolate(this.template, env, node.content);
            }
            return node;
        }) as Root;
    }

    async render(env: Record<string, unknown>): Promise<string> {
        return await printHtml(this.transform(env));
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
