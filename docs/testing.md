# Testing

## Automated

Each plugin has its own test commands; run them in the plugin's directory.

| Command | What it covers |
| --- | --- |
| `npm run typecheck` | TypeScript (strict) for the plugin's sources and tests |
| `npm run lint:js` / `lint:css` | ESLint and Stylelint with the `@wordpress/scripts` configs |
| `npm run lint:php-syntax` | `php -l` on every PHP file |
| `npm run lint:php` | PHPCS: WordPress Coding Standards + PHPCompatibilityWP (PHP 7.4+) |
| `npm test` (core) | Vitest: chunking, extraction and range mapping, voice fallback, speech engine (pause/resume, cancellation, replacement, errors, start timeout), player states and accessibility attributes, multiple players, rapid clicks, unsupported browsers, settings store, validation helpers |
| `npm test` (Pro) | Vitest against the core's real player: read-along, selection reading, floating bar, preview styles, import file checks |
| `WP_CLI="wp --path=…" npm run test:wp` | Integration tests inside a real WordPress install (below) |
| `npm run verify-package` | ZIP structure, required files, no development files, `php -l` inside the archive, versions |

`npm run test:wp` switches plugin states by writing `active_plugins` and
restores the original value afterwards. Suites create and delete their own
posts and restore both plugins' options.

Core (`wpxero-text-to-speech`):

1. Core suite – settings defaults/validation, REST permissions and errors,
   automatic insertion and placement, feeds/archives/password protection,
   per-post opt-out, shortcode and block (including duplicate suppression),
   escaping, meta registration. Other active plugins are left as they are;
   it must pass with or without Pro.

Pro (`wpxero-text-to-speech-pro`):

1. The core suite again with Pro active (read from the core checkout), to
   show Pro does not change core behaviour.
2. Pro features: dependency check, extension points, settings validation,
   config/style output, after-paragraph placement, content rules, per-post
   overrides, export/import (dry run, merge, replace, atomic rejection,
   unknown keys, newer format), WooCommerce absent.
3. Pro without the core – no fatal error, nothing initialised, notice
   wording and placement, nonce-protected activation link.
4. Core after Pro is deactivated – stored Pro layout/placement fall back
   safely and are preserved for reactivation.

## Results for 1.0.0 (2026-10-27)

Environment: macOS, Node 26.9, PHP 8.4 CLI (tooling) / PHP 8.2 (site),
WordPress 7.1.3 (Local), Chrome.

* `npm run release` with `WP_CLI` set passed in both plugin directories:
  versions, production build, type check, ESLint, Stylelint, `php -l`,
  PHPCS (WPCS + PHPCompatibilityWP 7.4+), unit tests, integration tests,
  `.pot`, package and package verification.
* Vitest: core 43 tests, Pro 14 tests, all passed.
* WordPress integration: core suite 52 assertions; Pro run 52 + 57 + 11 + 8
  assertions. All passed.
* Plugin Check 2.1.0 (`--include-experimental`) on the unzipped packages:
  core – no errors or warnings. Pro – one warning that the required plugin
  `wpxero-text-to-speech` is not in the WordPress.org directory (expected
  until it is published).
* Browser check after moving to separate plugin directories (Chrome, as an
  administrator): settings screen loads `ttsr-admin-ui`, then Pro's admin
  script, then the core app, with all core and Pro sections; block editor
  registers the block and both sidebar panels; a post shows the player with
  `window.TTSR` API 1. No console errors from either plugin.
* Manual test in Chrome on 2026-10-26, before the move to separate
  directories (the player, read-along and selection code did not change):
  real speech playback, word boundaries and sentence/word highlighting,
  pause/resume from the last word, natural finish (state, labels and
  highlights reset), "Listen to selection" with a real mouse selection,
  floating mini player when the player scrolls away, 360 px wide layout
  without horizontal scrolling, 44 px buttons. Admin: live preview layout
  change, save round-trip with persisted option, client-side validation with
  the error linked through `aria-describedby`, discard. Block editor:
  override meta saved through the REST schema and applied on the front end.

## Not yet verified (needs another environment)

* Browsers other than desktop Chrome: Safari (macOS/iOS), Firefox, Edge,
  Chrome on Android. Expect differences in voices, word-boundary events and
  background-tab behaviour.
* Screen readers (VoiceOver, NVDA, JAWS) and Windows High Contrast / forced colours.
* WordPress versions below 7.1.3 (the declared minimum is 6.6, chosen because
  the bundles use `react-jsx-runtime` and `@wordpress/editor`'s
  `PluginDocumentSettingPanel`), PHP 7.4 at runtime (only checked statically
  with PHPCompatibility), multisite and uninstall on multisite.
* WooCommerce product pages and the product "Listen player" meta box in the
  real product editor (WooCommerce was not installed; the "absent" path and
  the meta box's save logic — nonce, capability, check/uncheck — are tested)
  and classic themes.
* Downloading an export file and importing through the browser file picker
  (the REST endpoints and client-side file checks are tested).
* "Listen to selection" with caret browsing (F7) and with screen readers.
  In Chrome, selecting a paragraph and pressing Tab focuses the button
  (it is placed right after the selected block) and Enter reads the
  selection; other browsers and assistive technology are not yet checked.

### Manual checklist for those

1. Install both ZIPs on a clean site; activate Free, open a post, press Listen.
2. Pause, resume, stop; change voice/speed while playing; open two posts in
   tabs and check only one speaks.
3. With Pro: enable read-along, selection reading and the floating player;
   test each in the browsers above.
4. Install WooCommerce, enable the integration, open a product with a short
   description and description; confirm one player that reads both.
   Tick "Hide the Listen player on this product" in the product's
   Listen player box, update, and confirm the player is gone; untick to
   bring it back.
5. Export settings, change a few, import with Merge and with Replace.
6. Deactivate Free while Pro is active: Pro must show its notice and the
   site must keep working. Delete both plugins with the data-removal options
   on and off and inspect `wp_options` / `wp_postmeta`.
