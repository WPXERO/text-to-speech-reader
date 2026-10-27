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
				'text-to-speech-reader'
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
					'text-to-speech-reader'
				),
				draft.voice
			),
		} );
	}

	return (
		<>
			<SectionHeader
				id="ttsr-section-title"
				eyebrow={ __( 'Settings', 'text-to-speech-reader' ) }
				title={ __( 'Voice and playback', 'text-to-speech-reader' ) }
				description={ __(
					'Speech uses the voices installed on each visitor’s device, so the exact voice can differ between visitors.',
					'text-to-speech-reader'
				) }
			/>

			<SettingsPanel
				icon="translate"
				title={ __( 'Language and voice', 'text-to-speech-reader' ) }
				description={ __(
					'If the preferred voice is missing on a device, the player picks another voice for the same language, then the device default.',
					'text-to-speech-reader'
				) }
			>
				<FieldGrid minWidth={ 240 }>
					<TextField
						mono
						label={ __(
							'Reading language',
							'text-to-speech-reader'
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
								'text-to-speech-reader'
							),
							context.data.siteLanguage
						) }
					/>
					<SelectField
						label={ __(
							'Preferred voice',
							'text-to-speech-reader'
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
												'text-to-speech-reader'
											),
											matching.length
										)
									: __(
											'No voices found',
											'text-to-speech-reader'
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
										'text-to-speech-reader'
									)
								: __(
										'Lists the voices in this browser that match the reading language.',
										'text-to-speech-reader'
									)
						}
					/>
				</FieldGrid>
			</SettingsPanel>

			<SettingsPanel
				icon="speed"
				title={ __( 'Playback', 'text-to-speech-reader' ) }
			>
				<RangeField
					label={ __( 'Default speed', 'text-to-speech-reader' ) }
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
						'text-to-speech-reader'
					) }
				/>
				<RangeField
					label={ __( 'Pitch', 'text-to-speech-reader' ) }
					value={ draft.pitch }
					min={ 0.5 }
					max={ 2 }
					step={ 0.05 }
					format={ ( value ) => value.toFixed( 2 ) }
					marks={ [
						{
							value: 0.5,
							label: __( 'Lower', 'text-to-speech-reader' ),
						},
						{
							value: 1,
							label: __( 'Natural', 'text-to-speech-reader' ),
						},
						{
							value: 2,
							label: __( 'Higher', 'text-to-speech-reader' ),
						},
					] }
					onChange={ ( value ) => store.set( 'pitch', value ) }
					error={ errors.pitch }
					help={ __(
						'1 is the voice’s natural pitch. Some voices ignore this.',
						'text-to-speech-reader'
					) }
				/>
				<StatusNotice status="neutral">
					{ __(
						'Long text is read one sentence at a time, which avoids browsers stopping part-way through.',
						'text-to-speech-reader'
					) }
				</StatusNotice>
			</SettingsPanel>

			<SaveActions store={ store } />
		</>
	);
}
