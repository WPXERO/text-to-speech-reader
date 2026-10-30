/**
 * Event bus behind `window.TTSR.on()`.
 */
import type { PlayerConfig, PlayerState } from '../types';
import type { Chunk } from './chunks';
import type { TextBlock } from './extract';

/** The parts of a player that extensions may use. */
export interface PlayerHandle {
	readonly element: HTMLElement;
	readonly config: PlayerConfig;
	readonly state: PlayerState;
	readonly blocks: readonly TextBlock[];
	readonly chunks: readonly Chunk[];
	/** Elements whose text the player reads. */
	contentRoots: () => Element[];
	play: () => void;
	pause: () => void;
	resume: () => void;
	stop: () => void;
	toggle: () => void;
}

export interface EventMap {
	/** A player was created. */
	mount: { player: PlayerHandle };
	/** A player's state changed. */
	state: { player: PlayerHandle; state: PlayerState };
	/** A chunk is about to be spoken. `block` is null for the title. */
	chunk: {
		player: PlayerHandle;
		index: number;
		chunk: Chunk;
		block: TextBlock | null;
	};
	/**
	 * The browser reported a word boundary. Offsets are within `block.text`
	 * (or the chunk text when `block` is null). Not every voice reports them.
	 */
	boundary: {
		player: PlayerHandle;
		chunk: Chunk;
		block: TextBlock | null;
		start: number;
		end: number;
	};
	/** A player was removed. */
	destroy: { player: PlayerHandle };
}

export type EventName = keyof EventMap;
type Handler< K extends EventName > = ( payload: EventMap[ K ] ) => void;

export class Events {
	private handlers = new Map< EventName, Set< Handler< never > > >();

	on< K extends EventName >( name: K, handler: Handler< K > ): () => void {
		let set = this.handlers.get( name );
		if ( ! set ) {
			set = new Set();
			this.handlers.set( name, set );
		}
		const stored = handler as Handler< never >;
		set.add( stored );
		return () => {
			set?.delete( stored );
		};
	}

	emit< K extends EventName >( name: K, payload: EventMap[ K ] ) {
		const set = this.handlers.get( name ) as
			Set< Handler< K > > | undefined;
		set?.forEach( ( handler ) => {
			try {
				handler( payload );
			} catch ( error ) {
				// An extension's bug must not stop playback.
				// eslint-disable-next-line no-console
				console.error( '[WPXERO Text to Speech]', error );
			}
		} );
	}
}
