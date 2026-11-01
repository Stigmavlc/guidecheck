# How GuideCheck works

Both entry points use `src/checker.ts`. The browser reads selected files; the command walks a local directory. They pass a bounded list of relative paths and UTF-8 source strings to the same checker.

1. Validate paths, sizes and duplicate filenames.
2. Parse Markdown with `remark-parse` and retain source positions.
3. Collect headings, section numbers, link definitions and GitHub style anchors.
4. Check references and numbering inside each file.
5. Compare each configured language pair and apply its language's glossary rules.
6. Return findings with source excerpts. The interface selects the corresponding source line; the command renders Markdown or JSON.

The interface displays source as React text. It does not insert the document as HTML, fetch its links or execute its code. File contents and configuration live in component state. Export creates a local browser download; the command uses exclusive file creation to preserve any existing destination.

`src/examples.ts` supplies the deliberately inconsistent synthetic pair shown at startup. `examples/good` and `examples/broken` provide command examples. The first run can infer pairs from `.en.md` and `.es.md` filenames, but explicit heading mappings are what make named section checks useful.

## Deliberate choices

The tool does not attempt machine translation or infer meaning. Missing content is detected only through heading counts, numbering or configured names. These are understandable checks whose result a reviewer can inspect.

Documents are not persisted by the app. This avoids an unnoticed local copy of private guidance, at the cost of requiring files to be loaded again after a reload. Exports are explicit and may contain private source text.

The static build uses the `/guidecheck/` base path for GitHub Pages. All application dependencies, fonts and icons are bundled. There is no server, account system, analytics script or document API.
