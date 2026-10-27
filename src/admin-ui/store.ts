/**
 * A small external store for one settings object persisted over REST.
 *
 * Lives outside React so drafts survive section changes, and so the Free
 * app and an extension can each own a store without sharing a provider.
 */
import apiFetch from '@wordpress/api-fetch';
import {
	useEffect,
	useReducer,
	useSyncExternalStore,
} from '@wordpress/element';
import { changedKeys } from '../utils/validation';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type FieldErrors< T > = Partial< Record< keyof T & string, string > >;

export interface StoreState< T > {
	saved: T;
	draft: T;
	dirty: boolean;
	status: SaveStatus;
	message: string;
	errors: FieldErrors< T >;
}

export interface SettingsStore< T > {
	getState: () => StoreState< T >;
	subscribe: ( listener: () => void ) => () => void;
	set: < K extends keyof T >( key: K, value: T[ K ] ) => void;
	discard: () => void;
	/** Clears the last save message. */
	dismiss: () => void;
	save: () => Promise< boolean >;
	reset: () => Promise< boolean >;
	/** Replaces the saved state, e.g. after an import changed it server-side. */
	load: ( saved: T ) => void;
}

interface StoreOptions< T > {
	path: string;
	resetPath: string;
	initial: T;
	validate?: ( draft: T ) => FieldErrors< T >;
	messages: {
		saved: string;
		reset: string;
		invalid: string;
		failed: string;
	};
}

interface ApiError {
	message?: string;
	data?: { errors?: Record< string, string > };
}

const same = ( a: unknown, b: unknown ) =>
	JSON.stringify( a ) === JSON.stringify( b );

/**
 * Every store created on the page. The library loads once per page, so the
 * core and extensions share this list; the save bar saves them together.
 */
const registry = new Set< SettingsStore< object > >();
const registryListeners = new Set< () => void >();

export function createSettingsStore< T extends object >(
	options: StoreOptions< T >
): SettingsStore< T > {
	let state: StoreState< T > = {
		saved: options.initial,
		draft: options.initial,
		dirty: false,
		status: 'idle',
		message: '',
		errors: {},
	};
	const listeners = new Set< () => void >();
	let request = 0;

	const update = ( patch: Partial< StoreState< T > > ) => {
		const next = { ...state, ...patch };
		next.dirty = ! same( next.saved, next.draft );
		state = next;
		listeners.forEach( ( listener ) => listener() );
	};

	const persist = async (
		path: string,
		data: object | undefined,
		success: string
	) => {
		const id = ++request;
		const sent = state.draft;
		update( { status: 'saving', message: '' } );
		try {
			const response = await apiFetch< { settings: T } >( {
				path,
				method: 'POST',
				data,
			} );
			if ( id !== request ) {
				return false;
			}
			// Keep edits made while the request was in flight.
			const draft =
				same( state.draft, sent ) || ! data
					? response.settings
					: state.draft;
			update( {
				saved: response.settings,
				draft,
				status: 'saved',
				message: success,
				errors: {},
			} );
			return true;
		} catch ( error ) {
			if ( id !== request ) {
				return false;
			}
			const apiError = error as ApiError;
			update( {
				status: 'error',
				message: apiError.message || options.messages.failed,
				errors: ( apiError.data?.errors ?? {} ) as FieldErrors< T >,
			} );
			return false;
		}
	};

	if ( typeof window !== 'undefined' ) {
		window.addEventListener( 'beforeunload', ( event ) => {
			if ( state.dirty ) {
				event.preventDefault();
				event.returnValue = '';
			}
		} );
	}

	const store: SettingsStore< T > = {
		getState: () => state,
		subscribe( listener ) {
			listeners.add( listener );
			return () => listeners.delete( listener );
		},
		set( key, value ) {
			const errors = { ...state.errors };
			delete errors[ key as keyof T & string ];
			update( {
				draft: { ...state.draft, [ key ]: value },
				errors,
				status: state.status === 'saving' ? 'saving' : 'idle',
				message: state.status === 'saving' ? state.message : '',
			} );
		},
		discard() {
			update( {
				draft: state.saved,
				errors: {},
				status: 'idle',
				message: '',
			} );
		},
		dismiss() {
			update( {
				message: '',
				status: state.status === 'saving' ? 'saving' : 'idle',
			} );
		},
		save() {
			if ( state.status === 'saving' ) {
				return Promise.resolve( false );
			}
			const errors = options.validate?.( state.draft ) ?? {};
			if ( Object.keys( errors ).length ) {
				update( {
					status: 'error',
					message: options.messages.invalid,
					errors,
				} );
				return Promise.resolve( false );
			}
			return persist(
				options.path,
				{ settings: state.draft },
				options.messages.saved
			);
		},
		reset() {
			return persist(
				options.resetPath,
				undefined,
				options.messages.reset
			);
		},
		load( saved ) {
			update( {
				saved,
				draft: saved,
				errors: {},
				status: 'idle',
				message: '',
			} );
		},
	};
	registry.add( store as unknown as SettingsStore< object > );
	registryListeners.forEach( ( listener ) => listener() );
	return store;
}

export function useStore< T >( store: SettingsStore< T > ): StoreState< T > {
	return useSyncExternalStore( store.subscribe, store.getState );
}

/** All settings stores created on this page, in creation order. */
export function registeredStores(): SettingsStore< object >[] {
	return [ ...registry ];
}

export interface StoresSummary {
	/** Number of settings that differ from the saved values. */
	changes: number;
	dirty: boolean;
	saving: boolean;
	/** Messages of stores whose last save or validation failed. */
	errors: string[];
}

let summary: StoresSummary = {
	changes: 0,
	dirty: false,
	saving: false,
	errors: [],
};

function summarise(): StoresSummary {
	const next: StoresSummary = {
		changes: 0,
		dirty: false,
		saving: false,
		errors: [],
	};
	for ( const store of registry ) {
		const state = store.getState();
		next.changes += changedKeys( state.saved, state.draft ).length;
		next.dirty ||= state.dirty;
		next.saving ||= state.status === 'saving';
		if ( state.status === 'error' && state.message ) {
			next.errors.push( state.message );
		}
	}
	// Keep the snapshot stable while nothing changed (useSyncExternalStore).
	if ( ! same( next, summary ) ) {
		summary = next;
	}
	return summary;
}

function subscribeAll( listener: () => void ): () => void {
	let unsubscribe: ( () => void )[] = [];
	const attach = () => {
		unsubscribe.forEach( ( fn ) => fn() );
		unsubscribe = [ ...registry ].map( ( store ) =>
			store.subscribe( listener )
		);
	};
	const onRegister = () => {
		attach();
		listener();
	};
	attach();
	registryListeners.add( onRegister );
	return () => {
		registryListeners.delete( onRegister );
		unsubscribe.forEach( ( fn ) => fn() );
	};
}

/** Combined state of every settings store on the page. */
export function useStoresSummary(): StoresSummary {
	return useSyncExternalStore( subscribeAll, summarise );
}

/** Re-renders the caller whenever any settings store changes. */
export function useAnyStoreChange(): void {
	const [ , refresh ] = useReducer( ( count: number ) => count + 1, 0 );
	useEffect( () => subscribeAll( refresh ), [] );
}

/**
 * Saves every store with unsaved changes. Resolves true when all of them
 * saved; each store keeps its own error message otherwise.
 */
export async function saveAll(): Promise< boolean > {
	const dirty = [ ...registry ].filter( ( store ) => store.getState().dirty );
	const results = await Promise.all( dirty.map( ( store ) => store.save() ) );
	return results.every( Boolean );
}

/** Discards unsaved changes in every store. */
export function discardAll(): void {
	registry.forEach( ( store ) => store.discard() );
}

/**
 * Whether any of the given keys of a store has an unsaved change.
 *
 * @param store Settings store.
 * @param keys  Keys to check; all keys when omitted.
 */
export function hasChanges< T extends object >(
	store: SettingsStore< T >,
	keys?: readonly ( keyof T )[]
): boolean {
	const { saved, draft } = store.getState();
	const changed = changedKeys( saved, draft );
	return keys
		? changed.some( ( key ) => keys.includes( key ) )
		: changed.length > 0;
}
