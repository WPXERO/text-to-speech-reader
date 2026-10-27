/**
 * Extends the @wordpress/scripts defaults (Babel + TypeScript, Sass,
 * dependency extraction into build/*.asset.php).
 *
 * `admin-ui` is built as a library exposed as `window.ttsr.adminUi` (script
 * handle `ttsr-admin-ui`). The admin app, and extensions such as Text to
 * Speech Reader Pro, import it as `@ttsr/admin-ui`; dependency extraction
 * turns that import into the global and adds the handle to the asset file,
 * so the components and stores exist once per page.
 */
const DependencyExtractionWebpackPlugin = require( '@wordpress/dependency-extraction-webpack-plugin' );
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

const ADMIN_UI = '@ttsr/admin-ui';

module.exports = {
	...defaultConfig,
	entry: {
		'admin-ui': {
			import: './src/admin-ui/index.ts',
			library: { name: [ 'ttsr', 'adminUi' ], type: 'window' },
		},
		admin: './src/admin/index.tsx',
		player: './src/player/index.ts',
		block: './src/block/index.tsx',
		editor: './src/editor/index.tsx',
	},
	plugins: [
		// block.json lives in blocks/ and is registered from PHP, so the
		// copy/PHP-path plugins that scan src/ for block.json are not needed.
		...defaultConfig.plugins.filter(
			( plugin ) =>
				! [
					'CopyPlugin',
					'PhpFilePathsPlugin',
					'DependencyExtractionWebpackPlugin',
				].includes( plugin.constructor.name )
		),
		new DependencyExtractionWebpackPlugin( {
			requestToExternal: ( request ) =>
				request === ADMIN_UI ? [ 'ttsr', 'adminUi' ] : undefined,
			requestToHandle: ( request ) =>
				request === ADMIN_UI ? 'ttsr-admin-ui' : undefined,
		} ),
	],
};
