import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import type { AdminSection, FreeSettings } from '../types';
import {
	Badge,
	Button,
	hasChanges,
	Icon,
	PageHeader,
	StatusPill,
	useAnyStoreChange,
	useStore,
	type IconName,
} from '@ttsr/admin-ui';
import { data } from './data';
import {
	filterGroups,
	filterSections,
	type AdminContext,
	type GroupLabel,
} from './extensions';
import { PlayerPreview } from './PlayerPreview';
import { freeStore } from './store';
import { General } from './sections/General';
import { Help } from './sections/Help';
import { Overview } from './sections/Overview';
import { Player } from './sections/Player';
import { Voice } from './sections/Voice';

// Overview first, then core settings, extension groups in registration
// order, and resources last.
const GROUP_RANK: Record< string, number > = {
	start: 0,
	core: 1,
	resources: 3,
};
const groupRank = ( section: AdminSection ) => GROUP_RANK[ section.group ] ?? 2;

const KEYS: Record< string, ( keyof FreeSettings )[] > = {
	general: [
		'auto_insert',
		'post_types',
		'placement',
		'include_title',
		'delete_data_on_uninstall',
	],
	player: [ 'layout', 'allow_voice_select', 'allow_rate_select' ],
	voice: [ 'lang', 'voice', 'rate', 'pitch' ],
};

const headingLabel = ( heading?: GroupLabel ) =>
	typeof heading === 'string' ? heading : heading?.label;
const headingBadge = ( heading?: GroupLabel ) =>
	typeof heading === 'object' ? heading?.badge : undefined;

const currentHash = () => window.location.hash.replace( /^#\/?/, '' );

/** "Live on Posts · before the content", from the saved settings. */
function useLiveStatus() {
	const { saved } = useStore( freeStore );
	const types = data.postTypes
		.filter( ( type ) => saved.post_types.includes( type.value ) )
		.map( ( type ) => type.label );
	const live = saved.auto_insert && types.length > 0;
	const placement =
		data.placements.find( ( item ) => item.value === saved.placement )
			?.label ?? saved.placement;
	return {
		live,
		types,
		placement,
		text: live
			? sprintf(
					/* translators: 1: list of content types, 2: placement such as "before the content". */
					__( 'Live on %1$s · %2$s', 'text-to-speech-reader' ),
					types.join( ', ' ),
					placement.toLowerCase()
				)
			: __( 'Automatic insertion is off', 'text-to-speech-reader' ),
	};
}

export function App() {
	const [ active, setActive ] = useState( currentHash() );
	const focusOnChange = useRef( false );
	const status = useLiveStatus();
	// Re-render for the unsaved-change markers of every section.
	useAnyStoreChange();

	const navigate = useCallback( ( id: string ) => {
		focusOnChange.current = true;
		window.location.hash = `/${ id }`;
	}, [] );

	const context: AdminContext = useMemo(
		() => ( { data, freeStore, navigate, components: { PlayerPreview } } ),
		[ navigate ]
	);

	const sections = useMemo( () => {
		const core: AdminSection[] = [
			{
				id: 'overview',
				label: __( 'Overview', 'text-to-speech-reader' ),
				group: 'start',
				order: 10,
				icon: 'space_dashboard',
				preview: true,
				render: () => <Overview context={ context } />,
			},
			{
				id: 'general',
				label: __( 'General', 'text-to-speech-reader' ),
				group: 'core',
				order: 20,
				icon: 'tune',
				isDirty: () => hasChanges( freeStore, KEYS.general ),
				render: () => <General context={ context } />,
			},
			{
				id: 'player',
				label: __( 'Player', 'text-to-speech-reader' ),
				group: 'core',
				order: 30,
				icon: 'smart_display',
				preview: true,
				isDirty: () => hasChanges( freeStore, KEYS.player ),
				render: () => <Player context={ context } />,
			},
			{
				id: 'voice',
				label: __( 'Voice and playback', 'text-to-speech-reader' ),
				group: 'core',
				order: 40,
				icon: 'record_voice_over',
				preview: true,
				isDirty: () => hasChanges( freeStore, KEYS.voice ),
				render: () => <Voice context={ context } />,
			},
			{
				id: 'help',
				label: __( 'Help', 'text-to-speech-reader' ),
				group: 'resources',
				order: 90,
				icon: 'help',
				render: () => <Help context={ context } />,
			},
		];
		const seen = new Set< string >();
		return filterSections( core, context )
			.filter( ( section ) => {
				// Ignore malformed or duplicate sections from extensions.
				const ok =
					section &&
					typeof section.id === 'string' &&
					typeof section.render === 'function' &&
					! seen.has( section.id );
				seen.add( section?.id );
				return ok;
			} )
			.sort(
				( a, b ) => groupRank( a ) - groupRank( b ) || a.order - b.order
			);
	}, [ context ] );

	const groups = useMemo(
		() =>
			filterGroups( {
				core: __( 'Settings', 'text-to-speech-reader' ),
				resources: __( 'Resources', 'text-to-speech-reader' ),
			} ),
		[]
	);

	useEffect( () => {
		const onHash = () => setActive( currentHash() );
		window.addEventListener( 'hashchange', onHash );
		return () => window.removeEventListener( 'hashchange', onHash );
	}, [] );

	const section =
		sections.find( ( item ) => item.id === active ) ?? sections[ 0 ];

	useEffect( () => {
		if ( focusOnChange.current ) {
			focusOnChange.current = false;
			document.getElementById( 'ttsr-section-title' )?.focus();
		}
	}, [ section?.id ] );

	const grouped = sections.reduce< Record< string, AdminSection[] > >(
		( acc, item ) => {
			( acc[ item.group ] ??= [] ).push( item );
			return acc;
		},
		{}
	);

	const isDirty = ( item: AdminSection ) => {
		try {
			return !! item.isDirty?.();
		} catch {
			return false;
		}
	};

	const badges = data.extensions
		.filter( ( extension ) => extension.badge )
		.map( ( extension ) => (
			<Badge key={ extension.id } tone="pro">
				{ extension.badge }
			</Badge>
		) );

	return (
		<div className="ttsr-ui ttsr-admin">
			<PageHeader
				title={ __( 'Text to Speech Reader', 'text-to-speech-reader' ) }
				description={ __(
					'Let visitors listen to your content.',
					'text-to-speech-reader'
				) }
				meta={ sprintf(
					/* translators: %s: version number. */
					__( 'v%s', 'text-to-speech-reader' ),
					data.version
				) }
				badges={ badges }
				actions={
					<>
						<StatusPill
							tone={ status.live ? 'success' : 'neutral' }
						>
							{ status.text }
						</StatusPill>
						{ data.links.samplePost ? (
							<Button
								icon="open_in_new"
								href={ data.links.samplePost }
								target="_blank"
							>
								{ __(
									'View latest post',
									'text-to-speech-reader'
								) }
							</Button>
						) : (
							<Button
								icon="edit_square"
								href={ data.links.newPost }
							>
								{ __(
									'Write a post',
									'text-to-speech-reader'
								) }
							</Button>
						) }
					</>
				}
			/>
			<div className="ttsr-admin__layout">
				<nav
					className="ttsr-admin__nav"
					aria-label={ __(
						'Settings sections',
						'text-to-speech-reader'
					) }
				>
					{ Object.entries( grouped ).map( ( [ group, items ] ) => (
						<div key={ group } className="ttsr-admin__nav-group">
							{ headingLabel( groups[ group ] ) && (
								<p className="ttsr-admin__nav-heading">
									{ headingLabel( groups[ group ] ) }
									{ headingBadge( groups[ group ] ) && (
										<span className="ttsr-admin__nav-badge">
											{ headingBadge( groups[ group ] ) }
										</span>
									) }
								</p>
							) }
							<ul>
								{ items.map( ( item ) => {
									const current = item.id === section?.id;
									return (
										<li key={ item.id }>
											<a
												href={ `#/${ item.id }` }
												className="ttsr-admin__nav-link"
												aria-current={
													current ? 'page' : undefined
												}
												onClick={ () => {
													focusOnChange.current = true;
												} }
											>
												<Icon
													name={
														( item.icon ??
															'article' ) as IconName
													}
													filled={ current }
													className="ttsr-admin__nav-icon"
												/>
												<span className="ttsr-admin__nav-label">
													{ item.label }
												</span>
												{ isDirty( item ) && (
													<span className="ttsr-admin__nav-dot">
														<span className="screen-reader-text">
															{ __(
																'(unsaved changes)',
																'text-to-speech-reader'
															) }
														</span>
													</span>
												) }
											</a>
										</li>
									);
								} ) }
							</ul>
						</div>
					) ) }
				</nav>
				<div
					className={ `ttsr-admin__main${
						section?.preview ? ' has-preview' : ''
					}` }
				>
					<div className="ttsr-admin__content">
						{ section?.render() }
					</div>
					{ section?.preview && (
						<aside className="ttsr-admin__preview">
							<PlayerPreview
								context={ context }
								description={
									typeof section.preview === 'string'
										? section.preview
										: undefined
								}
							/>
						</aside>
					) }
				</div>
			</div>
		</div>
	);
}
