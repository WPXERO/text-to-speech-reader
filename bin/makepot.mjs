#!/usr/bin/env node
/**
 * Generates languages/<domain>.pot from the PHP and the built JavaScript with
 * `wp i18n make-pot` (WP-CLI). Run after `npm run build`: the TypeScript
 * sources are not parsed directly, the compiled bundles are.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { PLUGIN, ROOT, run, wpCli } from './lib.mjs';

const [ command, ...base ] = wpCli();
mkdirSync( path.join( ROOT, 'languages' ), { recursive: true } );
run( command, [
	...base,
	'i18n',
	'make-pot',
	ROOT,
	path.join( ROOT, 'languages', `${ PLUGIN.domain }.pot` ),
	`--domain=${ PLUGIN.domain }`,
	'--exclude=src,node_modules,vendor,tests,bin,docs,dist',
	'--skip-audit',
	'--headers={"Report-Msgid-Bugs-To":""}',
] );
