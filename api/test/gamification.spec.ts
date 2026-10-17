import * as fs from "fs";
import * as path from "path";
import { SIGN_IDS } from "../src/catalog";

const front = path.join(__dirname, "../../lib");
const norm = (f: string) => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");

describe("paridad front/api", () => {
  const has = fs.existsSync(path.join(front, "gamification.ts"));
  (has ? it : it.skip)("gamification.ts es idéntico en front y API", () => {
    expect(norm(path.join(__dirname, "../src/progress/gamification.ts"))).toBe(norm(path.join(front, "gamification.ts")));
    expect(norm(path.join(__dirname, "../src/progress/types.ts"))).toBe(norm(path.join(front, "types.ts")));
  });
  (has ? it : it.skip)("el catálogo de la API coincide con lib/signs.ts", () => {
    const ids = [...norm(path.join(front, "signs.ts")).matchAll(/\{ id: "([a-z-]+)", glosa:|^\s*\["([a-z-]+)", "[A-ZÁÉÍÓÚÑ ]+",/gm)].map(m => m[1] ?? m[2]);
    expect(ids).toEqual(SIGN_IDS);
  });
});
