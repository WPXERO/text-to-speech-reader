/**
 * Admin app entry.
 */
import domReady from '@wordpress/dom-ready';
import { createRoot } from '@wordpress/element';
import './admin.scss';
import { App } from './App';

domReady( () => {
	const root = document.getElementById( 'ttsr-admin-root' );
	if ( root && window.ttsrAdmin ) {
		createRoot( root ).render( <App /> );
	}
} );
