/**
 * Admin UI library (script handle `ttsr-admin-ui`, global `ttsr.adminUi`).
 *
 * Built as its own entry and loaded once on the settings screen and in the
 * block editor. The core admin app and extensions import it as the
 * `@ttsr/admin-ui` module, which the build maps to that global, so every
 * screen shares one copy of the components and settings stores.
 */
import './ui.scss';

export * from './components';
export * from './store';
export * from '../utils/validation';
export type {
	AdminSection,
	FreeSettings,
	Option,
	Placement,
	PlayerConfig,
	PlayerLabels,
	PlayerState,
	PlayerStrings,
} from '../types';
