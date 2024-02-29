import { error } from "~/lib/log";
import { TemplateRegister } from "./register";
import { Meta } from "./source";
import { View } from "./view";

/**
 * Represents a template module.
 */
export interface TemplateModule extends Record<string, unknown> {
    meta: Meta;
    presentation: string;
}

/**
 * Represents a template used for rendering views.
 */
export class Template {
    constructor(
        public register: TemplateRegister,
        public tag: string,
        public path: string,
        public module: TemplateModule,
    ) {}

    /**
     * Gets the presentation of the template.
     */
    get presentation() {
        return this.module.presentation;
    }

    /**
     * Interpolates the specified name in the template using the provided environment.
     * @param name - The name to interpolate.
     * @param env - The environment object.
     * @returns The interpolated string.
     */
    interpolate(name: string, env: Record<string, unknown>) {
        const fn = this.module[name] as (
            env: Record<string, unknown>,
        ) => string;
        if (fn) {
            return fn(env);
        }
        // XXX: Raise error
        error(`No interpolation function found for ${name}`);
        return "";
    }

    /**
     * Creates a new view using this template.
     * @returns The created view.
     */
    present() {
        return new View(this);
    }

    /**
     * Discovers and extracts the interpolation functions from the template module.
     * @returns An array of extract objects.
     */
    extracts(): Extract[] {
        const results = [];
        const extRe = /\$ext\d+/g;
        let match: RegExpExecArray | null;
        while ((match = extRe.exec(this.module.presentation)) !== null) {
            results.push({
                name: match[0],
                fn: this.module[match[0]],
            } as Extract);
        }
        return results;
    }
}

/**
 * Represents an extracted template interpolation.
 * @interface Extract
 */
interface Extract {
    name: string;
    fn: () => unknown;
}
