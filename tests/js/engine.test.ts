import {
	SpeechEngine,
	START_TIMEOUT,
	type UtteranceConstructor,
} from '../../src/player/engine';
import type { Chunk } from '../../src/player/chunks';
import { FakeSynth, FakeUtterance } from './helpers';

const chunks = ( ...texts: string[] ): Chunk[] =>
	texts.map( ( text ) => ( { text, block: 0, start: 0, end: text.length } ) );

const options = { voice: null, lang: 'en-US', rate: 1.25, pitch: 1 };

function setup() {
	const synth = new FakeSynth();
	const engine = new SpeechEngine(
		synth as unknown as SpeechSynthesis,
		FakeUtterance as unknown as UtteranceConstructor
	);
	return { synth, engine };
}

describe( 'SpeechEngine', () => {
	it( 'speaks chunks in order and reports the finish', () => {
		const { synth, engine } = setup();
		const listener = { onChunkStart: vi.fn(), onFinish: vi.fn() };
		engine.start( {}, chunks( 'One.', 'Two.' ), options, listener );
		expect( synth.current?.text ).toBe( 'One.' );
		expect( synth.current?.rate ).toBe( 1.25 );
		expect( synth.current?.lang ).toBe( 'en-US' );
		synth.finishAll();
		expect( synth.spoken.map( ( u ) => u.text ) ).toEqual( [
			'One.',
			'Two.',
		] );
		expect( listener.onChunkStart.mock.calls ).toEqual( [ [ 0 ], [ 1 ] ] );
		expect( listener.onFinish ).toHaveBeenCalledTimes( 1 );
		expect( engine.owner ).toBeNull();
	} );

	it( 'resumes from the last word boundary after a pause', () => {
		const { synth, engine } = setup();
		const listener = { onPause: vi.fn(), onResume: vi.fn() };
		engine.start(
			{},
			chunks( 'Hello brave new world.' ),
			options,
			listener
		);
		synth.start();
		synth.boundary( 6 );
		engine.pause();
		expect( listener.onPause ).toHaveBeenCalled();
		expect( engine.isPaused() ).toBe( true );
		expect( synth.current ).toBeNull();
		engine.resume();
		expect( synth.current?.text ).toBe( 'brave new world.' );
		// Boundaries after a resume are reported relative to the chunk.
		const onBoundary = vi.fn();
		engine.stop();
		engine.start( {}, chunks( 'Hello brave new world.' ), options, {
			onBoundary,
		} );
		synth.boundary( 6 );
		engine.pause();
		engine.resume();
		synth.boundary( 6, 3 );
		expect( onBoundary ).toHaveBeenLastCalledWith( 0, 12, 3, 'word' );
	} );

	it( 'ends the previous session when another owner starts', () => {
		const { synth, engine } = setup();
		const first = { onStop: vi.fn(), onFinish: vi.fn() };
		const owner = {};
		engine.start( owner, chunks( 'First.' ), options, first );
		engine.start( {}, chunks( 'Second.' ), options, {} );
		expect( first.onStop ).toHaveBeenCalledWith( 'replaced' );
		expect( engine.owner ).not.toBe( owner );
		synth.finishAll();
		expect( first.onFinish ).not.toHaveBeenCalled();
		expect( synth.spoken.map( ( u ) => u.text ) ).toEqual( [
			'First.',
			'Second.',
		] );
	} );

	it( 'ignores interruption errors caused by its own cancel, but reports real errors', () => {
		const { synth, engine } = setup();
		const listener = { onError: vi.fn(), onStop: vi.fn() };
		engine.start( {}, chunks( 'One.', 'Two.' ), options, listener );
		engine.pause();
		expect( listener.onError ).not.toHaveBeenCalled();
		engine.resume();
		synth.fail( 'synthesis-failed' );
		expect( listener.onError ).toHaveBeenCalledWith( 'synthesis-failed' );
		expect( listener.onStop ).toHaveBeenCalledWith( 'error' );
	} );

	it( 'ignores late callbacks from utterances it already replaced', () => {
		const { synth, engine } = setup();
		const listener = { onChunkStart: vi.fn() };
		engine.start( {}, chunks( 'One.', 'Two.' ), options, listener );
		const stale = synth.current!;
		engine.update( { rate: 2 } );
		stale.onend?.();
		expect( listener.onChunkStart ).toHaveBeenCalledTimes( 2 );
		expect( synth.current?.text ).toBe( 'One.' );
		expect( synth.current?.rate ).toBe( 2 );
	} );

	it( 'reports an error when speech never starts', () => {
		vi.useFakeTimers();
		const { engine } = setup();
		const listener = { onError: vi.fn() };
		engine.start( {}, chunks( 'One.' ), options, listener );
		vi.advanceTimersByTime( START_TIMEOUT + 10 );
		expect( listener.onError ).toHaveBeenCalledWith( 'start-timeout' );
		vi.useRealTimers();
	} );

	it( 'does not report a timeout once speech has started', () => {
		vi.useFakeTimers();
		const { synth, engine } = setup();
		const listener = { onError: vi.fn() };
		engine.start( {}, chunks( 'One.' ), options, listener );
		synth.start();
		synth.speaking = false;
		vi.advanceTimersByTime( START_TIMEOUT + 10 );
		expect( listener.onError ).not.toHaveBeenCalled();
		vi.useRealTimers();
	} );
} );
