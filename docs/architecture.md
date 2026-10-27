# Architecture

## Feature matrix

| Area | Free (Text to Speech Reader) | Pro (Text to Speech Reader Pro) |
| --- | --- | --- |
| Speech | Browser `speechSynthesis`; play, pause, resume, stop; sentence chunking; voice fallback; status announcements | Uses the core engine through `window.TTSR` (no second engine) |
| Visitor controls | Voice and speed selects (each optional) | Show/hide Stop, status text, progress |
| Layouts | Standard, Button only | Expanded, Compact, Minimal; colours, radius, labels |
| Placement | Before/after content; posts, pages, public CPTs; per-post opt-out | After paragraph N; floating mini player |
| Manual placement | Block `text-to-speech-reader/player`, shortcode `[text_to_speech_reader]` | Per-post overrides panel |
| Content | Reads the article; skips scripts, forms, nav, hidden, `aria-hidden`, `.screen-reader-text`, `[data-ttsr-skip]` | Content selector, exclusion selectors, category/tag and word-count rules |
| Reading aids | – | Read-along highlighting, read selected text |
| Integrations | – | WooCommerce product pages (optional) |
| Settings | REST-backed React admin, validation, reset, live preview, setup checklist | Sections inside the same admin; JSON export/import (dry run, merge/replace) |
| Data | Keep on uninstall unless opted in | Same, separately |

Deferred (not in this release): pronunciation aliases, analytics, cloud
voices, MP3 generation, licence/update service, and a classic-editor meta
box for posts and pages (WooCommerce products have their own: Pro adds a
"Listen player" box to the product edit screen that sets the core's
per-post opt-out).

## Plugin layout

The two plugins are separate, standard WordPress plugins, each in its own
directory under `wp-content/plugins` with its own build, tests and package:

```
text-to-speech-reader/        Core (this plugin)
  text-to-speech-reader.php   includes/  blocks/  build/  languages/  uninstall.php
  src/{player,admin,admin-ui,block,editor,utils}  tests/{js,php}  bin/  docs/
text-to-speech-reader-pro/    Add-on; requires the core
  text-to-speech-reader-pro.php  includes/  build/  languages/  uninstall.php
  src/{frontend,admin,editor}  tests/{js,php}  bin/
```

Pro contains no copy of core code. At runtime it uses the core's PHP hooks
and services, `window.TTSR` on the frontend and the core's admin UI library
(`ttsr-admin-ui`, `window.ttsr.adminUi`) in wp-admin. During development it
imports core *types* from the sibling checkout (`../text-to-speech-reader`,
or `TTSR_CORE_DIR`); those imports are erased at build time.

React and `@wordpress/*` are externals supplied by WordPress (see each
`build/*.asset.php`). The public player is plain TypeScript with no runtime
dependencies (~17 KB minified); React is used only in wp-admin.

## Core plugin

PHP (namespace `TTSR`, prefix `ttsr_`), one class per responsibility:

* `Plugin` – service container; fires `ttsr_loaded`.
* `Settings` – option `ttsr_settings`; schema, defaults, per-field validation.
  Values supplied by an extension that is no longer active (layout,
  placement, post type) are preserved on save but never newly accepted.
* `Rest_Controller` – `ttsr/v1/settings` (GET/POST) and `/settings/reset`,
  `manage_options` + the standard REST cookie nonce.
* `Renderer` – the player container plus its JSON config; a per-request
  guard prevents a second automatic player for the same post.
* `Content_Integration` – `the_content` at priority 20 (after blocks and
  shortcodes), only for the main query of a singular view; never in feeds,
  REST, admin, archives or password-protected posts. Enqueues assets in the
  head on pages that will show a player.
* `Shortcode`, `Block` (dynamic block from `blocks/player/block.json`),
  `Post_Meta` (`_ttsr_disable_auto`), `Admin`, `Assets`, `Lifecycle`.

Frontend (`src/player`):

* `extract.ts` – walks the content roots and builds text blocks with a map
  back to text nodes. Never mutates the DOM.
* `chunks.ts` – sentence chunks (`Intl.Segmenter` with a regex fallback),
  long sentences split under 200 characters.
* `engine.ts` – the single `SpeechEngine`. Pause cancels and remembers the
  last word boundary; resume restarts from there. A generation counter makes
  callbacks from cancelled utterances no-ops. A watchdog reports speech that
  never starts.
* `player.ts` – builds the controls inside the server-rendered container
  (hidden until then, so no dead buttons without JavaScript).
* `api.ts` – `window.TTSR`.

Admin UI library (`src/admin-ui`, handle `ttsr-admin-ui`): the shared
admin components, the settings store helper (`useSyncExternalStore` over
REST) and validation helpers, built as a library exposed as
`window.ttsr.adminUi`. The settings app and extensions import it as
`@ttsr/admin-ui`, mapped to that global at build time.

Admin (`src/admin`): hash-routed sections, each bound to the external
settings store; drafts survive section changes, unsaved changes are flagged
in the navigation and on `beforeunload`, and the preview mounts the real
frontend player against a sample article.

## Pro plugin

* `Plugin` boots on `ttsr_loaded` only when `Dependency::incompatibility()`
  is empty; otherwise `Dependency` explains the problem on the Dashboard and
  Plugins screens. The `Requires Plugins` header lets WordPress enforce the
  dependency at activation time too.
* `Frontend` – adds layouts/placements, applies appearance and feature flags
  through `ttsr_player_config` / `ttsr_player_style`, enqueues the Pro
  frontend on `ttsr_enqueue_player_assets`.
* `Placement`, `Content_Rules`, `Overrides` (`_ttsrp_overrides`, REST schema),
  `WooCommerce`, `Portability`, `Rest_Controller` (`ttsrp/v1`), `Admin`.
* Frontend (`src/frontend`): `read-along.ts`, `selection.ts`, `floating.ts`,
  plus the layout CSS.
* Admin (`src/admin`): registers sections through `ttsr.admin.*` filters
  and builds them from the core's `ttsr-admin-ui` components.

## Security notes

* Every REST route requires `manage_options`; meta writes require
  `edit_post` for that post.
* Settings are validated key by key; unknown keys are rejected (REST) or
  reported and ignored (import). Imports are atomic and default to a dry run.
* Output is escaped at render time (`esc_attr` on the JSON config, style
  properties limited to `--ttsr-*` names and a strict value pattern).
* CSS selectors are restricted to a selector character set, reject `{ } < ; \ @ /*`,
  and are only passed to `querySelectorAll`/`matches` inside `try`.
* No remote requests, telemetry or remote code. Visitors' voice/speed choice
  is stored only in their browser's `localStorage`.

## Data lifecycle

* Activation adds defaults with `add_option` (never overwrites).
* `Lifecycle::maybe_upgrade()` / `TTSRP\Plugin::maybe_upgrade()` record the
  installed version and are the place for future migrations.
* `uninstall.php` deletes options and the plugin's post meta only when the
  site opted in; on multisite it handles each site.
