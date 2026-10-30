import { __, sprintf } from '@wordpress/i18n';
import {
	Badge,
	CheckboxGroupField,
	ChoiceField,
	SaveActions,
	SectionHeader,
	SettingsPanel,
	ToggleField,
	useStore,
} from '@ttsr/admin-ui';
import type { Option } from '../../types';
import type { AdminContext } from '../extensions';
import { PlacementSketch } from '../sketches';

export function General( { context }: { context: AdminContext } ) {
	const store = context.freeStore;
	const { draft, errors } = useStore( store );
	const { data } = context;

	return (
		<>
			<SectionHeader
				id="ttsr-section-title"
				eyebrow={ __( 'Settings', 'wpxero-text-to-speech' ) }
				title={ __( 'General', 'wpxero-text-to-speech' ) }
				description={ __(
					'Choose where the player appears automatically. You can also place it by hand with the block or the shortcode.',
					'wpxero-text-to-speech'
				) }
			/>

			<SettingsPanel
				icon="bolt"
				title={ __( 'Automatic insertion', 'wpxero-text-to-speech' ) }
				description={ __(
					'Adds the player to the main content of single posts and pages. It is never added to archives, feeds or excerpts.',
					'wpxero-text-to-speech'
				) }
			>
				<ToggleField
					label={ __(
						'Add the player automatically',
						'wpxero-text-to-speech'
					) }
					value={ draft.auto_insert }
					onChange={ ( value ) => store.set( 'auto_insert', value ) }
					error={ errors.auto_insert }
					help={ __(
						'Individual posts can opt out from the “WPXERO Text to Speech” panel in the editor.',
						'wpxero-text-to-speech'
					) }
				/>
				<CheckboxGroupField
					label={ __( 'Content types', 'wpxero-text-to-speech' ) }
					options={ data.postTypes }
					value={ draft.post_types }
					onChange={ ( value ) => store.set( 'post_types', value ) }
					error={ errors.post_types }
					disabled={ ! draft.auto_insert }
				/>
				<ChoiceField
					label={ __( 'Placement', 'wpxero-text-to-speech' ) }
					options={ withCurrent(
						data.placements,
						draft.placement
					).map( ( option ) => ( {
						...option,
						badge: option.badge ? (
							<Badge tone="pro">{ option.badge }</Badge>
						) : undefined,
						preview: <PlacementSketch value={ option.value } />,
					} ) ) }
					value={ draft.placement }
					onChange={ ( value ) => store.set( 'placement', value ) }
					error={ errors.placement }
					disabled={ ! draft.auto_insert }
				/>
			</SettingsPanel>

			<SettingsPanel
				icon="article"
				title={ __( 'What is read', 'wpxero-text-to-speech' ) }
				description={ __(
					'Scripts, forms, navigation, hidden elements and the player itself are always skipped.',
					'wpxero-text-to-speech'
				) }
			>
				<ToggleField
					label={ __(
						'Read the title first',
						'wpxero-text-to-speech'
					) }
					value={ draft.include_title }
					onChange={ ( value ) =>
						store.set( 'include_title', value )
					}
					error={ errors.include_title }
				/>
			</SettingsPanel>

			<SettingsPanel
				icon="database"
				tone="danger"
				title={ __( 'Data', 'wpxero-text-to-speech' ) }
				description={ __(
					'Settings are kept when the plugin is deactivated or updated.',
					'wpxero-text-to-speech'
				) }
			>
				<ToggleField
					label={ __(
						'Delete settings when the plugin is deleted',
						'wpxero-text-to-speech'
					) }
					tone="danger"
					value={ draft.delete_data_on_uninstall }
					onChange={ ( value ) =>
						store.set( 'delete_data_on_uninstall', value )
					}
					error={ errors.delete_data_on_uninstall }
					help={ __(
						'Removes this plugin’s settings and per-post options when you delete it from the Plugins screen.',
						'wpxero-text-to-speech'
					) }
				/>
			</SettingsPanel>

			<SaveActions
				store={ store }
				resetLabel={ __( 'Restore defaults', 'wpxero-text-to-speech' ) }
				resetDescription={ __(
					'All WPXERO Text to Speech settings return to their defaults. Per-post choices are kept.',
					'wpxero-text-to-speech'
				) }
			/>
		</>
	);
}

/**
 * Keeps a stored value that is no longer registered (for example a placement
 * from a deactivated extension) visible instead of silently changing it.
 *
 * @param options Registered options.
 * @param current Stored value.
 */
export function withCurrent( options: Option[], current: string ): Option[] {
	if ( ! current || options.some( ( option ) => option.value === current ) ) {
		return options;
	}
	return [
		...options,
		{
			value: current,
			label: sprintf(
				/* translators: %s: internal name of an option that is not currently available. */
				__( 'Unavailable: %s', 'wpxero-text-to-speech' ),
				current
			),
		},
	];
}
