/**
 * Editor registration for the text-to-speech-reader/player block.
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
				<PanelBody title={ __( 'Player', 'text-to-speech-reader' ) }>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Layout', 'text-to-speech-reader' ) }
						value={ attributes.layout }
						options={ [
							{
								value: '',
								label: __(
									'Use the global setting',
									'text-to-speech-reader'
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
							'text-to-speech-reader'
						) }
						value={ attributes.includeTitle }
						options={ [
							{
								value: '',
								label: __(
									'Use the global setting',
									'text-to-speech-reader'
								),
							},
							{
								value: 'yes',
								label: __( 'Yes', 'text-to-speech-reader' ),
							},
							{
								value: 'no',
								label: __( 'No', 'text-to-speech-reader' ),
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
									'text-to-speech-reader'
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
						{ __( 'Listen', 'text-to-speech-reader' ) }
					</span>
				</div>
				<p className="ttsr-block-preview__note">
					{ __(
						'Text to Speech Player — reads this post aloud on the published page.',
						'text-to-speech-reader'
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
