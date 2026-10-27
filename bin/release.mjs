#!/usr/bin/env node
/**
 * Full release pipeline:
 * versions → production build → type check → lint → unit tests →
 * [WordPress integration tests when WP_CLI is set] → .pot file →
 * ZIP package → package verification.
 *
 * It never tags, uploads or publishes anything.
 */
import path from 'node:path';
import { DIST, PLUGIN, run } from './lib.mjs';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const steps = [
	'check-versions',
	'build',
	'typecheck',
	'lint:js',
	'lint:css',
	'lint:php-syntax',
	'lint:php',
	'test',
	...( process.env.WP_CLI ? [ 'test:wp' ] : [] ),
	'makepot',
	'package',
	'verify-package',
];

for ( const script of steps ) {
	console.log( `\n▶ npm run ${ script }` );
	run( npm, [ 'run', '--silent', script ], {
		env: {
			...process.env,
			NODE_ENV: script === 'build' ? 'production' : process.env.NODE_ENV,
		},
	} );
}
if ( ! process.env.WP_CLI ) {
	console.log(
		'\nSkipped WordPress integration tests (set WP_CLI to run them).'
	);
}
console.log(
	`\nRelease package:\n  ${ path.join( DIST, `${ PLUGIN.slug }.zip` ) }`
);
