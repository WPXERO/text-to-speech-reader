import { useEffect, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import type { Option } from '../../types';
import {
	FieldGrid,
	RangeField,
	SaveActions,
	SectionHeader,
	SelectField,
	SettingsPanel,
	StatusNotice,
	TextField,
	useStore,
} from '@ttsr/admin-ui';
import type { AdminContext } from '../extensions';

/** Voices installed in the administrator's browser, updated as they load. */
export function useBrowserVoices(): SpeechSynthesisVoice[] {
	const synth =
		typeof window !== 'undefined' ? window.speechSynthesis : undefined;
	const [ voices, setVoices ] = useState< SpeechSynthesisVoice[] >(
		() => synth?.getVoices() ?? []
	);
	useEffect( () => {
		if ( ! synth ) {
			return;
		}
		const update = () => setVoices( synth.getVoices() );
		update();
		synth.addEventListener( 'voiceschanged', update );
		return () => synth.removeEventListener( 'voiceschanged', update );
	}, [ synth ] );
	return voices;
}

export function Voice( { context }: { context: AdminContext } ) {
	const store = context.freeStore;
	const { draft, errors } = useStore( store );
	const voices = useBrowserVoices();
	const lang = draft.lang || context.data.siteLanguage;
	const base = lang.toLowerCase().split( /[-_]/ )[ 0 ];
	const matching = voices.filter( ( voice ) =>
		voice.lang.toLowerCase().startsWith( base )
	);
	const times = ( value: number ) => `${ +value.toFixed( 2 ) }×`;

	const voiceOptions: Option[] = [
		{
			value: '',
			label: __(
				'Automatic (best match for the language)',
				'wpxero-text-to-speech'
			),
		},
		...[ ...matching ]
			.sort( ( a, b ) => a.name.localeCompare( b.name ) )
			.map( ( voice ) => ( {
				value: voice.name,
				label: `${ voice.name } (${ voice.lang })`,
			} ) ),
	];
	if (
		draft.voice &&
		! voiceOptions.some( ( option ) => option.value === draft.voice )
	) {
		voiceOptions.push( {
			value: draft.voice,
			label: sprintf(
				/* translators: %s: voice name. */
				__(
					'%s (not installed in this browser)',
					'wpxero-text-to-speech'
				),
				draft.voice
			),
		} );
	}

	return (
		<>
			<SectionHeader
				id="ttsr-section-title"
				eyebrow={ __( 'Settings', 'wpxero-text-to-speech' ) }
				title={ __( 'Voice and playback', 'wpxero-text-to-speech' ) }
				description={ __(
					'Speech uses the voices installed on each visitor’s device, so the exact voice can differ between visitors.',
					'wpxero-text-to-speech'
				) }
			/>

			<SettingsPanel
				icon="translate"
				title={ __( 'Language and voice', 'wpxero-text-to-speech' ) }
				description={ __(
					'If the preferred voice is missing on a device, the player picks another voice for the same language, then the device default.',
					'wpxero-text-to-speech'
				) }
			>
				<FieldGrid minWidth={ 240 }>
					<TextField
						mono
						label={ __(
							'Reading language',
							'wpxero-text-to-speech'
						) }
						value={ draft.lang }
						placeholder={ context.data.siteLanguage }
						maxLength={ 35 }
						onChange={ ( value ) => store.set( 'lang', value ) }
						error={ errors.lang }
						help={ sprintf(
							/* translators: %s: site language code such as en-US. */
							__(
								'Leave empty to use the site language (%s).',
								'wpxero-text-to-speech'
							),
							context.data.siteLanguage
						) }
					/>
					<SelectField
						label={ __(
							'Preferred voice',
							'wpxero-text-to-speech'
						) }
						aside={
							<span className="ttsr-ui-help">
								{ matching.length
									? sprintf(
											/* translators: %d: number of voices. */
											_n(
												'%d in this browser',
												'%d in this browser',
												matching.length,
												'wpxero-text-to-speech'
											),
											matching.length
										)
									: __(
											'No voices found',
											'wpxero-text-to-speech'
										) }
							</span>
						}
						options={ voiceOptions }
						value={ draft.voice }
						onChange={ ( value ) => store.set( 'voice', value ) }
						error={ errors.voice }
						help={
							voices.length === 0
								? __(
										'This browser reports no speech voices, so only automatic selection is available here.',
										'wpxero-text-to-speech'
									)
								: __(
										'Lists the voices in this browser that match the reading language.',
										'wpxero-text-to-speech'
									)
						}
					/>
				</FieldGrid>
			</SettingsPanel>

			<SettingsPanel
				icon="speed"
				title={ __( 'Playback', 'wpxero-text-to-speech' ) }
			>
				<RangeField
					label={ __( 'Default speed', 'wpxero-text-to-speech' ) }
					value={ draft.rate }
					min={ 0.5 }
					max={ 2 }
					step={ 0.05 }
					format={ times }
					marks={ [ 0.5, 1, 1.5, 2 ].map( ( value ) => ( {
						value,
						label: times( value ),
					} ) ) }
					onChange={ ( value ) => store.set( 'rate', value ) }
					error={ errors.rate }
					help={ __(
						'1 is normal speed. Between 0.5 and 2.',
						'wpxero-text-to-speech'
					) }
				/>
				<RangeField
					label={ __( 'Pitch', 'wpxero-text-to-speech' ) }
					value={ draft.pitch }
					min={ 0.5 }
					max={ 2 }
					step={ 0.05 }
					format={ ( value ) => value.toFixed( 2 ) }
					marks={ [
						{
							value: 0.5,
							label: __( 'Lower', 'wpxero-text-to-speech' ),
						},
						{
							value: 1,
							label: __( 'Natural', 'wpxero-text-to-speech' ),
						},
						{
							value: 2,
							label: __( 'Higher', 'wpxero-text-to-speech' ),
						},
					] }
					onChange={ ( value ) => store.set( 'pitch', value ) }
					error={ errors.pitch }
					help={ __(
						'1 is the voice’s natural pitch. Some voices ignore this.',
						'wpxero-text-to-speech'
					) }
				/>
				<StatusNotice status="neutral">
					{ __(
						'Long text is read one sentence at a time, which avoids browsers stopping part-way through.',
						'wpxero-text-to-speech'
					) }
				</StatusNotice>
			</SettingsPanel>

			<SaveActions store={ store } />
		</>
	);
}
