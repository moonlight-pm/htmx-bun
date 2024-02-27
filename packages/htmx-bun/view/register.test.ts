import { expect, test } from "bun:test";
import { unlinkSync } from "fs";
import { TemplateRegister } from "./register";

test("ViewRegister:initialize", async () => {
    const register = new TemplateRegister("./view/fixtures");
    await register.initialize();
    expect(register.get("root")).toBeDefined();
});

test("ViewRegister:reload", async () => {
    const testPath = "./view/fixtures/reload.part";
    const testContent1 = "<div>Reload Test 1</div>\n";
    const testContent2 = "<div>Reload Test 2</div>\n";
    await Bun.write(testPath, testContent1);
    const register = new TemplateRegister("./view/fixtures");
    await register.initialize();
    expect(register.get("reload").presentation).toBe(testContent1);
    await Bun.write(testPath, testContent2);
    await register.reload("reload");
    expect(register.get("reload").presentation).toBe(testContent2);
    unlinkSync(testPath);
});
