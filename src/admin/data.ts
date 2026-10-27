/**
 * Boot data printed by TTSR\Admin::app_data().
 */
import type { FreeSettings, Option, PlayerLabels } from '../types';

export interface ExtensionInfo {
	id: string;
	name: string;
	version: string;
	/** Short label shown next to the page title, e.g. "Pro". */
	badge?: string;
}

export interface AdminData {
	version: string;
	apiVersion: number;
	settings: FreeSettings;
	defaults: FreeSettings;
	postTypes: Option[];
	layouts: Option[];
	placements: Option[];
	siteLanguage: string;
	labels: PlayerLabels;
	links: { newPost: string; plugins: string; samplePost?: string };
	extensions: ExtensionInfo[];
}

declare global {
	interface Window {
		ttsrAdmin?: AdminData;
	}
}

export const data = window.ttsrAdmin as AdminData;
