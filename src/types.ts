/**
 * Core types. Extensions can import them (type-only) from `@ttsr/admin-ui`.
 *
 * The PHP side is the source of truth for settings; FreeSettings mirrors
 * TTSR\Settings::schema(). Keep them in step.
 */
import type { ReactElement } from 'react';

export type Placement = 'before' | 'after' | string;

/** Free plugin settings (option `ttsr_settings`). */
export interface FreeSettings {
	auto_insert: boolean;
	post_types: string[];
	placement: Placement;
	include_title: boolean;
	layout: string;
	rate: number;
	pitch: number;
	voice: string;
	lang: string;
	allow_voice_select: boolean;
	allow_rate_select: boolean;
	delete_data_on_uninstall: boolean;
}

export interface PlayerLabels {
	listen: string;
	pause: string;
	resume: string;
	stop: string;
}

export interface Option {
	value: string;
	label: string;
	/** Short tag shown with the option in the settings app, e.g. "Pro". */
	badge?: string;
}

/**
 * Per-player configuration, serialised by TTSR\Renderer into the
 * `data-ttsr-config` attribute and read by the frontend player.
 */
export interface PlayerConfig {
	id: string;
	source: 'auto' | 'shortcode' | 'block' | 'preview' | string;
	postId: number;
	title: string;
	includeTitle: boolean;
	layout: string;
	lang: string;
	voice: string;
	rate: number;
	pitch: number;
	allowVoiceSelect: boolean;
	allowRateSelect: boolean;
	showStop: boolean;
	showStatus: boolean;
	showProgress: boolean;
	/** `parent`: read the element the player sits in; `closest`: nearest article-like ancestor. */
	scope: 'parent' | 'closest';
	/** Optional CSS selector list for the elements to read (Pro). */
	contentSelector: string;
	/** CSS selectors whose matches are never read (Pro). */
	excludeSelectors: string[];
	labels: PlayerLabels;
	/** Free-form data added by extensions through the `ttsr_player_config` filter. */
	extensions: Record< string, unknown >;
}

/** Strings the player needs, localised once per page. */
export interface PlayerStrings {
	ready: string;
	loading: string;
	playing: string;
	paused: string;
	stopped: string;
	finished: string;
	empty: string;
	unsupported: string;
	error: string;
	voice: string;
	speed: string;
	defaultVoice: string;
	progress: string;
	region: string;
	matchingLanguage: string;
	otherLanguages: string;
}

export type PlayerState =
	| 'idle'
	| 'playing'
	| 'paused'
	| 'finished'
	| 'error'
	| 'unsupported'
	| 'empty';

export interface AdminSection {
	id: string;
	label: string;
	/** `core` sections are rendered by Free; extensions add their own group names. */
	group: string;
	order: number;
	render: () => ReactElement | null;
	/** Navigation icon: a name from the `Icon` set of `@ttsr/admin-ui`. */
	icon?: string;
	/** Whether the section has unsaved changes; marks it in the navigation. */
	isDirty?: () => boolean;
	/**
	 * Shows the live player preview next to the section. A string replaces
	 * the preview's description.
	 */
	preview?: boolean | string;
}
