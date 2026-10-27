import { groupVoices, resolveVoice } from '../../src/player/voices';
import { voice } from './helpers';

const voices = [
	voice( 'Daniel', 'en-GB' ),
	voice( 'Samantha', 'en-US', { default: true } ),
	voice( 'Amélie', 'fr-CA' ),
	voice( 'Thomas', 'fr-FR' ),
];

describe( 'resolveVoice', () => {
	it( 'prefers the exact voice by name or URI', () => {
		expect(
			resolveVoice( voices, { voice: 'Daniel', lang: 'fr-FR' } )?.name
		).toBe( 'Daniel' );
		expect(
			resolveVoice( voices, { voice: 'uri:Thomas', lang: '' } )?.name
		).toBe( 'Thomas' );
	} );

	it( 'falls back to the language, then the base language, then the default', () => {
		expect(
			resolveVoice( voices, { voice: 'Missing', lang: 'fr-FR' } )?.name
		).toBe( 'Thomas' );
		expect(
			resolveVoice( voices, { voice: '', lang: 'fr_BE' } )?.name
		).toBe( 'Amélie' );
		expect(
			resolveVoice( voices, { voice: '', lang: 'de-DE' } )?.name
		).toBe( 'Samantha' );
	} );

	it( 'returns null when the browser has no voices', () => {
		expect(
			resolveVoice( [], { voice: 'Daniel', lang: 'en' } )
		).toBeNull();
	} );
} );

describe( 'groupVoices', () => {
	it( 'puts voices for the language first', () => {
		const { matching, other } = groupVoices( voices, 'fr-FR' );
		expect( matching.map( ( v ) => v.name ) ).toEqual( [
			'Amélie',
			'Thomas',
		] );
		expect( other.map( ( v ) => v.name ) ).toEqual( [
			'Daniel',
			'Samantha',
		] );
	} );
} );
