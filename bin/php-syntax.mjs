#!/usr/bin/env node
/**
 * `php -l` on every PHP file of the plugin and its tests.
 */
import { capture, ROOT, walk } from './lib.mjs';

const php = process.env.PHP || 'php';
const files = walk( ROOT, [ 'node_modules', 'vendor', 'dist', '.git' ] ).filter(
	( file ) => file.endsWith( '.php' )
);

let failed = 0;
for ( const file of files ) {
	const result = capture( php, [ '-l', file ] );
	if ( result.status !== 0 ) {
		failed++;
		console.error( result.stdout || result.stderr );
	}
}
console.log(
	`PHP syntax: ${ files.length - failed }/${ files.length } files OK`
);
process.exit( failed ? 1 : 0 );
