import { expect, test } from "bun:test";
import { TemplateRegister } from "./register";

test("extracts()", async () => {
    const register = new TemplateRegister("./view/fixtures");
    await register.initialize();
    const template = register.get("todo-item");
    const extracts = template.extracts();
    expect(extracts.length).toEqual(2);
});
