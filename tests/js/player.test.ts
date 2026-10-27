import { createApi } from '../../src/player/api';
import { FakeSynth, fakeWindow, voice } from './helpers';

function page(
	players = 1,
	html = '<p>First sentence. Second sentence.</p><p>Another paragraph.</p>'
) {
	document.body.innerHTML = Array.from(
		{ length: players },
		( _, i ) => `<article><div class="entry-content" id="post-${ i }">
			<div class="ttsr-player ttsr-player--standard" data-ttsr-player hidden data-ttsr-config='${ JSON.stringify(
				{
					id: `p${ i }`,
					title: `Title ${ i }`,
					includeTitle: i === 0,
					scope: 'parent',
					allowVoiceSelect: true,
					allowRateSelect: true,
					lang: 'en-US',
				}
			) }'></div>${ html }</div></article>`
	).join( '' );
	return Array.from(
		document.querySelectorAll< HTMLElement >( '[data-ttsr-player]' )
	);
}

function setup( count = 1, html?: string ) {
	const synth = new FakeSynth();
	synth.voices = [
		voice( 'Samantha', 'en-US', { default: true } ),
		voice( 'Thomas', 'fr-FR' ),
	];
	const api = createApi( fakeWindow( synth ), { version: 'test' } );
	const elements = page( count, html );
	const players = elements.map( ( element ) => api.mount( element )! );
	return { synth, api, elements, players };
}

const toggle = ( element: HTMLElement ) =>
	element.querySelector< HTMLButtonElement >( '.ttsr-player__toggle' )!;
const status = ( element: HTMLElement ) =>
	element.querySelector( '.ttsr-player__status' )!.textContent;

describe( 'Player', () => {
	it( 'builds accessible controls and shows the container', () => {
		const { elements } = setup();
		const [ el ] = elements;
		expect( el.hidden ).toBe( false );
		expect( toggle( el ).textContent ).toBe( 'Listen' );
		expect( toggle( el ).type ).toBe( 'button' );
		expect(
			el.querySelector( '.ttsr-player__status' )!.getAttribute( 'role' )
		).toBe( 'status' );
		const selects = el.querySelectorAll( 'label select' );
		expect( selects ).toHaveLength( 2 );
		expect(
			el.querySelector< HTMLButtonElement >( '.ttsr-player__stop' )!
				.hidden
		).toBe( true );
	} );

	it( 'plays, pauses, resumes and stops with matching labels and status', () => {
		const { elements, synth, players } = setup();
		const [ el ] = elements;
		toggle( el ).click();
		expect( players[ 0 ].state ).toBe( 'playing' );
		expect( toggle( el ).textContent ).toBe( 'Pause' );
		expect( status( el ) ).toBe( 'Playing' );
		expect( synth.current?.text ).toBe( 'Title 0' );
		expect(
			el.querySelector< HTMLButtonElement >( '.ttsr-player__stop' )!
				.hidden
		).toBe( false );

		toggle( el ).click();
		expect( players[ 0 ].state ).toBe( 'paused' );
		expect( toggle( el ).textContent ).toBe( 'Resume' );

		toggle( el ).click();
		expect( players[ 0 ].state ).toBe( 'playing' );

		el.querySelector< HTMLButtonElement >( '.ttsr-player__stop' )!.click();
		expect( players[ 0 ].state ).toBe( 'idle' );
		expect( status( el ) ).toBe( 'Stopped' );
		expect( el.ownerDocument.activeElement ).not.toBe(
			el.querySelector( '.ttsr-player__stop' )
		);
	} );

	it( 'fills the decorative progress bar while reading and resets it', () => {
		const { elements, synth } = setup();
		const [ el ] = elements;
		const meter = el.querySelector( '.ttsr-player__meter' )!;
		expect( meter.getAttribute( 'aria-hidden' ) ).toBe( 'true' );
		expect( meter.querySelectorAll( '.ttsr-player__eq i' ) ).toHaveLength(
			4
		);
		const progress = () => el.style.getPropertyValue( '--ttsr-progress' );

		toggle( el ).click();
		expect( progress() ).toBe( '0%' );
		synth.finish();
		expect( progress() ).toBe( '25%' );
		synth.finishAll();
		expect( progress() ).toBe( '0%' );
	} );

	it( 'reads the title then the content, never the player itself', () => {
		const { elements, synth, players } = setup();
		toggle( elements[ 0 ] ).click();
		synth.finishAll();
		expect( synth.spoken.map( ( u ) => u.text ) ).toEqual( [
			'Title 0',
			'First sentence.',
			'Second sentence.',
			'Another paragraph.',
		] );
		expect( players[ 0 ].state ).toBe( 'finished' );
	} );

	it( 'stops the first player when a second one starts', () => {
		const { elements, players, synth } = setup( 2 );
		toggle( elements[ 0 ] ).click();
		toggle( elements[ 1 ] ).click();
		expect( players[ 0 ].state ).toBe( 'idle' );
		expect( players[ 1 ].state ).toBe( 'playing' );
		expect( synth.current?.text ).toBe( 'First sentence.' );
	} );

	it( 'handles rapid clicks without overlapping speech', () => {
		const { elements, synth } = setup();
		for ( let i = 0; i < 7; i++ ) {
			toggle( elements[ 0 ] ).click();
		}
		synth.finishAll();
		const texts = synth.spoken.map( ( u ) => u.text );
		expect(
			texts.filter( ( t ) => t === 'Another paragraph.' )
		).toHaveLength( 1 );
	} );

	it( 'reports empty content instead of pretending to play', () => {
		const { elements, players, synth } = setup( 1, '<p>  </p>' );
		toggle( elements[ 0 ] ).click();
		expect( players[ 0 ].state ).toBe( 'empty' );
		expect( status( elements[ 0 ] ) ).toBe(
			'There is no text to read here.'
		);
		expect( synth.spoken ).toHaveLength( 0 );
	} );

	it( 'disables controls when the browser has no speech support', () => {
		const api = createApi( fakeWindow( null ), {} );
		const [ el ] = page();
		const player = api.mount( el )!;
		expect( api.isSupported() ).toBe( false );
		expect( player.state ).toBe( 'unsupported' );
		expect( toggle( el ).disabled ).toBe( true );
		expect( status( el ) ).toBe(
			'Your browser does not support text to speech.'
		);
	} );

	it( 'lists voices as they load, grouped by language, and uses the chosen one', () => {
		const synth = new FakeSynth();
		const api = createApi( fakeWindow( synth ), {} );
		const [ el ] = page();
		api.mount( el );
		const select = el.querySelector< HTMLSelectElement >( 'label select' )!;
		expect( select.disabled ).toBe( true );
		synth.setVoices( [
			voice( 'Thomas', 'fr-FR' ),
			voice( 'Samantha', 'en-US' ),
		] );
		expect( select.disabled ).toBe( false );
		expect(
			[ ...select.querySelectorAll( 'optgroup' ) ].map( ( g ) => g.label )
		).toEqual( [ 'Matching language', 'Other languages' ] );
		select.value = 'uri:Thomas';
		select.dispatchEvent( new Event( 'change' ) );
		toggle( el ).click();
		expect( synth.current?.voice?.name ).toBe( 'Thomas' );
	} );

	it( 'mounts once per element and cleans up on unmount', () => {
		const { api, elements, players } = setup();
		expect( api.mount( elements[ 0 ] ) ).toBe( players[ 0 ] );
		const onDestroy = vi.fn();
		api.on( 'destroy', onDestroy );
		api.unmount( elements[ 0 ] );
		expect( onDestroy ).toHaveBeenCalled();
		expect( elements[ 0 ].children ).toHaveLength( 0 );
		expect( api.players() ).toHaveLength( 0 );
	} );

	it( 'emits chunk and boundary events with block offsets', () => {
		const { api, elements, synth } = setup(
			1,
			'<p>Hello brave world.</p>'
		);
		const chunk = vi.fn();
		const boundary = vi.fn();
		api.on( 'chunk', chunk );
		api.on( 'boundary', boundary );
		toggle( elements[ 0 ] ).click();
		synth.finish(); // title
		synth.boundary( 6 );
		expect( chunk ).toHaveBeenLastCalledWith(
			expect.objectContaining( { index: 1 } )
		);
		const payload = boundary.mock.calls[ 0 ][ 0 ];
		expect( payload.block.text.slice( payload.start, payload.end ) ).toBe(
			'brave'
		);
	} );

	it( 'speak() reads arbitrary text and ends the active player', async () => {
		const { api, elements, players, synth } = setup();
		toggle( elements[ 0 ] ).click();
		const handle = api.speak( 'Selected words. More.' )!;
		expect( players[ 0 ].state ).toBe( 'idle' );
		synth.finishAll();
		await expect( handle.done ).resolves.toBe( 'finished' );
	} );

	it( 'ignores a malformed config attribute', () => {
		const synth = new FakeSynth();
		const api = createApi( fakeWindow( synth ), {} );
		document.body.innerHTML =
			'<div class="c"><div data-ttsr-player data-ttsr-config="{not json"></div><p>Text.</p></div>';
		const player = api.mount(
			document.querySelector< HTMLElement >( '[data-ttsr-player]' )!
		)!;
		expect( player.config.layout ).toBe( 'standard' );
	} );
} );
