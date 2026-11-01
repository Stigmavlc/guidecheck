import { describe, it, expect } from "vitest";
import {
  checkSet,
  readConfiguration,
  validateDocuments,
  inferConfiguration,
  pathKey,
} from "../src/checker";
const empty = { pairs: [], glossary: [] };
const file = (path: string, content: string) => ({ path, content });
describe("references", () => {
  it("reports the exact source line for a missing document", () => {
    expect(checkSet([file("a.md", "# A\n\n[Next](b.md)")], empty).findings[0]).toMatchObject({
      rule: "missing-file",
      file: "a.md",
      line: 3,
    });
  });
  it("resolves Unicode anchors, parent paths and duplicate slugs", () => {
    expect(
      checkSet(
        [
          file("en/a.md", "[A](../es/b.md#configuraci%C3%B3n)\n[B](../es/b.md#configuración-1)"),
          file("es/b.md", "# Configuración\n# Configuración"),
        ],
        empty,
      ).findings,
    ).toEqual([]);
  });
  it("ignores fenced code and inline code for prose rules", () => {
    const r = checkSet(
      [
        file(
          "a.md",
          "```md\n# 1. Hidden\n[bad](no.md)\n```\n`section 99`\n# 2. Real\nSee section 3.",
        ),
      ],
      empty,
    );
    expect(r.headings["a.md"]).toHaveLength(1);
    expect(r.findings.map((f) => f.rule)).toEqual(["section-reference"]);
  });
  it("resolves reference links and does not fetch external URLs", () => {
    expect(
      checkSet(
        [
          file(
            "a.md",
            "[site][r]\n\n[r]: https://example.org/private\n\n[local][l]\n\n[l]: #title\n\n# Title",
          ),
        ],
        empty,
      ).findings,
    ).toEqual([]);
  });
  it("rejects escaping paths and invalid encoding", () => {
    expect(
      checkSet([file("a.md", "[out](../../secret.md)\n[bad](%FF.md)")], empty).findings.map(
        (f) => f.rule,
      ),
    ).toEqual(["invalid-local-link", "invalid-local-link"]);
  });
  it("finds repeated numbers, heading jumps and numbered references", () => {
    expect(
      checkSet(
        [file("a.md", "# 1. Start\n#### 2. Deep\n## 2. Repeat\nSee section 4 and apartado 8.")],
        empty,
      ).findings.map((f) => f.rule),
    ).toEqual(["heading-level", "duplicate-number", "section-reference", "section-reference"]);
  });
  it("supports setext headings and formatted title anchors", () => {
    expect(
      checkSet([file("a.md", "A **bold** title\n=====\n[there](#a-bold-title)")], empty).findings,
    ).toEqual([]);
  });
  it("points to the line containing each reference in a multiline paragraph", () => {
    const r = checkSet(
      [file("a.md", "# 1. Start\n\nRead the guide.\nSee section 7.\nThen section 8.")],
      empty,
    );
    expect(r.findings.map((f) => ({ line: f.line, excerpt: f.excerpt }))).toEqual([
      { line: 4, excerpt: "See section 7." },
      { line: 5, excerpt: "Then section 8." },
    ]);
  });
  it("does not turn an unchecked image into a missing document error", () => {
    expect(
      checkSet([file("a.md", "# Guide\n![Diagram](images/diagram.png)")], empty).findings,
    ).toEqual([]);
  });
  it("warns about uncheckable download links without declaring the asset missing", () => {
    const r = checkSet([file("a.md", "[Download](manual.pdf)")], empty);
    expect(r.findings[0]).toMatchObject({ rule: "unchecked-local-target", severity: "warning" });
  });
  it("does not reinterpret rooted links as nested relative links", () => {
    const r = checkSet([file("en/a.md", "[root](/b.md)"), file("en/b.md", "# B")], empty);
    expect(r.findings[0].rule).toBe("invalid-local-link");
  });
});
describe("paired documents", () => {
  it("reports a missing language counterpart", () => {
    const files = [file("guide.en.md", "# Start")];
    expect(checkSet(files, inferConfiguration(files)).findings[0].rule).toBe("missing-counterpart");
  });
  it("checks missing mapped headings and their explicit order", () => {
    const r = checkSet(
      [file("a.en.md", "# Start\n## Finish"), file("a.es.md", "# Fin\n## Inicio")],
      {
        pairs: [
          {
            en: "a.en.md",
            es: "a.es.md",
            sections: [
              { en: "Start", es: "Inicio" },
              { en: "Finish", es: "Fin" },
              { en: "Missing", es: "Falta" },
            ],
          },
        ],
        glossary: [],
      },
    );
    expect(r.findings.filter((f) => f.rule === "mapped-section")).toHaveLength(2);
    expect(r.findings.some((f) => f.rule === "section-order")).toBe(true);
  });
  it("does not pretend structural equality means a correct translation", () => {
    const r = checkSet([file("a.en.md", "# Cat"), file("a.es.md", "# Perro")], {
      pairs: [{ en: "a.en.md", es: "a.es.md", sections: [] }],
      glossary: [],
    });
    expect(r.findings).toEqual([]);
    expect(r.scope).toContain("No translation quality");
  });
  it("checks glossary word boundaries without matching code or word fragments", () => {
    const r = checkSet(
      [
        file("a.en.md", "# Start\nJob line. Pipeline. `job line`"),
        file("a.es.md", "# Inicio\nLa cola antigua. Colaboración."),
      ],
      {
        pairs: [{ en: "a.en.md", es: "a.es.md", sections: [] }],
        glossary: [
          { language: "en", preferred: "queue", avoid: ["line"] },
          { language: "es", preferred: "cola", avoid: ["cola antigua"] },
        ],
      },
    );
    expect(r.findings.filter((f) => f.rule === "glossary")).toHaveLength(2);
  });
  it("locates every glossary occurrence on its real source line", () => {
    const r = checkSet(
      [file("a.en.md", "# Start\nA line.\nAnother line."), file("a.es.md", "# Inicio")],
      {
        pairs: [{ en: "a.en.md", es: "a.es.md", sections: [] }],
        glossary: [{ language: "en", preferred: "queue", avoid: ["line"] }],
      },
    );
    expect(r.findings.filter((f) => f.rule === "glossary").map((f) => f.line)).toEqual([2, 3]);
  });
});
describe("input boundaries", () => {
  it("rejects duplicate normalised paths and paths above the set", () => {
    expect(() => validateDocuments([file("a.md", ""), file("./a.md", "")])).toThrow("Duplicate");
    expect(() => pathKey("../a.md")).toThrow("leaves");
  });
  it("rejects unknown configuration fields and repeated pair members", () => {
    expect(() => readConfiguration('{"pairs":[],"glossary":[],"typo":1}')).toThrow("Unknown");
    expect(() =>
      readConfiguration(
        '{"pairs":[{"en":"a.md","es":"b.md","sections":[]},{"en":"a.md","es":"c.md","sections":[]}],"glossary":[]}',
      ),
    ).toThrow("only one");
  });
  it("rejects incomplete and oversized inputs before parsing", () => {
    expect(() => readConfiguration("{}")).toThrow("arrays");
    expect(() => checkSet([file("a.md", "x".repeat(200001))], empty)).toThrow("exceeds");
  });
});
