import { expect, test } from "bun:test";
import { TemplateRegister } from "./register";

test("View:parse", async () => {
    const register = new TemplateRegister("./view/fixtures");
    await register.initialize();
    const view = register.get("todo-item").present();
    const html = await view.render({ id: 1, name: "Luke" });
    expect(html).toBe(`<li id="1">Luke</li>\n`);
});
