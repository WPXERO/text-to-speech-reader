/**
 * Admin extension points (JavaScript side of the integration contract).
 *
 * Extensions add filters with `@wordpress/hooks` before the app mounts — their
 * script handles are made dependencies of the app through the PHP filter
 * `ttsr_admin_script_dependencies`.
 *
 *  - `ttsr.admin.sections`       ( AdminSection[], AdminContext ) => AdminSection[]
 *  - `ttsr.admin.groups`         ( Record<group, GroupLabel> ) => Record<group, GroupLabel>
 *  - `ttsr.admin.previewConfig`  ( Partial<PlayerConfig>, AdminContext ) => Partial<PlayerConfig>
 *  - `ttsr.admin.previewStyle`   ( Record<string, string>, AdminContext ) => Record<string, string>
 *  - `ttsr.admin.previewStores`  ( SettingsStore[], AdminContext ) => SettingsStore[]
 */
import { applyFilters } from '@wordpress/hooks';
import type { ComponentType } from 'react';
import type { AdminSection, FreeSettings, PlayerConfig } from '../types';
import type { SettingsStore } from '@ttsr/admin-ui';
import type { AdminData } from './data';

export interface AdminContext {
	data: AdminData;
	freeStore: SettingsStore< FreeSettings >;
	navigate: ( section: string ) => void;
	/** Components extensions may render inside their sections. */
	components: {
		PlayerPreview: ComponentType< {
			context: AdminContext;
			description?: string;
		} >;
	};
}

export function filterSections(
	sections: AdminSection[],
	context: AdminContext
): AdminSection[] {
	const filtered = applyFilters( 'ttsr.admin.sections', sections, context );
	return Array.isArray( filtered )
		? ( filtered as AdminSection[] )
		: sections;
}

/** A navigation heading: plain text, or text with a small badge. */
export type GroupLabel = string | { label: string; badge?: string };

export function filterGroups(
	groups: Record< string, GroupLabel >
): Record< string, GroupLabel > {
	return applyFilters( 'ttsr.admin.groups', groups ) as Record<
		string,
		GroupLabel
	>;
}

export function filterPreviewConfig(
	config: Partial< PlayerConfig >,
	context: AdminContext
): Partial< PlayerConfig > {
	return applyFilters(
		'ttsr.admin.previewConfig',
		config,
		context
	) as Partial< PlayerConfig >;
}

export function filterPreviewStyle(
	style: Record< string, string >,
	context: AdminContext
): Record< string, string > {
	return applyFilters( 'ttsr.admin.previewStyle', style, context ) as Record<
		string,
		string
	>;
}

export function filterPreviewStores(
	stores: SettingsStore< unknown >[],
	context: AdminContext
): SettingsStore< unknown >[] {
	return applyFilters(
		'ttsr.admin.previewStores',
		stores,
		context
	) as SettingsStore< unknown >[];
}
