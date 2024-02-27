import { test } from "bun:test";
import { TemplateRegister } from "./register";

test("View:parse", async () => {
    const register = new TemplateRegister("./view/fixtures");
    await register.initialize();
    // const view = register.get("todo-item").present();
});
