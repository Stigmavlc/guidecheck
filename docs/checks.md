# Checks and limits

GuideCheck compares explicit structure. Someone who understands both languages still needs to read the guides.

| Rule | Level | What it reports |
| --- | --- | --- |
| missing-counterpart | Error | A configured English or Spanish document is absent. |
| mapped-section | Error | A named heading is absent or occurs more than once in its edition. |
| section-order | Warning | Mapped headings appear in a different order from the configuration. |
| section-count | Warning | The editions have different numbers of headings. |
| section-structure | Warning | Corresponding heading positions differ in level or section number. |
| duplicate-number | Error | A numbered heading repeats a number in the same document. |
| heading-level | Warning | A heading jumps more than one level from the preceding heading. |
| section-reference | Error | English or Spanish prose names a section number absent from that document. |
| glossary | Warning | Paired prose contains a configured avoided term. |
| missing-file | Error | A relative link points outside the loaded Markdown files. |
| missing-anchor | Error | A link names an absent GitHub style heading anchor. |
| invalid-local-link | Error | A local link has invalid encoding, a rooted path or escapes the set. |
| unchecked-local-target | Warning | A relative link names a target other than a Markdown document. |
| unsupported-link | Warning | A link uses a scheme outside the local check. |

Section count and positional structure warnings are prompts for review. An extra introduction or a deliberate reorganisation may be appropriate. Map the headings you actually require rather than assuming equal counts mean equal coverage.

## Numbered references

The checker recognises references such as `section 4`, `sections 2.1`, `apartado 3` and `sección 5`. It looks for numbered Markdown headings in the same document. It does not understand ranges, plural lists, natural language descriptions or references to a numbered section in another file. For those cases use an explicit link and inspect the wording yourself.

## Terminology

Glossary rules match text nodes with Unicode word boundaries. They skip code spans, fenced code and link destinations. A preferred term is a house choice, not a translation recommendation. Synonyms and inflections must be listed explicitly. There is no grammatical, semantic or translation model.

## Links

Links are resolved within the loaded Markdown set, relative to the source document. Heading anchors follow `github-slugger`, including Unicode and repeated headings. Standard defined Markdown reference links are supported. A missing named reference definition stays literal Markdown text in the parser and is not diagnosed.

Images, raw HTML links, explicit HTML anchor IDs, generated site routes, MDX, external URL availability and non-Markdown assets are outside the check. An ordinary link to a non-Markdown target produces an unchecked target warning, without claiming that an asset is missing. Load every linked Markdown document you want checked; an omitted file and an actually absent file look the same to this tool. Rooted paths are rejected because no website root is assumed.

## Reports

Each finding records its source file, one based line number, rule, severity, message and source excerpt. Some also link to a related document and line. JSON includes all loaded source documents, headings and findings; Markdown includes findings and their source excerpts. The timestamp describes when the check ran, not the date of the documents.

Findings describe the loaded snapshot. They are cleared when the set or configuration changes. The app does not edit your original files or retain a result across reloads.
