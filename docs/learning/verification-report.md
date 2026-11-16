# Source and learning verification

Reviewed on 2026-11-16 against Freemy base commit `81c20095eee287a39b2cbe1cc1ec61f1847367ef`. Links are to original public material; no third-party code was installed or executed. A public repository does not by itself establish an open-source license, and dependencies and creative assets can have different terms.

## Verified open-source front-end entry points

- **Tree Appreciator** — [matching file](https://github.com/simonw/tools/blob/a285d172df23d622f7cbafdcba978733de244bde/tree-appreciator.html), [Apache-2.0 license](https://github.com/simonw/tools/blob/a285d172df23d622f7cbafdcba978733de244bde/LICENSE), [creator's description](https://simonwillison.net/2026/Oct/14/tree-appreciator/). The root file and author description identify the same work. Its external libraries and fonts can have their own licenses.
- **Battle Drones** — [front-end entry](https://github.com/simonw/battledrones/blob/ca4f13b36013e1980289046e731a295d2bf02a3e/src/main.ts), [creator's README](https://github.com/simonw/battledrones/blob/ca4f13b36013e1980289046e731a295d2bf02a3e/README.md), [Apache-2.0 license](https://github.com/simonw/battledrones/blob/ca4f13b36013e1980289046e731a295d2bf02a3e/LICENSE). The README points to the live game; the deployed page is a build, not a byte-identical source file.
- **REGOLITH** — [front-end entry](https://github.com/winchxyz/moon-rover/blob/f5f25ba6bf7477c612b408b265c9275a4fd1200d/src/main.js), [creator's README](https://github.com/winchxyz/moon-rover/blob/f5f25ba6bf7477c612b408b265c9275a4fd1200d/README.md), [MIT license](https://github.com/winchxyz/moon-rover/blob/f5f25ba6bf7477c612b408b265c9275a4fd1200d/LICENSE). The README links the live game and describes separate terms for dependencies.

## Public code without a confirmed license

- **Web-Bayan** — [specific directory](https://github.com/gbkorr/gbkorr/tree/main/bayan); its live HTML matches the checked revision `fd251ca7cdd3f6cc9bd857779015d8d4cc6886e6`. No applicable license was confirmed during this review; this is not a claim that no license can exist.
- **Harmonograph** and **Rosette** — their live HTML matches the respective files in revision `86ad33f7928bd6289b84ef9049c39a6d5bbc4fe0`. The repository license was not confirmed. The creator separately published the [Harmonograph prompt](https://github.com/MiaAI-Lab/Claude-Opus-5.5-100-HTML-Files/blob/main/097-harmonograph.txt) and [Rosette prompt](https://github.com/MiaAI-Lab/Claude-Opus-5.5-100-HTML-Files/blob/main/023-symmetry-painter.txt); these are author materials, not a code license.
- **Wawa School of Magic** — the matching [front-end entry](https://github.com/wass08/wfc-magic-school/blob/main/src/main.ts) and author identity were checked against the [original announcement](https://x.com/wawasensei/status/2121997847524766051), live interface and repository. A license was not confirmed. The announcement also links the [creator's tutorial video](https://www.youtube.com/watch?v=dUgVoS1NYws); the link is offered as creator guidance without claiming the video was independently watched in full.

## Restricted license and additional author material

- **HALDANE-4** — the [creator's repository](https://github.com/denisbondare/haldane-4) links to the live work. Its [CC BY-NC 4.0 license](https://github.com/denisbondare/haldane-4/blob/85fc5903e310efd9dd452a87ef2e9fa62fcd5223/LICENSE) covers repository code and assets and includes a noncommercial restriction. It is not included in the open-source filter.
- **FALL LINE** — the author provides the [original brief](https://github.com/Nipale-ai/opus-5-5-overnight-builds/blob/8d35d834bc3d62cb772ae9f75b95b89c9600ab82/briefs/fall-line-prompt-as-sent.md). The visible game HTML is a bundled output with no confirmed license; it is not presented as an open-source source tree.

## Search coverage and limits

Grok searched 12 existing work IDs and returned candidate-only records, including 9 with public-code leads. Its searches found no verified source match for Hydraulics, Learn Arduino or Null Range; this is a limited search result, not a declaration that those works are closed source. The raw candidate records and search log are retained in `data/candidates/source-discovery/`; the production catalog never reads that directory. The other works have not been comprehensively searched.

Each published resource preserves a work association, scope, availability, license status, evidence links and check date. Technology tags are limited to facts supported by the linked code or author documentation. The absence of a link or tag is not a negative judgment on a work.

## Bilingual learning notes

The first three Freemy notes were checked in both languages against the following fixed revisions. The exercises are independent suggestions, not claims about the authors' intent.

- **Tree Appreciator** — [random selection](https://github.com/simonw/tools/blob/a285d172df23d622f7cbafdcba978733de244bde/tree-appreciator.html#L453-L474), [tree generation and differences](https://github.com/simonw/tools/blob/a285d172df23d622f7cbafdcba978733de244bde/tree-appreciator.html#L3026-L3065), and [hit testing](https://github.com/simonw/tools/blob/a285d172df23d622f7cbafdcba978733de244bde/tree-appreciator.html#L3877-L3899). The linked file is Apache-2.0; external resources can have separate terms.
- **Harmonograph** — [oscillation parameters](https://github.com/MiaAI-Lab/Claude-Opus-5.5-100-HTML-Files/blob/86ad33f7928bd6289b84ef9049c39a6d5bbc4fe0/097-harmonograph.html#L310-L343) and [canvas drawing](https://github.com/MiaAI-Lab/Claude-Opus-5.5-100-HTML-Files/blob/86ad33f7928bd6289b84ef9049c39a6d5bbc4fe0/097-harmonograph.html#L392-L423). The repository's applicable code license remains unconfirmed.
- **Rosette** — [stroke coordinates and canvas](https://github.com/MiaAI-Lab/Claude-Opus-5.5-100-HTML-Files/blob/86ad33f7928bd6289b84ef9049c39a6d5bbc4fe0/023-symmetry-painter.html#L204-L215) and [rotation and reflection](https://github.com/MiaAI-Lab/Claude-Opus-5.5-100-HTML-Files/blob/86ad33f7928bd6289b84ef9049c39a6d5bbc4fe0/023-symmetry-painter.html#L305-L315). The repository's applicable code license remains unconfirmed.
