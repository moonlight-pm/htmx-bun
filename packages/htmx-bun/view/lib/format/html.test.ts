import { expect, test } from "bun:test";
import { formatHtml } from "./html";

test("formatHtml", async () => {
    const ugly = `
    <div>
                  <span>
        Muppim, Huppim and Ard
        </span>
      </div>
    `;
    const pretty = await formatHtml(ugly);
    expect(pretty).toBe(
        "<div>\n    <span>Muppim, Huppim and Ard</span>\n</div>\n",
    );
});
