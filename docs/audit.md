# Audit of the reference plugin (`text-to-audio` 2.3.22)

Audited from the local checkout at `wp-content/plugins/text-to-audio` (branch `main`,
HEAD `fb401f21`, release 2.3.22), not from the GitHub default branch. The checkout had
local modifications to `CLAUDE.md` and `package-lock.json` only; it was not changed by
this project apart from that documentation file.

## Licence

* `text-to-audio` is GPL-3.0 (`LICENSE.txt`, plugin header `GPL-3.0+`).
* It vendors `speak-tts` (MIT) under `admin/js/tts/speak-tts/`.
* WPXERO Text to Speech does **not** copy source files, markup or styles from the
  reference plugin or from `speak-tts`. It is an independent reimplementation of the
  same product idea, informed by reading the reference code. Both new plugins are
  released under GPL-3.0-or-later so that they remain licence-compatible with the work
  that informed them, and the readmes credit the reference project.

## Feature inventory and decisions

| Reference feature | Decision | Edition |
| --- | --- | --- |
| Browser-native speech (`speechSynthesis`) via `speak-tts` wrapper | Reimplement: small typed engine, no wrapper library, one engine for every player on the page | Free |
| Play / pause / resume / stop button | Retain and improve: explicit state machine, honest status text, ARIA live region | Free |
| Sentence chunking (`sentence-splitter.js`) | Reimplement: chunking avoids Chrome's long-utterance cut-off; typed + unit-tested | Free |
| Voice / speed selection | Retain and improve: async `voiceschanged` handling, language-based fallback, no hard-coded "Google UK English Female" default | Free |
| Auto insertion before/after content | Retain and improve: duplicate-render guard, main-query/in-the-loop checks, no feeds/REST/admin | Free |
| Per-post / tag / category exclusion | Per-post toggle in Free; term rules in Pro | Free + Pro |
| Shortcodes `[tta_listen_btn]` / `[atlasvoice]` | Reimplement as `[wpxero_text_to_speech]` (new slug, documented attributes) | Free |
| Gutenberg block | Reimplement as `wpxero-text-to-speech/player` with `block.json` + dynamic render | Free |
| Button customisation (colours, sizes, labels, many "players") | Reimplement as a small set of layouts + CSS custom properties | Layouts 2 in Free, rest in Pro |
| Read-along highlighting (`highlighter.js`, DOM wrapping) | Reimplement with the CSS Custom Highlight API (no DOM mutation), sentence fallback | Pro |
| Selection reading (`selection-control.js`) | Reimplement as an unobtrusive "Listen to selection" button | Pro |
| CSS-selector picker / AtlasVoice "step rail", staging/Go Live mode | Replace with validated exclusion and content-root selectors in settings | Pro |
| Text aliases (pronunciation rules) | Defer | – |
| Listening analytics (`/track`, `/insights`), geolocation via `icanhazip.com` | Remove: telemetry and a third-party IP lookup are out of scope and privacy-hostile | – |
| AtlasAiDev telemetry client (`libs/AtlasAiDev`) | Remove | – |
| Remote "Atlas plugins" list fetched in admin | Remove | – |
| Runtime translation-pack downloader (GitHub) | Remove: WordPress.org language packs cover a hosted plugin | – |
| Cloud voices, MP3 generation, Google Cloud Storage (Pro) | Out of scope for this release (prompt boundary) | – |
| WooCommerce support | Reimplement as optional Pro integration | Pro |
| Caching-plugin JS exclusions (`TTA_Hooks`) | Defer: new player is a small, dependency-free script that minifiers handle | – |
| Onboarding wizard | Replace with an Overview checklist computed from real settings | Free |
| Settings export/import | New | Pro |
| Per-post overrides | New | Pro |

## Weaknesses found and how the new code addresses them

1. **Three build systems** (Laravel Mix + Gulp + `@wordpress/scripts`) and a bundled
   React 17 + React-Bootstrap admin. → One `@wordpress/scripts` webpack build; React and
   `@wordpress/*` are externals supplied by WordPress.
2. **No automated tests** (`npm test` exits 1). → Vitest unit tests for the engine,
   extraction, chunking, validation and Pro features; WP-CLI integration tests against
   a real WordPress install; package verification script.
3. **Global mutable state on the frontend** (`window.TTS`, `window.TextToSpeech`
   overwritten per button, singletons keyed by the first button). → One namespaced
   `window.TTSR` API object, per-player instances, a single shared speech engine.
4. **Unprefixed global PHP functions** (`add_listen_button`, `is_pro_plugin_exists`)
   and very large procedural files (`helpers.php` 1.4k lines, `TTA_Helper.php` 2.4k). →
   Namespaced classes (`TTSR\…`, `TTSRP\…`) with single responsibilities.
5. **Remote requests** (IP lookup, plugin list, translation downloads, telemetry). →
   None in either plugin.
6. **Tight free↔pro coupling** through dozens of `tts_*/tta_*/atlasvoice_*` filters and
   probing other plugins' directories on disk. → A small versioned contract
   (`TTSR_API_VERSION`) documented in `docs/integration-api.md`.
7. **Hard-coded voice name** and English-only defaults. → Default voice resolved from
   site locale, then any available voice.
8. **DOM wrapping for highlighting** changes page markup and can break themes. → CSS
   Custom Highlight API ranges; nothing is inserted into the article.
