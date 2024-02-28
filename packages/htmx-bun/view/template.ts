import { TemplateRegister } from "./register";
import { View } from "./view";

export interface TemplateModule extends Record<string, unknown> {
    presentation: string;
}

export class Template {
    constructor(
        public register: TemplateRegister,
        public tag: string,
        public path: string,
        public module: TemplateModule,
    ) {}

    get presentation() {
        return this.module.presentation;
    }

    present() {
        return new View(this);
    }

    extracts(): Extract[] {
        // console.log(this.module.presentation);
        const results = [];
        const re = /\$ext\d+/g;
        let match: RegExpExecArray | null;
        while ((match = re.exec(this.module.presentation)) !== null) {
            results.push({
                name: match[0],
                fn: this.module[match[0]] as () => unknown,
            });
        }
        return results;
    }
}

interface Extract {
    name: string;
    fn: () => unknown;
}
