import { SAXParser } from "parse5-sax-parser";
import { Template } from "./template";

export class View {
    constructor(public template: Template) {
        template.module;
        this.parse();
    }

    parse() {
        const parser = new SAXParser();
        parser.on("startTag", (tag) => {
            // console.log(tag);
        });
        parser.on("endTag", (tag) => {
            // console.log(tag);
        });
        parser.on("text", (text) => {});
        parser.on("doctype", (doctype) => {
            // console.log(doctype);
        });
        parser.on("comment", (comment) => {
            // console.log(comment);
        });
        parser.on("cdata", (cdata) => {
            // console.log(cdata);
        });
        parser.on("end", () => {
            // console.log("end");
        });
        parser.on("error", (error) => {
            // console.log(error);
        });
        parser.write(this.template.presentation);
        parser.end();
    }
}
