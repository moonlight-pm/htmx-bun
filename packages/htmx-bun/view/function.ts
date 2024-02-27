export interface TemplateModule {
    default: TemplateFunction;
    presentation: string;
}

export interface TemplateFunctionReturn {
    mark: null;
}

export type TemplateFunction = () => Promise<TemplateFunctionReturn>;
