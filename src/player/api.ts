/**
 * The public frontend API, exposed as `window.TTSR`.
 *
 * This is the contract extensions (including WPXERO Text to Speech Pro)
 * build on. Bump API_VERSION, and the PHP constant TTSR_API_VERSION, for any
 * breaking change. See docs/integration-api.md.
 */
import type { PlayerConfig, PlayerStrings } from '../types';
import { splitText } from './chunks';
import { SpeechEngine, type UtteranceConstructor } from './engine';
import {
	Events,
	type EventMap,
	type EventName,
	type PlayerHandle,
} from './events';
import { rangeFor } from './extract';
import { Player } from './player';
import { resolveVoice, watchVoices } from './voices';

export const API_VERSION = 1;

export const DEFAULT_LABELS = {
	listen: 'Listen',
	pause: 'Pause',
	resume: 'Resume',
	stop: 'Stop',
};

export const DEFAULT_STRINGS: PlayerStrings = {
	ready: '',
	loading: 'Loading voices…',
	playing: 'Playing',
	paused: 'Paused',
	stopped: 'Stopped',
	finished: 'Finished',
	empty: 'There is no text to read here.',
	unsupported: 'Your browser does not support text to speech.',
	error: 'Speech could not be played in this browser.',
	voice: 'Voice',
	speed: 'Speed',
	defaultVoice: 'Default voice',
	progress: 'Part %1$d of %2$d',
	region: 'Listen to this content',
	matchingLanguage: 'Matching language',
	otherLanguages: 'Other languages',
};

export const DEFAULT_CONFIG: PlayerConfig = {
	id: '',
	source: 'shortcode',
	postId: 0,
	title: '',
	includeTitle: false,
	layout: 'standard',
	lang: '',
	voice: '',
	rate: 1,
	pitch: 1,
	allowVoiceSelect: false,
	allowRateSelect: false,
	showStop: true,
	showStatus: true,
	showProgress: false,
	scope: 'closest',
	contentSelector: '',
	excludeSelectors: [],
	labels: DEFAULT_LABELS,
	extensions: {},
};

export interface MountOptions {
	config?: Partial< PlayerConfig >;
	/** Read this element instead of discovering the content area. */
	contentRoot?: Element;
}

export interface SpeakHandle {
	stop: () => void;
	/** Resolves when speech ends for any reason. */
	done: Promise< 'finished' | 'stopped' | 'error' >;
}

export interface TTSRApi {
	readonly apiVersion: number;
	readonly version: string;
	readonly strings: PlayerStrings;
	isSupported: () => boolean;
	on: < K extends EventName >(
		name: K,
		handler: ( payload: EventMap[ K ] ) => void
	) => () => void;
	mount: (
		element: HTMLElement,
		options?: MountOptions
	) => PlayerHandle | null;
	unmount: ( element: HTMLElement ) => void;
	players: () => PlayerHandle[];
	/** Reads arbitrary text, ending any active player session. */
	speak: (
		text: string,
		options?: { lang?: string; rate?: number }
	) => SpeakHandle | null;
	stop: () => void;
	voices: () => SpeechSynthesisVoice[];
	rangeFor: typeof rangeFor;
}

function parseConfig( element: HTMLElement ): Partial< PlayerConfig > {
	try {
		const parsed = JSON.parse( element.dataset.ttsrConfig || '{}' );
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		return {};
	}
}

export function createApi(
	win: Window & typeof globalThis,
	settings: { version?: string; strings?: Partial< PlayerStrings > }
): TTSRApi {
	const strings = { ...DEFAULT_STRINGS, ...settings.strings };
	const supported =
		!! win.speechSynthesis &&
		typeof win.SpeechSynthesisUtterance === 'function';
	const engine = supported
		? new SpeechEngine(
				win.speechSynthesis,
				win.SpeechSynthesisUtterance as unknown as UtteranceConstructor
			)
		: null;
	const events = new Events();
	const players = new Map< HTMLElement, Player >();
	let voices: SpeechSynthesisVoice[] = [];

	if ( supported ) {
		watchVoices( win.speechSynthesis, ( list ) => {
			voices = list;
			players.forEach( ( player ) => player.updateVoices() );
		} );
	}

	const api: TTSRApi = {
		apiVersion: API_VERSION,
		version: settings.version ?? '',
		strings,
		isSupported: () => supported,
		on: ( name, handler ) => events.on( name, handler ),

		mount( element, options = {} ) {
			const existing = players.get( element );
			if ( existing ) {
				return existing;
			}
			const raw = { ...parseConfig( element ), ...options.config };
			const config: PlayerConfig = {
				...DEFAULT_CONFIG,
				...raw,
				labels: { ...DEFAULT_LABELS, ...raw.labels },
				excludeSelectors: Array.isArray( raw.excludeSelectors )
					? raw.excludeSelectors
					: [],
				extensions: raw.extensions ?? {},
			};
			const player = new Player( element, config, {
				engine,
				events,
				strings,
				voices: () => voices,
				contentRoot: options.contentRoot,
			} );
			players.set( element, player );
			player.updateVoices();
			events.emit( 'mount', { player } );
			return player;
		},

		unmount( element ) {
			const player = players.get( element );
			if ( player ) {
				players.delete( element );
				player.destroy();
			}
		},

		players: () => [ ...players.values() ],

		speak( text, options = {} ) {
			if ( ! engine ) {
				return null;
			}
			const lang =
				options.lang ?? win.document.documentElement.lang ?? '';
			const clean = text.replace( /\s+/g, ' ' ).trim();
			const chunks = splitText( clean, lang ).map( ( span ) => ( {
				text: clean.slice( span.start, span.end ),
				block: -1,
				start: span.start,
				end: span.end,
			} ) );
			const owner = {};
			let settle: (
				value: 'finished' | 'stopped' | 'error'
			) => void = () => {};
			const done = new Promise< 'finished' | 'stopped' | 'error' >(
				( resolve ) => {
					settle = resolve;
				}
			);
			if ( ! chunks.length ) {
				settle( 'finished' );
				return { stop: () => {}, done };
			}
			engine.start(
				owner,
				chunks,
				{
					voice: resolveVoice( voices, { voice: '', lang } ),
					lang,
					rate: options.rate ?? 1,
					pitch: 1,
				},
				{
					onFinish: () => settle( 'finished' ),
					onStop: ( reason ) =>
						settle( reason === 'error' ? 'error' : 'stopped' ),
				}
			);
			return {
				stop: () => {
					if ( engine.owner === owner ) {
						engine.stop( 'stopped' );
					}
				},
				done,
			};
		},

		stop: () => engine?.stop( 'stopped' ),
		voices: () => voices,
		rangeFor,
	};
	return api;
}
