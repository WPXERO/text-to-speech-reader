import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, HelpText, SectionHeader, SettingsPanel } from '@ttsr/admin-ui';
import type { AdminContext } from '../extensions';

const EXAMPLES = [
	'[text_to_speech_reader]',
	'[text_to_speech_reader layout="button" title="no" rate="1.25"]',
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
									? __( 'Copied', 'text-to-speech-reader' )
									: __( 'Copy', 'text-to-speech-reader' )
							}
							title={ __( 'Copy', 'text-to-speech-reader' ) }
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
				'text-to-speech-reader'
			),
		],
		[
			'lang',
			__( 'a language code such as en-GB', 'text-to-speech-reader' ),
		],
		[ 'rate', __( 'speed from 0.5 to 2', 'text-to-speech-reader' ) ],
	];
	return (
		<>
			<SectionHeader
				id="ttsr-section-title"
				eyebrow={ __( 'Resources', 'text-to-speech-reader' ) }
				title={ __( 'Help', 'text-to-speech-reader' ) }
				description={ __(
					'Placing the player by hand, and what to expect from browser speech.',
					'text-to-speech-reader'
				) }
			/>

			<SettingsPanel
				icon="widgets"
				title={ __( 'Block', 'text-to-speech-reader' ) }
				description={ __(
					'In the block editor, add the “Text to Speech Player” block where the player should appear. Its sidebar lets you change the layout and whether the title is read. A post that contains the block does not also get the automatic player.',
					'text-to-speech-reader'
				) }
			/>

			<SettingsPanel
				icon="code"
				title={ __( 'Shortcode', 'text-to-speech-reader' ) }
				description={ __(
					'Add the shortcode to any post, page or widget area that supports shortcodes. The player reads the article that contains it.',
					'text-to-speech-reader'
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
								{ __( 'Attribute', 'text-to-speech-reader' ) }
							</span>
							<span role="columnheader">
								{ __( 'Values', 'text-to-speech-reader' ) }
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
							'text-to-speech-reader'
						) }
					</HelpText>
				</div>
			</SettingsPanel>

			<SettingsPanel
				icon="public"
				title={ __( 'Browsers and voices', 'text-to-speech-reader' ) }
			>
				<ul className="ttsr-admin-list">
					<li>
						{ __(
							'Speech uses the Web Speech API built into the browser. Voices, languages and quality depend on the visitor’s operating system and browser.',
							'text-to-speech-reader'
						) }
					</li>
					<li>
						{ __(
							'Some in-app browsers and privacy-focused browsers have no speech support. The player then explains that instead of showing controls that do nothing.',
							'text-to-speech-reader'
						) }
					</li>
					<li>
						{ __(
							'Some browsers stop speaking when the tab is in the background or the screen locks.',
							'text-to-speech-reader'
						) }
					</li>
					<li>
						{ __(
							'Pausing remembers the last word the browser reported. Voices that do not report word positions resume from the start of the current sentence.',
							'text-to-speech-reader'
						) }
					</li>
				</ul>
			</SettingsPanel>

			<SettingsPanel
				icon="build"
				title={ __( 'Troubleshooting', 'text-to-speech-reader' ) }
			>
				<ul className="ttsr-admin-list">
					<li>
						{ __(
							'No player on a post: check that its content type is selected under General, and that the post has not opted out in the editor sidebar.',
							'text-to-speech-reader'
						) }
					</li>
					<li>
						{ __(
							'“There is no text to read here”: the theme may place the content outside the area the player reads. Add the block or shortcode inside the content instead.',
							'text-to-speech-reader'
						) }
					</li>
					<li>
						{ __(
							'No sound: confirm the device volume and that the browser has a voice for the reading language.',
							'text-to-speech-reader'
						) }
					</li>
				</ul>
			</SettingsPanel>

			<SettingsPanel
				icon="shield"
				title={ __( 'Privacy', 'text-to-speech-reader' ) }
				description={ __(
					'The plugin makes no external requests and collects no analytics. Text is spoken by the browser on the visitor’s device; note that some browser vendors provide online voices that process text on their own servers. Visitors’ voice and speed choices are stored only in their browser’s local storage.',
					'text-to-speech-reader'
				) }
			/>
		</>
	);
}
