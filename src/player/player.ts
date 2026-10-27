/**
 * One player instance: builds its controls inside the server-rendered
 * container and drives the shared engine.
 */
import type { PlayerConfig, PlayerState, PlayerStrings } from '../types';
import { buildChunks, type Chunk } from './chunks';
import type { SpeechEngine } from './engine';
import type { Events, PlayerHandle } from './events';
import { extractBlocks, type TextBlock } from './extract';
import { groupVoices, resolveVoice } from './voices';
import { validSelectors } from '../utils/validation';

export const RATES = [ 0.75, 1, 1.25, 1.5, 1.75, 2 ];

const ICONS = {
	play: '<path d="M8 5.5v13l10.5-6.5z"/>',
	pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>',
	stop: '<path d="M6.5 6.5h11v11h-11z"/>',
};

const STORAGE_KEY = 'ttsr-preferences';

interface Preferences {
	voice?: string;
	rate?: number;
}

function readPreferences(): Preferences {
	try {
		const raw = window.localStorage.getItem( STORAGE_KEY );
		return raw ? ( JSON.parse( raw ) as Preferences ) : {};
	} catch {
		return {};
	}
}

function writePreferences( preferences: Preferences ) {
	try {
		window.localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify( preferences )
		);
	} catch {
		// Storage can be unavailable (private mode, blocked site data).
	}
}

function icon( name: keyof typeof ICONS ): SVGSVGElement {
	const svg = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
	svg.setAttribute( 'viewBox', '0 0 24 24' );
	svg.setAttribute( 'aria-hidden', 'true' );
	svg.setAttribute( 'focusable', 'false' );
	svg.setAttribute( 'class', 'ttsr-player__icon' );
	// Static, trusted markup defined above.
	svg.innerHTML = ICONS[ name ];
	return svg;
}

function el< K extends keyof HTMLElementTagNameMap >(
	tag: K,
	className: string,
	text = ''
): HTMLElementTagNameMap[ K ] {
	const node = document.createElement( tag );
	node.className = className;
	if ( text ) {
		node.textContent = text;
	}
	return node;
}

export interface PlayerDeps {
	engine: SpeechEngine | null;
	events: Events;
	strings: PlayerStrings;
	voices: () => SpeechSynthesisVoice[];
	/** Overrides content discovery, used by the admin preview. */
	contentRoot?: Element;
}

const ARTICLE_SELECTOR =
	'.entry-content, .wp-block-post-content, .post-content, .entry, article, main';

export class Player implements PlayerHandle {
	state: PlayerState = 'idle';
	blocks: TextBlock[] = [];
	chunks: Chunk[] = [];

	private extracted = false;
	private preferences: Preferences;
	private readonly toggleButton: HTMLButtonElement;
	private readonly toggleIcon: HTMLSpanElement;
	private readonly toggleLabel: HTMLSpanElement;
	private readonly stopButton: HTMLButtonElement | null = null;
	private readonly voiceSelect: HTMLSelectElement | null = null;
	private readonly rateSelect: HTMLSelectElement | null = null;
	private readonly status: HTMLParagraphElement;
	private readonly progress: HTMLParagraphElement | null = null;
	private readonly cleanups: Array< () => void > = [];

	constructor(
		readonly element: HTMLElement,
		readonly config: PlayerConfig,
		private readonly deps: PlayerDeps
	) {
		const { strings } = deps;
		this.preferences = readPreferences();
		element.textContent = '';
		element.classList.add( 'ttsr-player--ready' );

		const controls = el( 'div', 'ttsr-player__controls' );
		this.toggleButton = el(
			'button',
			'ttsr-player__button ttsr-player__toggle'
		);
		this.toggleButton.type = 'button';
		this.toggleIcon = el( 'span', 'ttsr-player__icon-wrap' );
		this.toggleLabel = el( 'span', 'ttsr-player__label' );
		this.toggleButton.append( this.toggleIcon, this.toggleLabel );
		controls.append( this.toggleButton );
		this.listen( this.toggleButton, 'click', () => this.toggle() );

		if ( config.showStop ) {
			const stop = el(
				'button',
				'ttsr-player__button ttsr-player__stop'
			);
			stop.type = 'button';
			stop.append(
				icon( 'stop' ),
				el( 'span', 'ttsr-player__label', config.labels.stop )
			);
			controls.append( stop );
			this.listen( stop, 'click', () => {
				const hadFocus = stop.ownerDocument.activeElement === stop;
				this.stop();
				if ( hadFocus ) {
					this.toggleButton.focus();
				}
			} );
			this.stopButton = stop;
		}

		// Decorative: an equaliser while speaking and a bar that fills as
		// the text is read (--ttsr-progress). Status text carries the state.
		const meter = el( 'span', 'ttsr-player__meter' );
		meter.setAttribute( 'aria-hidden', 'true' );
		const equaliser = el( 'span', 'ttsr-player__eq' );
		equaliser.append(
			...[ 0, 1, 2, 3 ].map( () => document.createElement( 'i' ) )
		);
		const track = el( 'span', 'ttsr-player__track' );
		track.append( el( 'span', 'ttsr-player__fill' ) );
		meter.append( equaliser, track );
		controls.append( meter );

		if ( config.allowVoiceSelect || config.allowRateSelect ) {
			const options = el( 'div', 'ttsr-player__options' );
			if ( config.allowVoiceSelect ) {
				const field = el( 'label', 'ttsr-player__field' );
				const select = el( 'select', 'ttsr-player__select' );
				field.append(
					el( 'span', 'ttsr-player__field-label', strings.voice ),
					select
				);
				options.append( field );
				this.listen( select, 'change', () => {
					this.preferences = {
						...this.preferences,
						voice: select.value,
					};
					writePreferences( this.preferences );
					this.applyOptions();
				} );
				this.voiceSelect = select;
			}
			if ( config.allowRateSelect ) {
				const field = el( 'label', 'ttsr-player__field' );
				const select = el( 'select', 'ttsr-player__select' );
				const rates = RATES.includes( config.rate )
					? RATES
					: [ ...RATES, config.rate ].sort( ( a, b ) => a - b );
				for ( const rate of rates ) {
					const option = new Option( `${ rate }×`, String( rate ) );
					select.append( option );
				}
				select.value = String( this.preferences.rate ?? config.rate );
				if ( ! select.value ) {
					select.value = String( config.rate );
				}
				field.append(
					el( 'span', 'ttsr-player__field-label', strings.speed ),
					select
				);
				options.append( field );
				this.listen( select, 'change', () => {
					this.preferences = {
						...this.preferences,
						rate: Number( select.value ),
					};
					writePreferences( this.preferences );
					this.applyOptions();
				} );
				this.rateSelect = select;
			}
			controls.append( options );
		}

		this.status = el( 'p', 'ttsr-player__status' );
		this.status.setAttribute( 'role', 'status' );
		if ( ! config.showStatus ) {
			this.status.classList.add( 'ttsr-player__status--visually-hidden' );
		}
		element.append( controls, this.status );

		if ( config.showProgress ) {
			this.progress = el( 'p', 'ttsr-player__progress' );
			this.progress.hidden = true;
			element.append( this.progress );
		}

		element.hidden = false;
		this.setState( deps.engine ? 'idle' : 'unsupported' );
	}

	/** Re-renders the voice list; called whenever the browser's voices change. */
	updateVoices() {
		const select = this.voiceSelect;
		if ( ! select ) {
			return;
		}
		const voices = this.deps.voices();
		const selected = select.value || this.preferences.voice || '';
		select.textContent = '';
		select.append( new Option( this.deps.strings.defaultVoice, '' ) );
		const groups = groupVoices( voices, this.config.lang );
		const addGroup = ( label: string, list: SpeechSynthesisVoice[] ) => {
			if ( ! list.length ) {
				return;
			}
			const group = document.createElement( 'optgroup' );
			group.label = label;
			for ( const voice of list ) {
				group.append(
					new Option(
						`${ voice.name } (${ voice.lang })`,
						voice.voiceURI
					)
				);
			}
			select.append( group );
		};
		addGroup( this.deps.strings.matchingLanguage, groups.matching );
		addGroup( this.deps.strings.otherLanguages, groups.other );
		select.value = voices.some( ( v ) => v.voiceURI === selected )
			? selected
			: '';
		select.disabled = voices.length === 0 || this.state === 'unsupported';
	}

	toggle() {
		switch ( this.state ) {
			case 'playing':
				this.pause();
				break;
			case 'paused':
				this.resume();
				break;
			default:
				this.play();
		}
	}

	play() {
		const engine = this.deps.engine;
		if ( ! engine ) {
			return;
		}
		if ( ! this.extracted ) {
			this.blocks = extractBlocks( this.contentRoots(), {
				exclude: validSelectors( this.config.excludeSelectors ),
			} );
			this.chunks = buildChunks(
				this.blocks,
				this.config.includeTitle ? this.config.title : '',
				this.config.lang
			);
			this.extracted = true;
		}
		if ( this.blocks.length === 0 ) {
			this.setState( 'empty' );
			return;
		}
		engine.start( this, this.chunks, this.speakOptions(), {
			onChunkStart: ( index ) => {
				const chunk = this.chunks[ index ];
				this.showProgress( index );
				this.setProgress( index / this.chunks.length );
				this.deps.events.emit( 'chunk', {
					player: this,
					index,
					chunk,
					block: this.blocks[ chunk.block ] ?? null,
				} );
			},
			onBoundary: ( index, start, length ) => {
				const chunk = this.chunks[ index ];
				const blockStart = chunk.start + start;
				let end = blockStart + length;
				if ( length <= 0 ) {
					const word = /^[\p{L}\p{N}\p{M}'’-]+/u.exec(
						chunk.text.slice( start )
					);
					end = blockStart + ( word ? word[ 0 ].length : 1 );
				}
				this.deps.events.emit( 'boundary', {
					player: this,
					chunk,
					block: this.blocks[ chunk.block ] ?? null,
					start: blockStart,
					end: Math.min( end, chunk.end ),
				} );
			},
			onPause: () => this.setState( 'paused' ),
			onResume: () => this.setState( 'playing' ),
			onFinish: () => this.setState( 'finished' ),
			onStop: ( reason ) => {
				if ( reason !== 'error' ) {
					this.setState(
						'idle',
						reason === 'stopped' ? this.deps.strings.stopped : ''
					);
				}
			},
			onError: () => this.setState( 'error' ),
		} );
		this.setState( 'playing' );
	}

	pause() {
		if ( this.ownsEngine() ) {
			this.deps.engine?.pause();
		}
	}

	resume() {
		if ( this.ownsEngine() ) {
			this.deps.engine?.resume();
		} else {
			this.play();
		}
	}

	stop() {
		if ( this.ownsEngine() ) {
			this.deps.engine?.stop( 'stopped' );
		}
	}

	destroy() {
		this.stop();
		this.cleanups.forEach( ( cleanup ) => cleanup() );
		this.cleanups.length = 0;
		this.element.textContent = '';
		this.element.classList.remove( 'ttsr-player--ready' );
		this.element.style.removeProperty( '--ttsr-progress' );
		this.deps.events.emit( 'destroy', { player: this } );
	}

	private ownsEngine(): boolean {
		return this.deps.engine?.owner === this;
	}

	/** Elements whose text this player reads. */
	contentRoots(): Element[] {
		if ( this.deps.contentRoot ) {
			return [ this.deps.contentRoot ];
		}
		const selector = this.config.contentSelector.trim();
		if ( selector && validSelectors( [ selector ] ).length ) {
			const matches = Array.from( document.querySelectorAll( selector ) );
			if ( matches.length ) {
				return matches;
			}
		}
		const parent = this.element.parentElement;
		if ( this.config.scope === 'closest' ) {
			const article = this.element.closest( ARTICLE_SELECTOR );
			if ( article ) {
				return [ article ];
			}
		}
		return parent ? [ parent ] : [];
	}

	private speakOptions() {
		const voices = this.deps.voices();
		const chosen = this.voiceSelect?.value ?? '';
		const rate = this.rateSelect
			? Number( this.rateSelect.value )
			: this.config.rate;
		return {
			voice: resolveVoice( voices, {
				voice: chosen || this.config.voice,
				lang: this.config.lang,
			} ),
			lang: this.config.lang,
			rate: rate > 0 ? rate : 1,
			pitch: this.config.pitch,
		};
	}

	private applyOptions() {
		if ( this.ownsEngine() ) {
			this.deps.engine?.update( this.speakOptions() );
		}
	}

	private showProgress( index: number ) {
		if ( ! this.progress ) {
			return;
		}
		this.progress.hidden = false;
		this.progress.textContent = this.deps.strings.progress
			.replace( '%1$d', String( index + 1 ) )
			.replace( '%2$d', String( this.chunks.length ) );
	}

	private setProgress( fraction: number ) {
		this.element.style.setProperty(
			'--ttsr-progress',
			`${ Math.round( Math.min( 1, Math.max( 0, fraction ) ) * 1000 ) / 10 }%`
		);
	}

	private setState( state: PlayerState, message?: string ) {
		const { strings } = this.deps;
		const { labels } = this.config;
		const previous = this.state;
		this.state = state;
		this.element.dataset.state = state;

		const toggleLabels: Partial< Record< PlayerState, string > > = {
			playing: labels.pause,
			paused: labels.resume,
		};
		this.toggleLabel.textContent = toggleLabels[ state ] ?? labels.listen;
		this.toggleIcon.textContent = '';
		this.toggleIcon.append(
			icon( state === 'playing' ? 'pause' : 'play' )
		);
		this.toggleButton.disabled = state === 'unsupported';

		if ( this.stopButton ) {
			this.stopButton.hidden = state !== 'playing' && state !== 'paused';
		}
		if ( this.progress && ( state === 'idle' || state === 'finished' ) ) {
			this.progress.hidden = true;
		}
		if ( state !== 'playing' && state !== 'paused' ) {
			this.setProgress( 0 );
		}
		const messages: Partial< Record< PlayerState, string > > = {
			idle: strings.ready,
			playing: strings.playing,
			paused: strings.paused,
			finished: strings.finished,
			empty: strings.empty,
			error: strings.error,
			unsupported: strings.unsupported,
		};
		this.status.textContent = message || messages[ state ] || '';
		if ( this.voiceSelect ) {
			this.voiceSelect.disabled =
				state === 'unsupported' || this.deps.voices().length === 0;
		}
		if ( this.rateSelect ) {
			this.rateSelect.disabled = state === 'unsupported';
		}
		if ( previous !== state ) {
			this.deps.events.emit( 'state', { player: this, state } );
		}
	}

	private listen(
		target: EventTarget,
		type: string,
		handler: EventListener
	) {
		target.addEventListener( type, handler );
		this.cleanups.push( () => target.removeEventListener( type, handler ) );
	}
}
