export interface ServerOptions {
    port?: number;
    features?: ServerOptionsFeatures;
}

interface ServerOptionsFeatures {
    static?: boolean;
    tailwind?: boolean;
    htmx?: boolean;
    sse?: boolean;
    dev?: boolean;
}

const options = {
    port: 4321,
    features: {
        tailwind: true,
        htmx: true,
        sse: true,
        static: true,
        dev: import.meta.env.NODE_ENV === "development",
    },
};

export default options;
