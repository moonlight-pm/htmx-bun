import { TemplateModule } from "./function";
import { TemplateRegister } from "./register";
import { View } from "./view";

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
}
