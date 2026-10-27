/**
 * Voice discovery and fallback.
 *
 * Voices are device-specific and often load asynchronously, so a voice saved
 * by the administrator may not exist for a visitor. Resolution falls back
 * from exact voice → exact language → base language → browser default.
 */

export interface VoicePreference {
	/** voiceURI or name. Empty for automatic. */
	voice: string;
	/** BCP 47 tag such as `en-GB`. Empty for none. */
	lang: string;
}

const normalise = ( lang: string ) => lang.replace( '_', '-' ).toLowerCase();

export function resolveVoice(
	voices: readonly SpeechSynthesisVoice[],
	preference: VoicePreference
): SpeechSynthesisVoice | null {
	if ( voices.length === 0 ) {
		return null;
	}
	if ( preference.voice ) {
		const exact = voices.find(
			( v ) =>
				v.voiceURI === preference.voice || v.name === preference.voice
		);
		if ( exact ) {
			return exact;
		}
	}
	if ( preference.lang ) {
		const wanted = normalise( preference.lang );
		const base = wanted.split( '-' )[ 0 ];
		const sameLang = voices.filter(
			( v ) => normalise( v.lang ) === wanted
		);
		const sameBase = voices.filter(
			( v ) => normalise( v.lang ).split( '-' )[ 0 ] === base
		);
		const pick = ( list: SpeechSynthesisVoice[] ) =>
			list.find( ( v ) => v.default ) ??
			list.find( ( v ) => v.localService ) ??
			list[ 0 ];
		if ( sameLang.length ) {
			return pick( sameLang );
		}
		if ( sameBase.length ) {
			return pick( sameBase );
		}
	}
	return voices.find( ( v ) => v.default ) ?? voices[ 0 ];
}

/**
 * Calls `callback` with the current voice list now and whenever it changes.
 *
 * @param synth    Speech synthesis controller.
 * @param callback Receives the voices.
 * @return Unsubscribe function.
 */
export function watchVoices(
	synth: SpeechSynthesis,
	callback: ( voices: SpeechSynthesisVoice[] ) => void
): () => void {
	const update = () => callback( synth.getVoices() );
	update();
	if ( typeof synth.addEventListener === 'function' ) {
		synth.addEventListener( 'voiceschanged', update );
		return () => synth.removeEventListener( 'voiceschanged', update );
	}
	return () => {};
}

/**
 * Groups voices: those matching `lang` first, then the rest, each sorted by name.
 */
export function groupVoices(
	voices: readonly SpeechSynthesisVoice[],
	lang: string
): { matching: SpeechSynthesisVoice[]; other: SpeechSynthesisVoice[] } {
	const base = normalise( lang ).split( '-' )[ 0 ];
	const byName = ( a: SpeechSynthesisVoice, b: SpeechSynthesisVoice ) =>
		a.name.localeCompare( b.name );
	const matching = voices.filter(
		( v ) => base && normalise( v.lang ).split( '-' )[ 0 ] === base
	);
	const other = voices.filter( ( v ) => ! matching.includes( v ) );
	return { matching: matching.sort( byName ), other: other.sort( byName ) };
}
