=== Text to Speech Reader ===
Tags: text to speech, accessibility, read aloud, listen, speech
Requires at least: 6.6
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPL-3.0-or-later
License URI: https://www.gnu.org/licenses/gpl-3.0.html

Add an accessible Listen button that reads your posts aloud with the visitor's own browser voices. No account, API key or external service.

== Description ==

Text to Speech Reader adds a small player to your content. When a visitor presses **Listen**, their browser reads the article aloud using the speech voices built into their device (the Web Speech API).

* **Works out of the box** – the player appears on single posts as soon as the plugin is active.
* **No external services** – nothing is sent to a speech provider and the plugin makes no remote requests. There is nothing to sign up for.
* **Accessible controls** – real buttons with visible focus, keyboard support, status announcements for screen readers and 44 px touch targets.
* **Play, pause, resume and stop**, with an optional voice and speed choice for visitors.
* **Automatic insertion** before or after the content of posts, pages and other public content types, with a per-post opt-out in the editor.
* **Block and shortcode** – place the player exactly where you want it.
* **Reads only the article** – scripts, navigation, forms, hidden elements and the player itself are skipped.
* **Lightweight** – one small script and stylesheet, loaded only on pages that show a player. React is used only in the admin screen.
* **Respects visitors** – no tracking. A visitor's voice and speed choice is remembered only in their own browser.

= Browser support and limitations =

Speech uses the browser's Web Speech API. Voices, languages and quality depend on the visitor's operating system and browser, so the same page can sound different on different devices. Some in-app browsers and privacy-focused browsers have no speech support; the player then says so instead of showing controls that do nothing. Some browsers stop speaking when the tab is in the background or the screen locks. Pausing resumes from the last word the browser reported; voices that do not report word positions resume from the start of the current sentence.

Some browser vendors provide online voices that process the text on their own servers. That is a browser feature outside the plugin's control.

This plugin helps visitors who prefer to listen. It does not by itself make a site conform to WCAG or any other accessibility standard.

== Installation ==

1. Install and activate the plugin from **Plugins › Add New**, or upload the ZIP file there.
2. Open a single post: the player is already shown before the content.
3. Go to **Speech Reader** in the admin menu to choose content types, placement, layout, voice and speed. The Overview screen has a live preview.

== Frequently Asked Questions ==

= How do I add the player somewhere specific? =

Use the **Text to Speech Player** block, or the shortcode:

`[text_to_speech_reader]`

Optional attributes:

* `layout` – `standard` or `button` (extensions may add more)
* `title` – `yes` or `no`: read the post title first
* `lang` – a language code such as `en-GB`
* `rate` – speed from `0.5` to `2`

Example: `[text_to_speech_reader layout="button" title="no" rate="1.25"]`. Invalid values are ignored and the settings are used instead. A post that contains the block or shortcode does not also get the automatic player.

= How do I hide the player on one post? =

In the block editor, open the **Text to Speech Reader** panel in the post sidebar and turn off **Show the automatic player**.

= The player says "There is no text to read here" =

The automatic player reads the element it is placed in. Some themes put the article text somewhere else; place the block or shortcode inside the content instead.

= Which voice will visitors hear? =

The preferred voice set under **Voice and playback** if their device has it; otherwise a voice for the reading language, then the device default.

= Does the plugin store personal data? =

No. It makes no external requests and stores no visitor data on your server. A visitor's voice and speed choice is kept in their browser's local storage.

= What happens to my settings when I deactivate or delete the plugin? =

They are kept, so you can reactivate later. To remove them when deleting the plugin, turn on **Delete settings when the plugin is deleted** under General.

== Changelog ==

= 1.0.0 =
* First release.

== Credits ==

Text to Speech Reader is an independent reimplementation inspired by the GPL-licensed "Text To Speech TTS Accessibility" plugin (text-to-audio) by Azizul Hasan / AtlasAiDev. It does not include that plugin's code.

The settings screen bundles these third-party assets:

* Figtree font by Erik Kennedy, SIL Open Font License 1.1.
* Geist Mono font by Vercel, SIL Open Font License 1.1.
* Material Symbols icons by Google, Apache License 2.0.
