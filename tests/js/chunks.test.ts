import {
	buildChunks,
	MAX_CHUNK_LENGTH,
	splitText,
} from '../../src/player/chunks';
import { extractBlocks } from '../../src/player/extract';

describe( 'splitText', () => {
	it( 'splits sentences and keeps offsets that point back into the text', () => {
		const text = 'First sentence. Second one! Third? Done';
		const spans = splitText( text, 'en' );
		expect( spans.map( ( s ) => text.slice( s.start, s.end ) ) ).toEqual( [
			'First sentence.',
			'Second one!',
			'Third?',
			'Done',
		] );
	} );

	it( 'breaks long sentences below the maximum length at punctuation or spaces', () => {
		const text =
			Array.from( { length: 60 }, ( _, i ) => `word${ i },` ).join(
				' '
			) + ' end.';
		const spans = splitText( text, 'en' );
		expect( spans.length ).toBeGreaterThan( 1 );
		for ( const span of spans ) {
			expect( span.end - span.start ).toBeLessThanOrEqual(
				MAX_CHUNK_LENGTH
			);
		}
		expect(
			spans
				.map( ( s ) => text.slice( s.start, s.end ) )
				.join( ' ' )
				.replace( /\s+/g, ' ' )
		).toBe( text );
	} );

	it( 'returns nothing for whitespace', () => {
		expect( splitText( '   \n ' ) ).toEqual( [] );
	} );
} );

describe( 'buildChunks', () => {
	it( 'reads the title first and maps chunks to blocks', () => {
		document.body.innerHTML =
			'<div id="c"><p>One. Two.</p><p>Three.</p></div>';
		const blocks = extractBlocks( [ document.getElementById( 'c' )! ] );
		const chunks = buildChunks( blocks, '  My   title ', 'en' );
		expect( chunks.map( ( c ) => [ c.text, c.block ] ) ).toEqual( [
			[ 'My title', -1 ],
			[ 'One.', 0 ],
			[ 'Two.', 0 ],
			[ 'Three.', 1 ],
		] );
		for ( const chunk of chunks.filter( ( c ) => c.block >= 0 ) ) {
			expect(
				blocks[ chunk.block ].text.slice( chunk.start, chunk.end )
			).toBe( chunk.text );
		}
	} );
} );
