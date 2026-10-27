/**
 * Helpers for the build and release scripts.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(
	path.dirname( fileURLToPath( import.meta.url ) ),
	'..'
);
export const DIST = path.join( ROOT, 'dist' );

/** This plugin and what its package contains. */
export const PLUGIN = {
	slug: 'text-to-speech-reader',
	main: 'text-to-speech-reader.php',
	versionConstant: 'TTSR_VERSION',
	domain: 'text-to-speech-reader',
	include: [
		'text-to-speech-reader.php',
		'uninstall.php',
		'readme.txt',
		'LICENSE.txt',
		'includes',
		'build',
		'blocks',
		'languages',
	],
	required: [
		'text-to-speech-reader.php',
		'readme.txt',
		'LICENSE.txt',
		'uninstall.php',
		'blocks/player/block.json',
		'build/player.js',
		'build/player.asset.php',
		'build/player.css',
		'build/admin-ui.js',
		'build/admin-ui.asset.php',
		'build/admin-ui.css',
		'build/admin.js',
		'build/admin.asset.php',
		'build/admin.css',
		'build/block.js',
		'build/editor.js',
		'languages/text-to-speech-reader.pot',
	],
};

export function run( command, args, options = {} ) {
	const result = spawnSync( command, args, {
		stdio: 'inherit',
		cwd: ROOT,
		...options,
	} );
	if ( result.error ) {
		throw result.error;
	}
	if ( result.status !== 0 ) {
		throw new Error(
			`${ command } ${ args.join( ' ' ) } exited with ${ result.status }`
		);
	}
	return result;
}

export function capture( command, args, options = {} ) {
	const result = spawnSync( command, args, {
		encoding: 'utf8',
		cwd: ROOT,
		...options,
	} );
	if ( result.error ) {
		throw result.error;
	}
	return result;
}

/**
 * WP-CLI command from the WP_CLI environment variable. It is split on
 * spaces unless it names an existing file, so a wrapper script whose path
 * contains spaces also works.
 */
export function wpCli() {
	const raw = process.env.WP_CLI || 'wp';
	return existsSync( raw ) ? [ raw ] : raw.split( ' ' );
}

/** Recursively lists files under a directory, skipping the given names. */
export function walk( dir, skip = [] ) {
	const out = [];
	for ( const entry of readdirSync( dir ) ) {
		if ( skip.includes( entry ) ) {
			continue;
		}
		const full = path.join( dir, entry );
		if ( statSync( full ).isDirectory() ) {
			out.push( ...walk( full, skip ) );
		} else {
			out.push( full );
		}
	}
	return out;
}

/** Reads a `Name: value` header from a plugin file or readme. */
export function header( file, name ) {
	const match = readFileSync( file, 'utf8' ).match(
		new RegExp( `^[\\s*#]*${ name }:\\s*(.+)$`, 'mi' )
	);
	return match ? match[ 1 ].trim() : null;
}

export function constant( file, name ) {
	const match = readFileSync( file, 'utf8' ).match(
		new RegExp( `define\\(\\s*'${ name }',\\s*'?([^')]+)'?\\s*\\)` )
	);
	return match ? match[ 1 ].trim() : null;
}
