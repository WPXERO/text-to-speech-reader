/**
 * Splits extracted text into utterance-sized chunks.
 *
 * Browsers cope badly with long utterances (Chrome silently stops some voices
 * after roughly fifteen seconds), so text is spoken a sentence at a time and
 * very long sentences are split further at punctuation or spaces.
 */
import type { TextBlock } from './extract';

export interface Chunk {
	text: string;
	/** Index into the block list, or -1 for text that has no element (the title). */
	block: number;
	/** Offsets of `text` within the block's text. */
	start: number;
	end: number;
}

export const MAX_CHUNK_LENGTH = 200;

interface Span {
	start: number;
	end: number;
}

const SENTENCE_END = /[.!?…。！？]+["'”’)\]]*(?=\s|$)/g;

function trimSpan( text: string, span: Span ): Span | null {
	let { start, end } = span;
	while ( start < end && /\s/.test( text[ start ] ) ) {
		start++;
	}
	while ( end > start && /\s/.test( text[ end - 1 ] ) ) {
		end--;
	}
	return end > start ? { start, end } : null;
}

function sentenceSpans( text: string, lang: string ): Span[] {
	const spans: Span[] = [];
	const Segmenter = (
		Intl as unknown as { Segmenter?: typeof Intl.Segmenter }
	 ).Segmenter;
	if ( Segmenter ) {
		let segmenter: Intl.Segmenter;
		try {
			segmenter = new Segmenter( lang || undefined, {
				granularity: 'sentence',
			} );
		} catch {
			segmenter = new Segmenter( undefined, { granularity: 'sentence' } );
		}
		for ( const { segment, index } of segmenter.segment( text ) ) {
			spans.push( { start: index, end: index + segment.length } );
		}
		return spans;
	}

	let last = 0;
	SENTENCE_END.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ( ( match = SENTENCE_END.exec( text ) ) ) {
		const end = match.index + match[ 0 ].length;
		spans.push( { start: last, end } );
		last = end;
	}
	if ( last < text.length ) {
		spans.push( { start: last, end: text.length } );
	}
	return spans;
}

/**
 * Breaks a span longer than `max` at the last comma-like mark or space.
 */
function limitLength( text: string, span: Span, max: number ): Span[] {
	const parts: Span[] = [];
	let { start } = span;
	while ( span.end - start > max ) {
		const window = text.slice( start, start + max );
		let cut = Math.max(
			window.lastIndexOf( ', ' ),
			window.lastIndexOf( '; ' ),
			window.lastIndexOf( ': ' ),
			window.lastIndexOf( ' – ' ),
			window.lastIndexOf( ' — ' )
		);
		cut = cut > max / 3 ? cut + 1 : window.lastIndexOf( ' ' );
		if ( cut <= 0 ) {
			cut = max;
		}
		parts.push( { start, end: start + cut } );
		start += cut;
	}
	parts.push( { start, end: span.end } );
	return parts;
}

/**
 * Chunks of one string, with offsets relative to that string.
 *
 * @param text Text to split.
 * @param lang BCP 47 language tag used for sentence segmentation.
 * @param max  Longest chunk to produce.
 */
export function splitText(
	text: string,
	lang = '',
	max = MAX_CHUNK_LENGTH
): Span[] {
	const result: Span[] = [];
	for ( const sentence of sentenceSpans( text, lang ) ) {
		for ( const part of limitLength( text, sentence, max ) ) {
			const trimmed = trimSpan( text, part );
			if ( trimmed ) {
				result.push( trimmed );
			}
		}
	}
	return result;
}

/**
 * Chunks for a whole reading session: optional title, then every block.
 *
 * @param blocks Extracted blocks.
 * @param title  Title to read first, or an empty string.
 * @param lang   Language tag for segmentation.
 */
export function buildChunks(
	blocks: TextBlock[],
	title: string,
	lang: string
): Chunk[] {
	const chunks: Chunk[] = [];
	const cleanTitle = title.replace( /\s+/g, ' ' ).trim();
	if ( cleanTitle ) {
		for ( const span of splitText( cleanTitle, lang ) ) {
			chunks.push( {
				text: cleanTitle.slice( span.start, span.end ),
				block: -1,
				start: span.start,
				end: span.end,
			} );
		}
	}
	blocks.forEach( ( block, index ) => {
		for ( const span of splitText( block.text, lang ) ) {
			chunks.push( {
				text: block.text.slice( span.start, span.end ),
				block: index,
				start: span.start,
				end: span.end,
			} );
		}
	} );
	return chunks;
}
