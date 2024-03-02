import { expect, test } from "bun:test";
import { TemplateRegister } from "./register";

const register = new TemplateRegister("./view/__fixtures__");
await register.initialize();

test("render", async () => {
    const view = register.get("todo-item").present();
    const html = await view.render({ id: 1, name: "Luke" });
    expect(html).toBe(`<li id="1">Luke</li>\n`);
});

test("composition", async () => {
    const view = register.get("container").present();
    const html = await view.render();
    expect(html).toBe("<div>\n    <div>Widget</div>\n</div>\n");
});

test("interpolated composition", async () => {
    const view = register.get("root").present();
    const html = await view.render();
    expect(html).toBe(
        `<html>\n    <body>\n        <ul>\n            <li id="1">Love</li>\n            <li id="2">Joy</li>\n            <li id="3">Peace</li>\n            <li id="4">Patience</li>\n            <li id="5">Kindness</li>\n            <li id="6">Goodness</li>\n            <li id="7">Faithfulness</li>\n            <li id="8">Gentleness</li>\n            <li id="9">Self-control</li>\n        </ul>\n    </body>\n</html>\n`,
    );
});

test("local environment", async () => {
    const view = register.get("environ").present();
    const html = await view.render();
    expect(html).toBe("<div>He first loved us.</div>\n");
});

test("attributes passed to local environment", async () => {
    const view = register.get("passattr").present();
    const html = await view.render();
    expect(html).toBe(
        "<div>And He is before all things, and in Him all things hold together.</div>\n",
    );
});
