#!/usr/bin/env node
/**
 * Builds dist/<slug>.zip from an allow-list of runtime files.
 * Run `npm run build` and `npm run makepot` first.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { DIST, PLUGIN, ROOT, run } from './lib.mjs';

const stage = path.join( DIST, 'stage' );
const target = path.join( stage, PLUGIN.slug );
rmSync( stage, { recursive: true, force: true } );
mkdirSync( target, { recursive: true } );

for ( const entry of PLUGIN.include ) {
	const from = path.join( ROOT, entry );
	if ( ! existsSync( from ) ) {
		throw new Error(
			`missing ${ entry } — run npm run build and npm run makepot first.`
		);
	}
	cpSync( from, path.join( target, entry ), {
		recursive: true,
		filter: ( file ) => ! /(^|\/)\.DS_Store$|\.map$/.test( file ),
	} );
}
const zip = path.join( DIST, `${ PLUGIN.slug }.zip` );
rmSync( zip, { force: true } );
// -X drops extra file attributes so archives are reproducible across machines.
run( 'zip', [ '-r', '-q', '-X', zip, PLUGIN.slug ], { cwd: stage } );
rmSync( stage, { recursive: true, force: true } );
console.log( `Created ${ zip }` );
