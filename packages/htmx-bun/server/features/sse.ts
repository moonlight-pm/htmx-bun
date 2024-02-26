import { dirname } from "path";
import { ServerFeature } from ".";

export default function (): ServerFeature {
    return {
        name: "sse",
        async fetch(request) {
            const url = new URL(request.url);

            if (url.pathname === "/_sse") {
                const file = Bun.file(
                    `${dirname(require.resolve("htmx.org"))}/ext/sse.js`,
                );
                return new Response(file, {
                    headers: {
                        "Content-Type": file.type,
                    },
                });
            }
        },
        element(element) {
            if (element.tag === "head") {
                element.append("script", {
                    type: "module",
                    src: "/_sse",
                    defer: "",
                });
            }
        },
    };
}
