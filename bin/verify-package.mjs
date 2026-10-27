#!/usr/bin/env node
/**
 * Validates dist/<slug>.zip: single correct root folder, required runtime
 * files present, no development files, PHP that parses, matching versions.
 */
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { capture, constant, DIST, header, PLUGIN, run, walk } from './lib.mjs';

const FORBIDDEN = [
	/(^|\/)node_modules\//,
	/(^|\/)(src|bin|docs|dist)\//,
	/(^|\/)tests?\//,
	/(^|\/)vendor\//,
	/\.(ts|tsx|scss|map|mjs|cjs)$/,
	/(^|\/)(package(-lock)?\.json|composer\.(json|lock)|tsconfig\.json|webpack\.config\.js|vitest\.config\.mjs|phpcs\.xml(\.dist)?|README\.md)$/,
	/(^|\/)\.(git|github|DS_Store|env|editorconfig|gitignore|eslintrc.*|prettierrc.*)(\/|$)/,
	/\.(po|mo|zip|log)$/,
];

let failed = 0;
const fail = ( message ) => {
	failed++;
	console.error( `  ✖ ${ message }` );
};

const zip = path.join( DIST, `${ PLUGIN.slug }.zip` );
console.log( zip );
const listing = capture( 'unzip', [ '-Z1', zip ] );
if ( listing.status !== 0 ) {
	console.error( '  ✖ cannot read archive — run npm run package first.' );
	process.exit( 1 );
}
const entries = listing.stdout.trim().split( '\n' );
const files = entries.filter( ( entry ) => ! entry.endsWith( '/' ) );
if ( entries.some( ( entry ) => ! entry.startsWith( `${ PLUGIN.slug }/` ) ) ) {
	fail( `every entry must be inside ${ PLUGIN.slug }/` );
}
for ( const required of PLUGIN.required ) {
	if ( ! files.includes( `${ PLUGIN.slug }/${ required }` ) ) {
		fail( `missing ${ required }` );
	}
}
for ( const file of files ) {
	const relative = file.slice( PLUGIN.slug.length + 1 );
	if ( FORBIDDEN.some( ( pattern ) => pattern.test( relative ) ) ) {
		fail( `development file included: ${ file }` );
	}
}

const tmp = mkdtempSync( path.join( os.tmpdir(), `${ PLUGIN.slug }-verify-` ) );
try {
	run( 'unzip', [ '-q', zip, '-d', tmp ] );
	const root = path.join( tmp, PLUGIN.slug );
	for ( const php of walk( root ).filter( ( f ) => f.endsWith( '.php' ) ) ) {
		const lint = capture( process.env.PHP || 'php', [ '-l', php ] );
		if ( lint.status !== 0 ) {
			fail( `PHP syntax error in ${ path.relative( tmp, php ) }` );
		}
	}
	const main = path.join( root, PLUGIN.main );
	const version = header( main, 'Version' );
	if (
		version !== constant( main, PLUGIN.versionConstant ) ||
		version !== header( path.join( root, 'readme.txt' ), 'Stable tag' )
	) {
		fail( 'version mismatch inside the package' );
	}
	if ( header( main, 'Text Domain' ) !== PLUGIN.domain ) {
		fail( 'wrong text domain header' );
	}
	console.log(
		`  version ${ version }, ${ files.length } files, ${ (
			statSync( zip ).size / 1024
		).toFixed( 1 ) } KB`
	);
} finally {
	rmSync( tmp, { recursive: true, force: true } );
}

if ( failed ) {
	console.error( `\n${ failed } problem(s) found.` );
	process.exit( 1 );
}
console.log( 'Package verified.' );
