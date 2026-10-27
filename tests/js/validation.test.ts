import {
	changedKeys,
	checkSelector,
	clamp,
	isHexColor,
	validSelectors,
} from '../../src/utils/validation';

describe( 'validation helpers', () => {
	it( 'validates hex colours', () => {
		expect( isHexColor( '#1e40af' ) ).toBe( true );
		expect( isHexColor( '#FFF' ) ).toBe( true );
		expect( isHexColor( 'red' ) ).toBe( false );
		expect( isHexColor( '#12345' ) ).toBe( false );
	} );

	it( 'accepts selectors and rejects style-sheet or markup syntax', () => {
		expect( checkSelector( '.entry-content > p' ) ).toEqual( {
			valid: true,
		} );
		expect( checkSelector( '[data-x="1"], #toc' ) ).toEqual( {
			valid: true,
		} );
		expect( checkSelector( 'a{color:red}' ).valid ).toBe( false );
		expect( checkSelector( '<script>' ).valid ).toBe( false );
		expect( checkSelector( '@import' ).valid ).toBe( false );
		expect( checkSelector( 'p /* x */' ).valid ).toBe( false );
		expect( checkSelector( '((' ) ).toEqual( {
			valid: false,
			reason: 'syntax',
		} );
		expect( checkSelector( 'x'.repeat( 201 ) ) ).toEqual( {
			valid: false,
			reason: 'length',
		} );
		expect( validSelectors( [ ' .a ', '((', '' ] ) ).toEqual( [ '.a' ] );
	} );

	it( 'clamps and diffs', () => {
		expect( clamp( 5, 0, 2 ) ).toBe( 2 );
		expect( clamp( NaN, 0.5, 2 ) ).toBe( 0.5 );
		expect( changedKeys( { a: 1, b: [ 1 ] }, { a: 1, b: [ 2 ] } ) ).toEqual(
			[ 'b' ]
		);
	} );
} );
