import { useEffect, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	Button,
	Icon,
	SectionHeader,
	StatusPill,
	useStore,
	type IconName,
} from '@ttsr/admin-ui';
import type { AdminContext } from '../extensions';

interface Step {
	done: boolean;
	title: string;
	detail: string;
	action?: ReactActionProps;
}

interface ReactActionProps {
	label: string;
	icon?: IconName;
	onClick?: () => void;
	href?: string;
	target?: string;
}

/** Whether the preview has been played in this browser tab. */
function usePlayedPreview(): boolean {
	const [ played, setPlayed ] = useState( false );
	useEffect( () => {
		const api = window.TTSR;
		if ( ! api ) {
			return;
		}
		return api.on( 'state', ( { player, state } ) => {
			if ( player.config.source === 'preview' && state === 'playing' ) {
				setPlayed( true );
			}
		} );
	}, [] );
	return played;
}

// Remembered for the rest of the visit, across section changes.
let visitedPost = false;

const playPreview = () => {
	const preview = window.TTSR?.players().find(
		( player ) => player.config.source === 'preview'
	);
	if ( preview && preview.state !== 'playing' ) {
		preview.play();
	}
};

export function Overview( { context }: { context: AdminContext } ) {
	const { saved } = useStore( context.freeStore );
	const { data } = context;
	const played = usePlayedPreview();
	const [ visited, setVisited ] = useState( visitedPost );
	const supported = !! window.TTSR?.isSupported();
	const typeLabels = data.postTypes
		.filter( ( type ) => saved.post_types.includes( type.value ) )
		.map( ( type ) => type.label );
	const autoOn = saved.auto_insert && typeLabels.length > 0;
	const placement =
		data.placements.find( ( item ) => item.value === saved.placement )
			?.label ?? saved.placement;

	const steps: Step[] = [
		{
			done: autoOn,
			title: autoOn
				? sprintf(
						/* translators: 1: list of content types, 2: placement such as "Before the content". */
						__(
							'The player is added to: %1$s (%2$s)',
							'wpxero-text-to-speech'
						),
						typeLabels.join( ', ' ),
						placement.toLowerCase()
					)
				: __(
						'The player is not added automatically',
						'wpxero-text-to-speech'
					),
			detail: autoOn
				? __(
						'Single posts of these types show the player unless the post opts out.',
						'wpxero-text-to-speech'
					)
				: __(
						'Turn on automatic insertion under General, or place the player by hand with the block or shortcode.',
						'wpxero-text-to-speech'
					),
			action: {
				label: __( 'Change', 'wpxero-text-to-speech' ),
				onClick: () => context.navigate( 'general' ),
			},
		},
		{
			done: played,
			title: __(
				'Try the player in this browser',
				'wpxero-text-to-speech'
			),
			detail: supported
				? __(
						'Press Listen in the preview to hear the current settings.',
						'wpxero-text-to-speech'
					)
				: __(
						'This browser has no speech support, so the preview cannot play here. Try another browser.',
						'wpxero-text-to-speech'
					),
			action: supported
				? {
						label: __( 'Try it', 'wpxero-text-to-speech' ),
						icon: 'play_arrow',
						onClick: playPreview,
					}
				: undefined,
		},
		{
			done: visited,
			title: __( 'Check a published post', 'wpxero-text-to-speech' ),
			detail: data.links.samplePost
				? __(
						'Open your latest post and listen as a visitor would.',
						'wpxero-text-to-speech'
					)
				: __(
						'Publish a post to see the player on your site.',
						'wpxero-text-to-speech'
					),
			action: data.links.samplePost
				? {
						label: __(
							'View latest post',
							'wpxero-text-to-speech'
						),
						icon: 'open_in_new',
						href: data.links.samplePost,
						target: '_blank',
						onClick: () => {
							visitedPost = true;
							setVisited( true );
						},
					}
				: {
						label: __( 'Write a post', 'wpxero-text-to-speech' ),
						icon: 'edit_square',
						href: data.links.newPost,
					},
		},
	];
	const done = steps.filter( ( step ) => step.done ).length;

	const shortcuts: { id: string; label: string; icon: IconName }[] = [
		{
			id: 'player',
			label: __( 'Player layout', 'wpxero-text-to-speech' ),
			icon: 'dashboard_customize',
		},
		{
			id: 'voice',
			label: __( 'Voice and speed', 'wpxero-text-to-speech' ),
			icon: 'record_voice_over',
		},
		{
			id: 'help',
			label: __( 'Shortcode and block help', 'wpxero-text-to-speech' ),
			icon: 'code',
		},
	];

	return (
		<>
			<SectionHeader
				id="ttsr-section-title"
				eyebrow={ __( 'Get started', 'wpxero-text-to-speech' ) }
				title={ __( 'Overview', 'wpxero-text-to-speech' ) }
				description={ __(
					'WPXERO Text to Speech adds a Listen player that reads your content aloud with the speech voices built into each visitor’s browser. No account, API key or external service is involved.',
					'wpxero-text-to-speech'
				) }
			/>

			<section className="ttsr-ui-panel ttsr-admin-setup">
				<div className="ttsr-ui-panel__intro">
					<div className="ttsr-ui-panel__heading">
						<h3 className="ttsr-ui-panel__title">
							{ __( 'Setup', 'wpxero-text-to-speech' ) }
						</h3>
						<p className="ttsr-ui-help">
							{ sprintf(
								/* translators: 1: completed steps, 2: total steps. */
								__(
									'%1$d of %2$d done',
									'wpxero-text-to-speech'
								),
								done,
								steps.length
							) }
						</p>
					</div>
					<div
						className="ttsr-admin-setup__progress"
						role="progressbar"
						aria-label={ __( 'Setup', 'wpxero-text-to-speech' ) }
						aria-valuemin={ 0 }
						aria-valuemax={ steps.length }
						aria-valuenow={ done }
					>
						<span
							style={ {
								width: `${ ( done / steps.length ) * 100 }%`,
							} }
						/>
					</div>
				</div>
				<ol className="ttsr-ui-panel__body ttsr-admin-steps">
					{ steps.map( ( step, index ) => (
						<li key={ index } className="ttsr-admin-step">
							<span
								className={ `ttsr-admin-step__marker${
									step.done ? ' is-done' : ''
								}` }
								aria-hidden="true"
							>
								{ step.done ? (
									<Icon name="check" size={ 18 } />
								) : (
									index + 1
								) }
							</span>
							<div className="ttsr-admin-step__text">
								<p className="ttsr-admin-step__title">
									<span className="screen-reader-text">
										{ step.done
											? __(
													'Done:',
													'wpxero-text-to-speech'
												)
											: __(
													'To do:',
													'wpxero-text-to-speech'
												) }
									</span>{ ' ' }
									{ step.title }
								</p>
								<p className="ttsr-ui-help">{ step.detail }</p>
							</div>
							{ step.action && (
								<Button
									icon={ step.action.icon }
									iconFilled={
										step.action.icon === 'play_arrow'
									}
									href={ step.action.href }
									target={ step.action.target }
									onClick={ step.action.onClick }
								>
									{ step.action.label }
								</Button>
							) }
						</li>
					) ) }
				</ol>
			</section>

			<h3 className="ttsr-admin__group-label">
				{ __( 'Shortcuts', 'wpxero-text-to-speech' ) }
			</h3>
			<div className="ttsr-admin-shortcuts">
				{ shortcuts.map( ( shortcut ) => (
					<button
						key={ shortcut.id }
						type="button"
						className="ttsr-admin-shortcut"
						onClick={ () => context.navigate( shortcut.id ) }
					>
						<span className="ttsr-admin-shortcut__icon">
							<Icon name={ shortcut.icon } />
						</span>
						<span>{ shortcut.label }</span>
						<Icon name="arrow_forward" size={ 18 } />
					</button>
				) ) }
			</div>

			<h3 className="ttsr-admin__group-label">
				{ __( 'Active extensions', 'wpxero-text-to-speech' ) }
			</h3>
			{ data.extensions.length === 0 && (
				<div className="ttsr-admin-extension">
					<span className="ttsr-ui-icon-tile is-large is-pro">
						<Icon name="extension" size={ 22 } />
					</span>
					<div className="ttsr-admin-extension__text">
						<span className="ttsr-admin-extension__name">
							{ __(
								'No extensions active',
								'wpxero-text-to-speech'
							) }
						</span>
						<span className="ttsr-ui-help">
							{ __(
								'Extensions add their settings here when they are active.',
								'wpxero-text-to-speech'
							) }
						</span>
					</div>
				</div>
			) }
			{ data.extensions.map( ( extension ) => (
				<div key={ extension.id } className="ttsr-admin-extension">
					<span className="ttsr-ui-icon-tile is-large is-pro">
						<Icon name="workspace_premium" filled size={ 22 } />
					</span>
					<div className="ttsr-admin-extension__text">
						<span className="ttsr-admin-extension__name">
							{ extension.name }
						</span>
						<span className="ttsr-admin-extension__version">
							{ extension.version }
						</span>
					</div>
					<StatusPill tone="success">
						{ __( 'Active', 'wpxero-text-to-speech' ) }
					</StatusPill>
				</div>
			) ) }
		</>
	);
}
