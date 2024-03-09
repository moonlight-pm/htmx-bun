import { expect, test } from "bun:test";
import { Director } from "~/hypermedia/director";
import { Context } from "~/server/context";
import { PartialSource } from "./source";

const director = new Director();

const source1 = `
const gift = "Joy";

<h1>{gift}</h1>
`;
test("render simple", async () => {
    director.prepare("joy", new PartialSource(source1));
    const rep = director.represent("joy")!;
    const pres = rep.present({} as Context, {});
    await pres.activate();
    expect(pres.render()).toBe("<h1>Joy</h1>\n");
});

// import { expect, test } from "bun:test";
// import { Compositor } from "..";

// const register = new Compositor("./view/__fixtures__");

// const todoList = `
// const items = [
//     { id: 1, name: "Love" },
//     { id: 2, name: "Joy" },
//     { id: 3, name: "Peace" },
//     { id: 4, name: "Patience" },
//     { id: 5, name: "Kindness" },
//     { id: 6, name: "Goodness" },
//     { id: 7, name: "Faithfulness" },
//     { id: 8, name: "Gentleness" },
//     { id: 9, name: "Self-control" },
// ];

// <ul>
//     <todo-item mx-each={items} mx-as="item" id={item.id} name={item.name} />
// </ul>
// `;
// test("render", async () => {
//     const view = await register._present("todo-item");
//     const html = await view.render({ id: 1, name: "Luke" });
//     expect(html).toMatchSnapshot();
// });

// test("composition", async () => {
//     await register._present("widget");
//     const view = await register._present("container");
//     const html = await view.render();
//     expect(html).toMatchSnapshot();
// });

// test("interpolated composition", async () => {
//     await register._present("todo-list");
//     await register._present("todo-item");
//     const view = await register._present("index");
//     const html = await view.render();
//     expect(html).toMatchSnapshot();
// });

// test("local environment", async () => {
//     const view = await register._present("environ");
//     const html = await view.render();
//     expect(html).toMatchSnapshot();
// });

// test("attributes passed to local environment", async () => {
//     await register._present("attr");
//     const view = await register._present("passattr");
//     const html = await view.render();
//     expect(html).toMatchSnapshot();
// });
