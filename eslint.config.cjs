const wpConfig = require( '@wordpress/scripts/config/eslint.config.cjs' );

module.exports = [
	{
		ignores: [
			'**/build/**',
			'**/node_modules/**',
			'**/vendor/**',
			'dist/**',
		],
	},
	...wpConfig,
	{
		settings: {
			'import/resolver': {
				typescript: { project: './tsconfig.json' },
			},
		},
		rules: {
			// WordPress packages are provided at runtime as externals.
			'import/no-extraneous-dependencies': 'off',
			'import/no-unresolved': [ 'error', { ignore: [ '^@wordpress/' ] } ],
		},
	},
	{
		// Plain descriptions are enough; types come from TypeScript.
		rules: { 'jsdoc/require-param': 'off' },
	},
	{
		// Command-line tools report to the terminal.
		files: [ 'bin/**' ],
		rules: { 'no-console': 'off' },
	},
];
