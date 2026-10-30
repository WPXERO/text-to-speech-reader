import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, HelpText, SectionHeader, SettingsPanel } from '@ttsr/admin-ui';
import type { AdminContext } from '../extensions';

const EXAMPLES = [
	'[wpxero_text_to_speech]',
	'[wpxero_text_to_speech layout="button" title="no" rate="1.25"]',
];

function CodeBlock() {
	const [ copied, setCopied ] = useState( -1 );
	useEffect( () => {
		if ( copied < 0 ) {
			return;
		}
		const timer = setTimeout( () => setCopied( -1 ), 1500 );
		return () => clearTimeout( timer );
	}, [ copied ] );

	const copy = ( index: number ) => {
		navigator.clipboard
			?.writeText( EXAMPLES[ index ] )
			.then( () => setCopied( index ) )
			.catch( () => {} );
	};

	return (
		<div className="ttsr-admin-code">
			{ EXAMPLES.map( ( example, index ) => (
				<div key={ example } className="ttsr-admin-code__line">
					<code>{ example }</code>
					{ !! navigator.clipboard && (
						<Button
							variant="tertiary"
							size="small"
							icon={ copied === index ? 'check' : 'content_copy' }
							label={
								copied === index
									? __( 'Copied', 'wpxero-text-to-speech' )
									: __( 'Copy', 'wpxero-text-to-speech' )
							}
							title={ __( 'Copy', 'wpxero-text-to-speech' ) }
							onClick={ () => copy( index ) }
						/>
					) }
				</div>
			) ) }
		</div>
	);
}

export function Help( { context }: { context: AdminContext } ) {
	const layouts = context.data.layouts
		.map( ( layout ) => layout.value )
		.join( ', ' );
	const attributes = [
		[ 'layout', layouts ],
		[
			'title',
			__(
				'yes or no — read the post title first',
				'wpxero-text-to-speech'
			),
		],
		[
			'lang',
			__( 'a language code such as en-GB', 'wpxero-text-to-speech' ),
		],
		[ 'rate', __( 'speed from 0.5 to 2', 'wpxero-text-to-speech' ) ],
	];
	return (
		<>
			<SectionHeader
				id="ttsr-section-title"
				eyebrow={ __( 'Resources', 'wpxero-text-to-speech' ) }
				title={ __( 'Help', 'wpxero-text-to-speech' ) }
				description={ __(
					'Placing the player by hand, and what to expect from browser speech.',
					'wpxero-text-to-speech'
				) }
			/>

			<SettingsPanel
				icon="widgets"
				title={ __( 'Block', 'wpxero-text-to-speech' ) }
				description={ __(
					'In the block editor, add the “Text to Speech Player” block where the player should appear. Its sidebar lets you change the layout and whether the title is read. A post that contains the block does not also get the automatic player.',
					'wpxero-text-to-speech'
				) }
			/>

			<SettingsPanel
				icon="code"
				title={ __( 'Shortcode', 'wpxero-text-to-speech' ) }
				description={ __(
					'Add the shortcode to any post, page or widget area that supports shortcodes. The player reads the article that contains it.',
					'wpxero-text-to-speech'
				) }
			>
				<div className="ttsr-admin-stack">
					<CodeBlock />
					<div className="ttsr-admin-table" role="table">
						<div
							className="ttsr-admin-table__row is-head"
							role="row"
						>
							<span role="columnheader">
								{ __( 'Attribute', 'wpxero-text-to-speech' ) }
							</span>
							<span role="columnheader">
								{ __( 'Values', 'wpxero-text-to-speech' ) }
							</span>
						</div>
						{ attributes.map( ( [ name, values ] ) => (
							<div
								key={ name }
								className="ttsr-admin-table__row"
								role="row"
							>
								<span role="cell">
									<code>{ name }</code>
								</span>
								<span role="cell">{ values }</span>
							</div>
						) ) }
					</div>
					<HelpText>
						{ __(
							'Invalid values are ignored and the global settings are used instead.',
							'wpxero-text-to-speech'
						) }
					</HelpText>
				</div>
			</SettingsPanel>

			<SettingsPanel
				icon="public"
				title={ __( 'Browsers and voices', 'wpxero-text-to-speech' ) }
			>
				<ul className="ttsr-admin-list">
					<li>
						{ __(
							'Speech uses the Web Speech API built into the browser. Voices, languages and quality depend on the visitor’s operating system and browser.',
							'wpxero-text-to-speech'
						) }
					</li>
					<li>
						{ __(
							'Some in-app browsers and privacy-focused browsers have no speech support. The player then explains that instead of showing controls that do nothing.',
							'wpxero-text-to-speech'
						) }
					</li>
					<li>
						{ __(
							'Some browsers stop speaking when the tab is in the background or the screen locks.',
							'wpxero-text-to-speech'
						) }
					</li>
					<li>
						{ __(
							'Pausing remembers the last word the browser reported. Voices that do not report word positions resume from the start of the current sentence.',
							'wpxero-text-to-speech'
						) }
					</li>
				</ul>
			</SettingsPanel>

			<SettingsPanel
				icon="build"
				title={ __( 'Troubleshooting', 'wpxero-text-to-speech' ) }
			>
				<ul className="ttsr-admin-list">
					<li>
						{ __(
							'No player on a post: check that its content type is selected under General, and that the post has not opted out in the editor sidebar.',
							'wpxero-text-to-speech'
						) }
					</li>
					<li>
						{ __(
							'“There is no text to read here”: the theme may place the content outside the area the player reads. Add the block or shortcode inside the content instead.',
							'wpxero-text-to-speech'
						) }
					</li>
					<li>
						{ __(
							'No sound: confirm the device volume and that the browser has a voice for the reading language.',
							'wpxero-text-to-speech'
						) }
					</li>
				</ul>
			</SettingsPanel>

			<SettingsPanel
				icon="shield"
				title={ __( 'Privacy', 'wpxero-text-to-speech' ) }
				description={ __(
					'The plugin makes no external requests and collects no analytics. Text is spoken by the browser on the visitor’s device; note that some browser vendors provide online voices that process text on their own servers. Visitors’ voice and speed choices are stored only in their browser’s local storage.',
					'wpxero-text-to-speech'
				) }
			/>
		</>
	);
}
