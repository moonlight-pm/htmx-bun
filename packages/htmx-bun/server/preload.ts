import { Identifier, Parser } from "acorn";
import { BunPlugin, plugin } from "bun";
import yaml from "js-yaml";

export const viewLoader: BunPlugin = {
    name: "Montana View Loader",
    setup: ({ onLoad }) => {
        onLoad({ filter: /\.part$/ }, async (args) => {
            const text = await Bun.file(args.path).text();
            let match = text.match(/<server>([\s\S]+)<\/server>/);
            let source = match ? match[1] : "";
            const presentation = text.replace(
                /<server>([\s\S]+)<\/server>/,
                "",
            );
            const transpiler = new Bun.Transpiler({ loader: "ts" });
            source = transpiler.transformSync(source);
            // console.log(source);

            const ast = Parser.parse(source, {
                ecmaVersion: 2020,
                sourceType: "module",
            });

            Bun.write("ast.yaml", yaml.dump(ast));

            const rval = [];

            for (const node of ast.body) {
                if (node.type === "ImportDeclaration") {
                    for (const specifier of node.specifiers) {
                        if (specifier.type === "ImportSpecifier") {
                            if (specifier.imported.type === "Identifier") {
                                rval.push(
                                    (specifier.imported as Identifier).name,
                                );
                            }
                        }
                    }
                }
                if (node.type === "VariableDeclaration") {
                    for (const declaration of node.declarations) {
                        if (declaration.id.type === "Identifier") {
                            rval.push((declaration.id as Identifier).name);
                        }
                    }
                }
            }

            const imports = [];

            while (true) {
                match = source.match(/import ([\s\S]+) from "([\s\S]+)";\n/);
                if (!match) {
                    break;
                }
                imports.push(match[0]);
                source = source.replace(match[0], "");
            }

            source = `
                    ${imports.join("")}

                    export default async function () {
                        ${source}
                        return {
                            env: { ${rval.join(", ")} },
                            presentation: \`
                                ${presentation}
                            \`
                        }
                    }
                `;
            // console.log(source);
            return { contents: source, loader: "js" };
        });
    },
};

plugin(viewLoader);

console.log("Loaded Montana View Loader");
