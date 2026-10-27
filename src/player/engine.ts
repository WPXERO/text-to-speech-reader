/**
 * The one speech engine on the page.
 *
 * `speechSynthesis` is a page-wide singleton, so every player and extension
 * goes through this class: starting a session ends whichever session was
 * active. Pause is implemented as "cancel and remember the last word
 * boundary" because native pause/resume is unreliable across browsers
 * (Android ignores it, Chrome drops some remote voices while paused).
 */
import type { Chunk } from './chunks';

export interface SpeakOptions {
	voice: SpeechSynthesisVoice | null;
	lang: string;
	rate: number;
	pitch: number;
}

export type StopReason = 'stopped' | 'replaced' | 'error';

export interface SessionListener {
	onChunkStart?: ( index: number ) => void;
	/** `start` is the boundary offset within the chunk text. */
	onBoundary?: (
		index: number,
		start: number,
		length: number,
		name: string
	) => void;
	onPause?: () => void;
	onResume?: () => void;
	onFinish?: () => void;
	onStop?: ( reason: StopReason ) => void;
	onError?: ( error: string ) => void;
}

interface Session {
	owner: object;
	chunks: Chunk[];
	options: SpeakOptions;
	listener: SessionListener;
	index: number;
	/** Where the current chunk was (re)started from. */
	offset: number;
	/** Start of the most recent word boundary, relative to the chunk. */
	boundary: number;
	paused: boolean;
}

export type UtteranceConstructor = new (
	text?: string
) => SpeechSynthesisUtterance;

/** How long to wait for an utterance to start before reporting an error. */
export const START_TIMEOUT = 8000;

export class SpeechEngine {
	private session: Session | null = null;
	private generation = 0;
	private watchdog: ReturnType< typeof setTimeout > | undefined;

	constructor(
		private readonly synth: SpeechSynthesis,
		private readonly Utterance: UtteranceConstructor
	) {}

	/** The owner of the active session, if any. */
	get owner(): object | null {
		return this.session?.owner ?? null;
	}

	isPaused(): boolean {
		return !! this.session?.paused;
	}

	/**
	 * Starts reading `chunks` for `owner`, ending any other session first.
	 *
	 * @param owner    Identifies the caller (a player or extension).
	 * @param chunks   Chunks to read.
	 * @param options  Voice options.
	 * @param listener Session callbacks.
	 */
	start(
		owner: object,
		chunks: Chunk[],
		options: SpeakOptions,
		listener: SessionListener
	) {
		this.stop( 'replaced' );
		this.session = {
			owner,
			chunks,
			options,
			listener,
			index: 0,
			offset: 0,
			boundary: 0,
			paused: false,
		};
		this.speakCurrent();
	}

	pause() {
		const session = this.session;
		if ( ! session || session.paused ) {
			return;
		}
		this.invalidate();
		session.paused = true;
		session.listener.onPause?.();
	}

	resume() {
		const session = this.session;
		if ( ! session || ! session.paused ) {
			return;
		}
		session.paused = false;
		session.offset += session.boundary;
		session.boundary = 0;
		session.listener.onResume?.();
		this.speakCurrent();
	}

	/**
	 * Changes voice options. A playing session restarts the current chunk
	 * from the last word boundary so the change is heard immediately.
	 *
	 * @param options Options to merge.
	 */
	update( options: Partial< SpeakOptions > ) {
		const session = this.session;
		if ( ! session ) {
			return;
		}
		session.options = { ...session.options, ...options };
		if ( ! session.paused ) {
			this.invalidate();
			session.offset += session.boundary;
			session.boundary = 0;
			this.speakCurrent();
		}
	}

	stop( reason: StopReason = 'stopped' ) {
		const session = this.session;
		if ( ! session ) {
			return;
		}
		this.invalidate();
		this.session = null;
		session.listener.onStop?.( reason );
	}

	/** Cancels speech and makes callbacks from older utterances no-ops. */
	private invalidate() {
		this.generation++;
		clearTimeout( this.watchdog );
		this.synth.cancel();
	}

	private finish() {
		const session = this.session;
		this.invalidate();
		this.session = null;
		session?.listener.onFinish?.();
	}

	private fail( error: string ) {
		const session = this.session;
		this.invalidate();
		this.session = null;
		session?.listener.onError?.( error );
		session?.listener.onStop?.( 'error' );
	}

	private speakCurrent() {
		const session = this.session;
		if ( ! session ) {
			return;
		}
		// Skip empty remainders (for example when paused at the final word).
		while (
			session.index < session.chunks.length &&
			! session.chunks[ session.index ].text
				.slice( session.offset )
				.trim()
		) {
			session.index++;
			session.offset = 0;
		}
		if ( session.index >= session.chunks.length ) {
			this.finish();
			return;
		}

		const generation = ++this.generation;
		const current = () =>
			generation === this.generation && this.session === session;
		const index = session.index;
		const chunk = session.chunks[ index ];
		const offset = session.offset;
		const utterance = new this.Utterance( chunk.text.slice( offset ) );
		const { voice, lang, rate, pitch } = session.options;
		if ( voice ) {
			utterance.voice = voice;
			utterance.lang = voice.lang;
		} else if ( lang ) {
			utterance.lang = lang;
		}
		utterance.rate = rate;
		utterance.pitch = pitch;

		let started = false;
		utterance.onstart = () => {
			if ( current() ) {
				started = true;
				clearTimeout( this.watchdog );
			}
		};
		utterance.onboundary = ( event: SpeechSynthesisEvent ) => {
			if ( ! current() || ( event.name && event.name !== 'word' ) ) {
				return;
			}
			session.boundary = event.charIndex;
			session.listener.onBoundary?.(
				index,
				offset + event.charIndex,
				event.charLength ?? 0,
				event.name ?? 'word'
			);
		};
		utterance.onend = () => {
			if ( ! current() ) {
				return;
			}
			session.index++;
			session.offset = 0;
			session.boundary = 0;
			this.speakCurrent();
		};
		utterance.onerror = ( event: SpeechSynthesisErrorEvent ) => {
			if (
				! current() ||
				event.error === 'interrupted' ||
				event.error === 'canceled'
			) {
				return;
			}
			this.fail( event.error || 'synthesis-failed' );
		};

		session.listener.onChunkStart?.( index );
		if ( this.synth.paused ) {
			this.synth.resume();
		}
		this.synth.speak( utterance );

		clearTimeout( this.watchdog );
		this.watchdog = setTimeout( () => {
			if ( current() && ! started && ! this.synth.speaking ) {
				this.fail( 'start-timeout' );
			}
		}, START_TIMEOUT );
	}
}
