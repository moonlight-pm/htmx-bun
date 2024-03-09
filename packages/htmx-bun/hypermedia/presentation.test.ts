import { expect, test } from "bun:test";
import { Context } from "~/server/context";
import { Director } from "./director";
import { MarkdownSource } from "./kinds/markdown/source";
import { PartialSource } from "./kinds/partial/source";

const director = new Director();

test("representation present", () => {
    director.prepare("alpha", new MarkdownSource("# Hello"));
    const alphaR = director.represent("alpha")!;
    const alphaP = alphaR.present({} as Context, {});
    expect(alphaP).toBeDefined();
});

const source1 = `
const gift = "Joy";

<h1>{gift}</h1>
`;
test("render simple", async () => {
    director.prepare("beta", new PartialSource(source1));
    expect(
        await director.render("beta", {} as Context, {}, { trim: true }),
    ).toBe("<h1>Joy</h1>");
});

const source2 = `
interface Attributes {
    gift: string;
    chapter: number;
}

<p>
    <a chapter="{typeof chapter} {chapter}">{gift}</a>
</p>
`;
test("render attributes", async () => {
    director.prepare("gamma", new PartialSource(source2));
    expect(
        await director.render(
            "gamma",
            {} as Context,
            { gift: "Temperance", chapter: 5 },
            { trim: true },
        ),
    ).toBe(`<p><a chapter="number 5">Temperance</a></p>`);
});

test("flow each", async () => {
    director.prepare(
        "delta",
        new PartialSource(`<a mx-each={[1,2]} mx-as="i">{i}</a>`),
    );
    expect(
        await director.render("delta", {} as Context, {}, { trim: true }),
    ).toBe("<a>1</a><a>2</a>");
});

director.prepare(
    "todo-list",
    new PartialSource(`
const items = [
    { id: 1, name: "Love" },
    { id: 2, name: "Joy" },
    { id: 3, name: "Peace" },
];

<ul>
    <todo-item mx-each={items} mx-as="item" id={item.id} name={item.name} />
</ul>
`),
);

director.prepare(
    "todo-item",
    new PartialSource(`
interface Attributes {
    id: number;
    name: string;
}

<li id={id}>{name}</li>
`),
);

test("render todo list", async () => {
    const html = await director.render(
        "todo-list",
        {} as Context,
        {},
        { trim: true },
    );
    expect(html).toBe(
        `<ul><li id="1">Love</li><li id="2">Joy</li><li id="3">Peace</li></ul>`,
    );
});
