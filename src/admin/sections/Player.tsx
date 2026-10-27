import { __ } from '@wordpress/i18n';
import {
	Badge,
	ChoiceField,
	SaveActions,
	SectionHeader,
	SettingsPanel,
	StatusNotice,
	ToggleField,
	useStore,
} from '@ttsr/admin-ui';
import type { AdminContext } from '../extensions';
import { LayoutSketch } from '../sketches';
import { withCurrent } from './General';

export function Player( { context }: { context: AdminContext } ) {
	const store = context.freeStore;
	const { draft, errors } = useStore( store );
	const layoutAvailable = context.data.layouts.some(
		( layout ) => layout.value === draft.layout
	);

	return (
		<>
			<SectionHeader
				id="ttsr-section-title"
				eyebrow={ __( 'Settings', 'text-to-speech-reader' ) }
				title={ __( 'Player', 'text-to-speech-reader' ) }
				description={ __(
					'Choose how the player looks and which controls visitors get.',
					'text-to-speech-reader'
				) }
			/>

			{ ! layoutAvailable && (
				<StatusNotice status="warning">
					{ __(
						'The saved layout is not available, so visitors see the Standard layout. It was probably provided by an extension that is no longer active.',
						'text-to-speech-reader'
					) }
				</StatusNotice>
			) }

			<SettingsPanel
				icon="dashboard_customize"
				title={ __( 'Layout', 'text-to-speech-reader' ) }
				description={ __(
					'Standard shows the controls in a panel. Button only shows a single Listen button.',
					'text-to-speech-reader'
				) }
			>
				<ChoiceField
					label={ __( 'Layout', 'text-to-speech-reader' ) }
					indicator="check"
					hideLabel
					minWidth={ 138 }
					options={ withCurrent(
						context.data.layouts,
						draft.layout
					).map( ( option ) => ( {
						...option,
						badge: option.badge ? (
							<Badge tone="pro">{ option.badge }</Badge>
						) : undefined,
						preview: <LayoutSketch value={ option.value } />,
					} ) ) }
					value={ draft.layout }
					onChange={ ( value ) => store.set( 'layout', value ) }
					error={ errors.layout }
				/>
			</SettingsPanel>

			<SettingsPanel
				icon="tune"
				title={ __( 'Visitor controls', 'text-to-speech-reader' ) }
				description={ __(
					'Visitors’ choices are remembered in their own browser only.',
					'text-to-speech-reader'
				) }
			>
				<ToggleField
					label={ __(
						'Let visitors choose a voice',
						'text-to-speech-reader'
					) }
					value={ draft.allow_voice_select }
					onChange={ ( value ) =>
						store.set( 'allow_voice_select', value )
					}
					error={ errors.allow_voice_select }
					help={ __(
						'Lists the voices installed in the visitor’s browser.',
						'text-to-speech-reader'
					) }
				/>
				<ToggleField
					label={ __(
						'Let visitors choose the speed',
						'text-to-speech-reader'
					) }
					value={ draft.allow_rate_select }
					onChange={ ( value ) =>
						store.set( 'allow_rate_select', value )
					}
					error={ errors.allow_rate_select }
				/>
			</SettingsPanel>

			<SaveActions store={ store } />
		</>
	);
}
