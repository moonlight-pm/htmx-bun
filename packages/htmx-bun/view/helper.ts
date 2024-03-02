export class Helper {
    #oobs: Oob[] = [];
    #cancelRender = false;

    // constructor() {}

    oob(tag: string, attributes: Record<string, unknown>) {
        this.#oobs.push({ tag, attributes });
    }

    get oobs() {
        return this.#oobs;
    }

    cancelRender() {
        this.#cancelRender = true;
    }

    get renderCanceled() {
        return this.#cancelRender;
    }
}

interface Oob {
    tag: string;
    attributes: Record<string, unknown>;
}
