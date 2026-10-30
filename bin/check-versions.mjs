#!/usr/bin/env node
/**
 * Checks that every version and requirement declaration agrees.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { constant, header, PLUGIN, ROOT } from './lib.mjs';

const problems = [];
const main = path.join( ROOT, PLUGIN.main );
const readme = path.join( ROOT, 'readme.txt' );
const values = {
	header: header( main, 'Version' ),
	constant: constant( main, PLUGIN.versionConstant ),
	stableTag: header( readme, 'Stable tag' ),
	blockJson: JSON.parse(
		readFileSync( path.join( ROOT, 'blocks/player/block.json' ), 'utf8' )
	).version,
	packageJson: JSON.parse(
		readFileSync( path.join( ROOT, 'package.json' ), 'utf8' )
	).version,
};
if ( new Set( Object.values( values ) ).size !== 1 ) {
	problems.push( `versions disagree ${ JSON.stringify( values ) }` );
}
for ( const name of [ 'Requires at least', 'Requires PHP' ] ) {
	if ( header( main, name ) !== header( readme, name ) ) {
		problems.push(
			`"${ name }" differs between ${ PLUGIN.main } and readme.txt`
		);
	}
}
if ( ! readFileSync( readme, 'utf8' ).includes( `= ${ values.header } =` ) ) {
	problems.push( `readme.txt has no changelog entry for ${ values.header }` );
}

console.log(
	`WPXERO Text to Speech ${ values.header } (API ${ constant(
		main,
		'TTSR_API_VERSION'
	) })`
);
if ( problems.length ) {
	problems.forEach( ( problem ) => console.error( `  ✖ ${ problem }` ) );
	process.exit( 1 );
}
console.log( 'Versions are consistent.' );
