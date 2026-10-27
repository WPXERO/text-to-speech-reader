import { __ } from '@wordpress/i18n';
import type { FreeSettings } from '../types';
import { createSettingsStore, type FieldErrors } from '@ttsr/admin-ui';
import { data } from './data';

export function validate( draft: FreeSettings ): FieldErrors< FreeSettings > {
	const errors: FieldErrors< FreeSettings > = {};
	if ( draft.auto_insert && draft.post_types.length === 0 ) {
		errors.post_types = __(
			'Choose at least one content type, or turn automatic insertion off.',
			'text-to-speech-reader'
		);
	}
	for ( const key of [ 'rate', 'pitch' ] as const ) {
		if ( ! ( draft[ key ] >= 0.5 && draft[ key ] <= 2 ) ) {
			errors[ key ] = __(
				'Enter a number between 0.5 and 2.',
				'text-to-speech-reader'
			);
		}
	}
	if (
		draft.lang &&
		! /^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8}){0,3}$/.test( draft.lang )
	) {
		errors.lang = __(
			'Use a language code such as en-US, or leave it empty.',
			'text-to-speech-reader'
		);
	}
	return errors;
}

export const freeStore = createSettingsStore< FreeSettings >( {
	path: '/ttsr/v1/settings',
	resetPath: '/ttsr/v1/settings/reset',
	initial: data.settings,
	validate,
	messages: {
		saved: __( 'Settings saved.', 'text-to-speech-reader' ),
		reset: __(
			'Settings restored to their defaults.',
			'text-to-speech-reader'
		),
		invalid: __(
			'Some settings need attention before they can be saved.',
			'text-to-speech-reader'
		),
		failed: __(
			'The settings could not be saved. Check your connection and try again.',
			'text-to-speech-reader'
		),
	},
} );
