/**
 * Test doubles for the Web Speech API.
 */
export class FakeUtterance {
	voice: SpeechSynthesisVoice | null = null;
	lang = '';
	rate = 1;
	pitch = 1;
	onstart: ( () => void ) | null = null;
	onend: ( () => void ) | null = null;
	onerror: ( ( event: { error: string } ) => void ) | null = null;
	onboundary:
		| ( ( event: {
				name: string;
				charIndex: number;
				charLength?: number;
		  } ) => void )
		| null = null;
	constructor( public text = '' ) {}
}

export function voice(
	name: string,
	lang: string,
	extra: Partial< SpeechSynthesisVoice > = {}
) {
	return {
		name,
		lang,
		voiceURI: `uri:${ name }`,
		default: false,
		localService: true,
		...extra,
	} as SpeechSynthesisVoice;
}

export class FakeSynth {
	spoken: FakeUtterance[] = [];
	current: FakeUtterance | null = null;
	speaking = false;
	pending = false;
	paused = false;
	voices: SpeechSynthesisVoice[] = [];
	cancelCount = 0;
	private listeners = new Set< () => void >();

	speak( utterance: FakeUtterance ) {
		this.spoken.push( utterance );
		this.current = utterance;
		this.pending = true;
	}

	cancel() {
		this.cancelCount++;
		const current = this.current;
		this.current = null;
		this.speaking = false;
		this.pending = false;
		current?.onerror?.( { error: 'interrupted' } );
	}

	pause() {
		this.paused = true;
	}

	resume() {
		this.paused = false;
	}

	getVoices() {
		return this.voices;
	}

	addEventListener( _type: string, listener: () => void ) {
		this.listeners.add( listener );
	}

	removeEventListener( _type: string, listener: () => void ) {
		this.listeners.delete( listener );
	}

	setVoices( voices: SpeechSynthesisVoice[] ) {
		this.voices = voices;
		this.listeners.forEach( ( listener ) => listener() );
	}

	/** Simulates the browser starting and finishing the current utterance. */
	start() {
		this.speaking = true;
		this.pending = false;
		this.current?.onstart?.();
	}

	finish() {
		const current = this.current;
		this.current = null;
		this.speaking = false;
		current?.onend?.();
	}

	boundary( charIndex: number, charLength?: number ) {
		this.current?.onboundary?.( { name: 'word', charIndex, charLength } );
	}

	fail( error: string ) {
		const current = this.current;
		this.current = null;
		this.speaking = false;
		current?.onerror?.( { error } );
	}

	/**
	 * Plays every queued utterance to the end.
	 */
	finishAll( limit = 1000 ) {
		let guard = 0;
		while ( this.current && guard++ < limit ) {
			this.start();
			this.finish();
		}
	}
}

export function fakeWindow( synth: FakeSynth | null ) {
	const win = window as unknown as Record< string, unknown >;
	return {
		...window,
		document: window.document,
		speechSynthesis: synth,
		SpeechSynthesisUtterance: synth ? FakeUtterance : undefined,
		addEventListener: window.addEventListener.bind( window ),
		localStorage: win.localStorage,
	} as unknown as Window & typeof globalThis;
}
