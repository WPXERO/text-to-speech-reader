/**
 * Frontend entry: creates `window.TTSR` and mounts every player on the page.
 */
import type { PlayerStrings } from '../types';
import { createApi, type TTSRApi } from './api';
import './player.scss';

declare global {
	interface Window {
		TTSR?: TTSRApi;
		ttsrPlayerSettings?: {
			version?: string;
			strings?: Partial< PlayerStrings >;
		};
	}
}

if ( ! window.TTSR ) {
	const api = createApi( window, window.ttsrPlayerSettings ?? {} );
	window.TTSR = api;

	const mountAll = () => {
		document
			.querySelectorAll< HTMLElement >( '[data-ttsr-player]' )
			.forEach( ( element ) => api.mount( element ) );
	};

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', mountAll, {
			once: true,
		} );
	} else {
		mountAll();
	}

	// Some browsers keep speaking after the visitor leaves the page.
	window.addEventListener( 'pagehide', () => api.stop() );
}
