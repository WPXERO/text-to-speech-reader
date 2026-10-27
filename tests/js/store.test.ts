import { createSettingsStore } from '../../src/admin-ui/store';

// A plain function rather than vi.fn(): Vitest's result tracking on a
// mock that returns a rejected promise reports it as unhandled.
const api = vi.hoisted( () => ( {
	calls: [] as unknown[],
	impl: ( () => Promise.resolve( {} ) ) as (
		options: unknown
	) => Promise< unknown >,
} ) );
vi.mock( '@wordpress/api-fetch', () => ( {
	default: ( options: unknown ) => {
		api.calls.push( options );
		return api.impl( options );
	},
} ) );
const apiFetch = {
	mockResolvedValue: ( value: unknown ) =>
		( api.impl = () => Promise.resolve( value ) ),
	mockReturnValue: ( value: Promise< unknown > ) =>
		( api.impl = () => value ),
	mockImplementation: ( fn: typeof api.impl ) => ( api.impl = fn ),
};

interface S {
	name: string;
	count: number;
}

const make = () =>
	createSettingsStore< S >( {
		path: '/x/settings',
		resetPath: '/x/settings/reset',
		initial: { name: 'a', count: 1 },
		validate: ( draft ) => ( draft.count < 0 ? { count: 'negative' } : {} ),
		messages: {
			saved: 'Saved',
			reset: 'Reset',
			invalid: 'Invalid',
			failed: 'Failed',
		},
	} );

beforeEach( () => {
	api.calls = [];
} );

describe( 'createSettingsStore', () => {
	it( 'tracks dirty state and saves through the REST endpoint', async () => {
		const store = make();
		store.set( 'name', 'b' );
		expect( store.getState().dirty ).toBe( true );
		apiFetch.mockResolvedValue( { settings: { name: 'b', count: 1 } } );
		await expect( store.save() ).resolves.toBe( true );
		expect( api.calls ).toEqual( [
			{
				path: '/x/settings',
				method: 'POST',
				data: { settings: { name: 'b', count: 1 } },
			},
		] );
		expect( store.getState() ).toMatchObject( {
			dirty: false,
			status: 'saved',
			message: 'Saved',
		} );
	} );

	it( 'blocks saving on client validation errors', async () => {
		const store = make();
		store.set( 'count', -1 );
		await expect( store.save() ).resolves.toBe( false );
		expect( api.calls ).toHaveLength( 0 );
		expect( store.getState().errors ).toEqual( { count: 'negative' } );
		store.set( 'count', 2 );
		expect( store.getState().errors ).toEqual( {} );
	} );

	it( 'shows server field errors and keeps the draft', async () => {
		const store = make();
		store.set( 'name', 'bad' );
		apiFetch.mockImplementation( () =>
			Promise.reject( {
				message: 'Nope',
				data: { errors: { name: 'Invalid name' } },
			} )
		);
		await store.save();
		const state = store.getState();
		expect( state.status ).toBe( 'error' );
		expect( state.message ).toBe( 'Nope' );
		expect( state.errors ).toEqual( { name: 'Invalid name' } );
		expect( state.dirty ).toBe( true );
		expect( state.draft.name ).toBe( 'bad' );
	} );

	it( 'keeps edits made while a save is in flight', async () => {
		const store = make();
		store.set( 'name', 'b' );
		let resolve: ( value: unknown ) => void = () => {};
		apiFetch.mockReturnValue( new Promise( ( r ) => ( resolve = r ) ) );
		const saving = store.save();
		expect( await store.save() ).toBe( false ); // second save while saving is refused
		store.set( 'count', 5 );
		resolve( { settings: { name: 'b', count: 1 } } );
		await saving;
		expect( store.getState().saved ).toEqual( { name: 'b', count: 1 } );
		expect( store.getState().draft ).toEqual( { name: 'b', count: 5 } );
		expect( store.getState().dirty ).toBe( true );
	} );

	it( 'resets to the server defaults and can discard and reload', async () => {
		const store = make();
		store.set( 'name', 'zzz' );
		store.discard();
		expect( store.getState().draft.name ).toBe( 'a' );
		apiFetch.mockResolvedValue( {
			settings: { name: 'default', count: 0 },
		} );
		await store.reset();
		expect( store.getState().draft ).toEqual( {
			name: 'default',
			count: 0,
		} );
		store.load( { name: 'imported', count: 9 } );
		expect( store.getState() ).toMatchObject( {
			dirty: false,
			saved: { name: 'imported', count: 9 },
		} );
	} );
} );
