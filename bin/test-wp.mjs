#!/usr/bin/env node
/**
 * Runs the PHP integration tests in a real WordPress install through WP-CLI.
 *
 *   WP_CLI="wp --path=/path/to/wordpress" npm run test:wp
 *
 * The plugin must be installed (or symlinked) as wpxero-text-to-speech. It
 * is activated for the run and the previous plugin state is restored
 * afterwards; other active plugins (including Pro) stay as they are, and the
 * suite must pass either way. Tests create and delete their own posts.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { ROOT, wpCli } from './lib.mjs';

const [ command, ...baseArgs ] = wpCli();
const FREE = 'wpxero-text-to-speech/wpxero-text-to-speech.php';

function wp( args, { quiet = false } = {} ) {
	const result = spawnSync( command, [ ...baseArgs, ...args ], {
		encoding: 'utf8',
		stdio: quiet ? 'pipe' : [ 'ignore', 'inherit', 'inherit' ],
	} );
	if ( result.error ) {
		throw result.error;
	}
	return result;
}

function setActive( plugins ) {
	const r = wp(
		[
			'option',
			'update',
			'active_plugins',
			JSON.stringify( plugins ),
			'--format=json',
		],
		{ quiet: true }
	);
	if ( r.status !== 0 ) {
		throw new Error( r.stderr );
	}
}

const original = wp( [ 'option', 'get', 'active_plugins', '--format=json' ], {
	quiet: true,
} );
if ( original.status !== 0 ) {
	console.error(
		'Could not run WP-CLI. Set WP_CLI, e.g. WP_CLI="wp --path=/path/to/wordpress".\n' +
			original.stderr
	);
	process.exit( 1 );
}
// An array with gaps in its keys (after a plugin is removed) is printed as an
// object, so accept both forms.
const restore = Object.values( JSON.parse( original.stdout.trim() ) );

let failed = false;
try {
	console.log( '\n=== WPXERO Text to Speech ===' );
	setActive( [ ...restore.filter( ( p ) => p !== FREE ), FREE ] );
	failed =
		wp( [ 'eval-file', path.join( ROOT, 'tests/php/free.php' ) ] )
			.status !== 0;
} finally {
	setActive( restore );
}

console.log(
	failed
		? '\nThe integration suite failed.'
		: '\nThe WordPress integration suite passed.'
);
process.exit( failed ? 1 : 0 );
