/**
 * "WPXERO Text to Speech" panel in the block editor's document sidebar.
 */
import { ToggleControl } from '@wordpress/components';
import { useEntityProp } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import {
	PluginDocumentSettingPanel,
	store as editorStore,
} from '@wordpress/editor';
import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';

declare global {
	interface Window {
		ttsrEditor?: { autoInsert: boolean; metaKey: string };
	}
}

function Panel() {
	const data = window.ttsrEditor;
	const postType = useSelect(
		( select ) =>
			(
				select( editorStore ) as { getCurrentPostType: () => string }
			 ).getCurrentPostType(),
		[]
	);
	const [ meta, setMeta ] = useEntityProp( 'postType', postType, 'meta' ) as [
		Record< string, unknown > | undefined,
		( next: Record< string, unknown > ) => void,
		unknown,
	];
	if ( ! data || ! meta ) {
		return null;
	}
	const disabled = !! meta[ data.metaKey ];

	return (
		<PluginDocumentSettingPanel
			name="ttsr-document-settings"
			title={ __( 'WPXERO Text to Speech', 'wpxero-text-to-speech' ) }
		>
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __(
					'Show the automatic player',
					'wpxero-text-to-speech'
				) }
				checked={ ! disabled }
				disabled={ ! data.autoInsert }
				onChange={ ( show: boolean ) =>
					setMeta( { ...meta, [ data.metaKey ]: ! show } )
				}
				help={
					data.autoInsert
						? __(
								'A Text to Speech Player block or shortcode in this post is shown either way.',
								'wpxero-text-to-speech'
							)
						: __(
								'Automatic insertion is turned off in the plugin settings.',
								'wpxero-text-to-speech'
							)
				}
			/>
		</PluginDocumentSettingPanel>
	);
}

registerPlugin( 'ttsr-document-settings', { render: Panel } );
