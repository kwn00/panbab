import assert from "node:assert/strict";
import test from "node:test";
import { copyMenuImage } from "./copy-menu-image";

const imageUrl = "https://cafeptthumb-phinf.pstatic.net/menu.jpg";

test("copying fails cleanly when this environment cannot write an image to the clipboard", async () => {
  await assert.rejects(copyMenuImage(imageUrl), /clipboard-unavailable/);
});

test("a clipboard that refuses the image returns a failed promise", async () => {
  const previousNavigator = globalThis.navigator;
  const previousItem = globalThis.ClipboardItem;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      clipboard: {
        write() {
          throw new Error("clipboard-refused");
        },
      },
    },
  });
  globalThis.ClipboardItem = class {
    constructor() {}
  } as unknown as typeof ClipboardItem;
  try {
    await assert.rejects(copyMenuImage(imageUrl), /clipboard-refused/);
  } finally {
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: previousNavigator });
    if (previousItem === undefined) {
      Reflect.deleteProperty(globalThis, "ClipboardItem");
    } else {
      globalThis.ClipboardItem = previousItem;
    }
  }
});
