import { extractBlocks, rangeFor } from '../../src/player/extract';

const root = ( html: string ) => {
	document.body.innerHTML = `<article id="root">${ html }</article>`;
	return document.getElementById( 'root' )!;
};

describe( 'extractBlocks', () => {
	it( 'groups text by paragraph-level elements and normalises whitespace', () => {
		const el = root(
			'<h2>Heading</h2><p>Some   <em>emphasised</em>\n text.</p><ul><li>Item one</li><li>Item two</li></ul>'
		);
		expect( extractBlocks( [ el ] ).map( ( b ) => b.text ) ).toEqual( [
			'Heading',
			'Some emphasised text.',
			'Item one',
			'Item two',
		] );
	} );

	it( 'skips scripts, styles, controls, navigation, hidden and screen-reader-only text', () => {
		const el = root( `
			<p>Visible</p>
			<script>alert(1)</script><style>p{}</style>
			<nav>Menu</nav><form><label>Field</label></form><button>Click</button>
			<p hidden>Hidden attr</p>
			<p style="display:none">Display none</p>
			<p aria-hidden="true">Aria hidden</p>
			<span class="screen-reader-text">SR only</span>
			<div class="ttsr-player">Listen</div>
			<p data-ttsr-skip>Skipped</p>
		` );
		expect( extractBlocks( [ el ] ).map( ( b ) => b.text ) ).toEqual( [
			'Visible',
		] );
	} );

	it( 'applies extra exclusion selectors and ignores invalid ones', () => {
		const el = root( '<p>Keep</p><div class="related"><p>Drop</p></div>' );
		const blocks = extractBlocks( [ el ], {
			exclude: [ '.related', '!!not a selector' ],
		} );
		expect( blocks.map( ( b ) => b.text ) ).toEqual( [ 'Keep' ] );
	} );

	it( 'returns no blocks for empty content', () => {
		expect( extractBlocks( [ root( '<p>   </p><div></div>' ) ] ) ).toEqual(
			[]
		);
	} );

	it( 'reads nested roots once, in document order', () => {
		document.body.innerHTML =
			'<div id="a"><p>First</p><div id="b"><p>Second</p></div></div><div id="c"><p>Third</p></div>';
		const get = ( id: string ) => document.getElementById( id )!;
		const blocks = extractBlocks( [ get( 'c' ), get( 'b' ), get( 'a' ) ] );
		expect( blocks.map( ( b ) => b.text ) ).toEqual( [
			'First',
			'Second',
			'Third',
		] );
	} );

	it( 'does not modify the content', () => {
		const html = '<p>Some <strong>bold</strong> text.</p>';
		const el = root( html );
		extractBlocks( [ el ] );
		expect( el.innerHTML ).toBe( html );
	} );
} );

describe( 'rangeFor', () => {
	it( 'maps block offsets back to text across inline elements', () => {
		const el = root( '<p>Hello <strong>big</strong>   wide world</p>' );
		const [ block ] = extractBlocks( [ el ] );
		expect( block.text ).toBe( 'Hello big wide world' );
		const start = block.text.indexOf( 'big' );
		expect( rangeFor( block, start, start + 3 )!.toString() ).toBe( 'big' );
		const wide = block.text.indexOf( 'wide' );
		expect( rangeFor( block, wide, wide + 4 )!.toString() ).toBe( 'wide' );
		expect( rangeFor( block, 0, block.text.length )!.toString() ).toBe(
			'Hello big   wide world'
		);
	} );

	it( 'returns null for empty or detached ranges', () => {
		const el = root( '<p>Text</p>' );
		const [ block ] = extractBlocks( [ el ] );
		expect( rangeFor( block, 2, 2 ) ).toBeNull();
		el.innerHTML = '';
		expect( rangeFor( block, 0, 4 ) ).toBeNull();
	} );
} );
