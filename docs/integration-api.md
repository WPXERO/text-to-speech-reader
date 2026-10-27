# Integration API (extension contract)

Text to Speech Reader (the core) exposes a small, versioned contract. Text to
Speech Reader Pro uses only what is listed here and never edits core files.
Third-party extensions may use it too.

## Versioning

| Constant | Defined by | Meaning |
| --- | --- | --- |
| `TTSR_VERSION` | core | Core release, e.g. `1.0.0`. |
| `TTSR_API_VERSION` | core | Contract version. Incremented **only** for breaking changes to anything in this document. Currently `1`. |
| `window.TTSR.apiVersion` | core (JS) | Same number on the frontend. |
| `TTSRP_REQUIRES_FREE` | Pro | Oldest core release the Pro release was checked against. |
| `TTSRP_REQUIRES_API` | Pro | Contract version Pro is written for. |

Pro boots only if `TTSR_VERSION >= TTSRP_REQUIRES_FREE` **and**
`TTSR_API_VERSION === TTSRP_REQUIRES_API`; otherwise it stays inactive and
shows a notice (see `TTSRP\Dependency`). Its frontend script also checks
`window.TTSR.apiVersion` before doing anything.

Additive changes (new hooks, new optional config keys) do not change the API
version. Removing or changing the meaning of anything below does.

### Compatibility matrix

| Pro | Requires core | Contract | Verified with |
| --- | --- | --- | --- |
| 1.0.0 | ≥ 1.0.0 | API 1 | core 1.0.0 on WordPress 7.1.3 / PHP 8.2 |

Add a row for every Pro release, listing only combinations that were actually tested.

## Boot

```php
add_action( 'ttsr_loaded', function ( TTSR\Plugin $core ) {
	if ( TTSR_API_VERSION !== 1 ) {
		return;
	}
	// $core->settings(), $core->renderer(), $core->assets(), $core->content()
} );
```

`ttsr_loaded` fires on `plugins_loaded` (priority 5), regardless of plugin
load order. If it never fires, the core is missing or inactive.

## PHP filters and actions

| Hook | Type | Arguments | Purpose |
| --- | --- | --- | --- |
| `ttsr_loaded` | action | `TTSR\Plugin $core` | Core ready. |
| `ttsr_player_layouts` | filter | `array $layouts` (id ⇒ label) | Register layouts. You must ship CSS for `.ttsr-player--{id}`. |
| `ttsr_placements` | filter | `array $placements` (id ⇒ label) | Register automatic-insertion placements. Implement them with `ttsr_insert_player`. |
| `ttsr_post_types` | filter | `array $types` (name ⇒ label) | Post types offered for automatic insertion. |
| `ttsr_should_auto_insert` | filter | `bool $insert, WP_Post $post` | Final say on automatic insertion. The core passes its own decision; Pro applies per-post overrides at priority 20 and content rules at 30. |
| `ttsr_auto_placement` | filter | `string $placement, WP_Post $post` | Placement for one post. |
| `ttsr_insert_player` | filter | `null $result, string $content, string $player, string $placement, WP_Post $post` | Return the full content with the player inserted to take over, or `null` for before/after. |
| `ttsr_player_config` | filter | `array $config, array $context` | Player configuration (see below). Put extension data under `extensions.{prefix}`. `$context` = `source`, `post`, `args`. |
| `ttsr_player_style` | filter | `array $vars, array $config, array $context` | CSS custom properties for the player element. Only `--ttsr-*`/`--ttsrp-*` names with simple values are printed. |
| `ttsr_player_html` | filter | `string $html, array $config, array $context` | Final markup. |
| `ttsr_enqueue_player_assets` | action | – | Player assets were enqueued on a public page; enqueue your frontend assets here so they load only where a player exists. |
| `ttsr_admin_enqueue` | action | – | On the settings screen, before the app is enqueued. Register your admin script here. |
| `ttsr_admin_script_dependencies` | filter | `string[] $handles` | Add your admin script handle so it runs before the app mounts. |
| `ttsr_admin_data` | filter | `array $data` | Boot data of the admin app. Describe yourself in `extensions[]` (`id`, `name`, `version`). |
| `ttsr_upgraded` | action | `string $from, string $to` | After install or update of the core. |

### Services available from `ttsr()`

* `settings()` – `TTSR\Settings`: `get()`, `value( $key )`, `defaults()`,
  `update( array $input, bool $replace = false )` (returns settings or a
  `WP_Error` with per-field `errors`), `sanitize( $input, $base )`,
  `layouts()`, `placements()`, `eligible_post_types()`, `resolve_layout()`.
* `renderer()` – `TTSR\Renderer`: `render( array $args )`, `has_rendered( $post_id )`.
* `assets()` – `TTSR\Assets`: `enqueue_player()`; constant `PLAYER_HANDLE`.

Constants `TTSR\Post_Meta::DISABLE_AUTO`, `TTSR\Content_Integration::SHORTCODE`
and `TTSR\Content_Integration::BLOCK` name the per-post opt-out meta key, the
shortcode and the block.

### Player configuration

Serialised as JSON into `data-ttsr-config` and read by the frontend:

`id`, `source` (`auto`, `shortcode`, `block`, or an extension's own, e.g.
`woocommerce`), `postId`, `title`, `includeTitle`, `layout`, `lang`, `voice`,
`rate`, `pitch`, `allowVoiceSelect`, `allowRateSelect`, `showStop`,
`showStatus`, `showProgress`, `scope` (`parent` | `closest`),
`contentSelector`, `excludeSelectors`, `labels` (`listen`, `pause`,
`resume`, `stop`) and `extensions` (object).

## Frontend: `window.TTSR`

Provided by the `ttsr-player` script handle. Declare it as a dependency.

```ts
TTSR.apiVersion            // 1
TTSR.version               // core version
TTSR.isSupported()         // speechSynthesis available
TTSR.on( event, handler )  // returns an unsubscribe function
TTSR.players()             // mounted players
TTSR.mount( element, { config?, contentRoot? } )
TTSR.unmount( element )
TTSR.speak( text, { lang?, rate? } ) // => { stop(), done: Promise<'finished'|'stopped'|'error'> } | null
TTSR.stop()
TTSR.voices()
TTSR.rangeFor( block, start, end )   // DOM Range for block text offsets, or null
```

There is one speech engine per page: starting any player or `speak()` ends
whatever was playing.

Events:

| Event | Payload |
| --- | --- |
| `mount` | `{ player }` |
| `state` | `{ player, state }` – `idle`, `playing`, `paused`, `finished`, `error`, `unsupported`, `empty` |
| `chunk` | `{ player, index, chunk, block }` – a sentence is about to be spoken; `block` is `null` for the title |
| `boundary` | `{ player, chunk, block, start, end }` – word boundary reported by the voice; offsets are in `block.text` |
| `destroy` | `{ player }` |

A player handle exposes `element`, `config`, `state`, `blocks`, `chunks`,
`contentRoots()`, `play()`, `pause()`, `resume()`, `stop()` and `toggle()`.
Blocks are read-only snapshots of the article text with a mapping back to
the original text nodes; the article DOM is never modified by the core.

Elements with `data-ttsr-skip` are never read.

## Admin app (JavaScript, `@wordpress/hooks`)

Add filters from a script registered on `ttsr_admin_enqueue` and listed in
`ttsr_admin_script_dependencies`:

| Filter | Signature |
| --- | --- |
| `ttsr.admin.sections` | `( sections: AdminSection[], context ) => AdminSection[]` – `{ id, label, group, order, render }`, optionally `icon`, `isDirty`, `preview` (see below) |
| `ttsr.admin.groups` | `( labels: Record<group, GroupLabel> ) => …` – navigation headings for your group; a label is a string or `{ label, badge? }` |
| `ttsr.admin.previewConfig` | `( config, context ) => config` – adjust the live preview player |
| `ttsr.admin.previewStyle` | `( vars, context ) => vars` – CSS custom properties for the preview |
| `ttsr.admin.previewStores` | `( stores, context ) => stores` – stores whose changes should refresh the preview |

`context` provides `data` (boot data), `freeStore` (core settings store),
`navigate( sectionId )` and `components.PlayerPreview`.

Optional section fields (additive, no API version change):

* `icon` – name of an icon from the library's `Icon` set, shown in the navigation.
* `isDirty()` – return true while the section has unsaved changes; the
  navigation marks it. `hasChanges( store, keys )` from `ttsr-admin-ui` helps.
* `preview` – `true` shows the live player preview beside the section; a
  string also replaces the preview's description. Sections no longer need
  to render `components.PlayerPreview` themselves.

Navigation groups: `start` (Overview), `core` (Settings), extension groups in
registration order, then `resources` (Help). Describe yourself in
`ttsr_admin_data` `extensions[]`; an optional `badge` string is shown next to
the page title. Options in `layouts` and `placements` may carry a `badge`
string, shown on the choice cards (Pro tags its own layouts this way).

Player markup: the core adds a decorative `.ttsr-player__meter`
(`.ttsr-player__eq` and `.ttsr-player__track > .ttsr-player__fill`) to the
controls; its width follows the `--ttsr-progress` custom property, which the
player sets while a session is active. Layouts may show, hide or reorder it.

### Admin UI library: `ttsr-admin-ui`

The core registers the script and style handle `ttsr-admin-ui` on `init`.
It exposes `window.ttsr.adminUi` with:

* Components: `PageHeader`, `SectionHeader`, `SettingsPanel`, `FieldGrid`,
  `HelpText`, `ToggleField`, `SelectField`, `TextField`, `NumberField`,
  `RangeField`, `CheckboxGroupField`, `ChoiceField`, `SegmentedField`,
  `ColorField`, `StatusNotice`, `StatusPill`, `Badge`, `Button`, `Icon`,
  `Spinner`, `LoadingState`, `EmptyState`, `PreviewArea`, `ResetConfirm`,
  `SaveActions`. They are plain HTML controls styled by the library's
  stylesheet; `SaveActions` saves and discards every registered store
  together and handles Ctrl/⌘+S.
* Settings stores: `createSettingsStore( { path, resetPath, initial,
  validate, messages } )`, the `useStore( store )` hook, and page-wide
  helpers over every created store: `registeredStores`, `useStoresSummary`,
  `useAnyStoreChange`, `saveAll`, `discardAll`, `hasChanges`.
* Validation helpers mirroring the PHP sanitisers: `isHexColor`, `clamp`,
  `checkSelector`, `validSelectors`, `changedKeys`, `SELECTOR_MAX_LENGTH`.

With `@wordpress/scripts`, import it as a module and let dependency
extraction map it to the global and the handle:

```js
new DependencyExtractionWebpackPlugin( {
	requestToExternal: ( request ) =>
		request === '@ttsr/admin-ui' ? [ 'ttsr', 'adminUi' ] : undefined,
	requestToHandle: ( request ) =>
		request === '@ttsr/admin-ui' ? 'ttsr-admin-ui' : undefined,
} );
```

The settings screen enqueues the `ttsr-admin-ui` style; components rendered
elsewhere (for example in the block editor) need `wp-components` styles
only. TypeScript types are in the core's `src/admin-ui/index.ts` and
`src/types.ts`.

## Block editor

The core registers `text-to-speech-reader/player` (dynamic, rendered by
`TTSR\Renderer`) and the `ttsr-document-settings` sidebar panel. Extensions
add their own `registerPlugin()` panels; they must not register another
block with the same name.
