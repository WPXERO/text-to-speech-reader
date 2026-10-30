/**
 * Editor registration for the wpxero-text-to-speech/player block.
 * The block is dynamic: PHP renders the real player on the front end.
 */
import { registerBlockType, type BlockConfiguration } from '@wordpress/blocks';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { ExternalLink, PanelBody, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import metadata from '../../blocks/player/block.json';
import './editor.scss';

type Attributes = Record< string, unknown > & {
	layout: string;
	includeTitle: '' | 'yes' | 'no';
};

declare global {
	interface Window {
		ttsrBlockEditor?: {
			layouts: { value: string; label: string }[];
			defaultLayout: string;
			settingsUrl: string;
		};
	}
}

function Edit( {
	attributes,
	setAttributes,
}: {
	attributes: Attributes;
	setAttributes: ( next: Partial< Attributes > ) => void;
} ) {
	const data = window.ttsrBlockEditor;
	const layouts = data?.layouts ?? [];
	const layout = attributes.layout || data?.defaultLayout || 'standard';
	const blockProps = useBlockProps( { className: 'ttsr-block-preview' } );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Player', 'wpxero-text-to-speech' ) }>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Layout', 'wpxero-text-to-speech' ) }
						value={ attributes.layout }
						options={ [
							{
								value: '',
								label: __(
									'Use the global setting',
									'wpxero-text-to-speech'
								),
							},
							...layouts,
						] }
						onChange={ ( value: string ) =>
							setAttributes( { layout: value } )
						}
					/>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __(
							'Read the title first',
							'wpxero-text-to-speech'
						) }
						value={ attributes.includeTitle }
						options={ [
							{
								value: '',
								label: __(
									'Use the global setting',
									'wpxero-text-to-speech'
								),
							},
							{
								value: 'yes',
								label: __( 'Yes', 'wpxero-text-to-speech' ),
							},
							{
								value: 'no',
								label: __( 'No', 'wpxero-text-to-speech' ),
							},
						] }
						onChange={ ( value: string ) =>
							setAttributes( {
								includeTitle:
									value as Attributes[ 'includeTitle' ],
							} )
						}
					/>
					{ data?.settingsUrl && (
						<p>
							<ExternalLink href={ data.settingsUrl }>
								{ __(
									'Global player settings',
									'wpxero-text-to-speech'
								) }
							</ExternalLink>
						</p>
					) }
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				<div
					className={ `ttsr-block-preview__player is-layout-${ layout }` }
					aria-hidden="true"
				>
					<span className="ttsr-block-preview__button">
						<svg
							viewBox="0 0 24 24"
							width="18"
							height="18"
							fill="currentColor"
						>
							<path d="M8 5.5v13l10.5-6.5z" />
						</svg>
						{ __( 'Listen', 'wpxero-text-to-speech' ) }
					</span>
				</div>
				<p className="ttsr-block-preview__note">
					{ __(
						'Text to Speech Player — reads this post aloud on the published page.',
						'wpxero-text-to-speech'
					) }
				</p>
			</div>
		</>
	);
}

registerBlockType(
	metadata as unknown as BlockConfiguration< Attributes >,
	{
		edit: Edit,
		save: () => null,
	} as unknown as Partial< BlockConfiguration< Attributes > >
);
