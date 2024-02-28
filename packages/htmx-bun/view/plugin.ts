import { plugin } from "bun";
import { Source } from "./source";

plugin({
    setup: ({ onLoad }) => {
        onLoad({ filter: /\.part$/ }, async (args) => {
            const source = new Source(args.path);
            const code = await source.compile();
            // XXX: "ts" loader is broken it seems, doesn't understand types.
            return { contents: code, loader: "tsx" };
        });
    },
});
