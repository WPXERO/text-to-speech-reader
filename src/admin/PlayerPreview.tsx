/**
 * Live preview that mounts the real frontend player (window.TTSR) against
 * a sample article, using the unsaved draft settings.
 */
import { useEffect, useReducer, useRef } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import type { PlayerConfig } from '../types';
import {
	EmptyState,
	Icon,
	PreviewArea,
	useStore,
	useStoresSummary,
} from '@ttsr/admin-ui';
import type { AdminContext } from './extensions';
import {
	filterPreviewConfig,
	filterPreviewStores,
	filterPreviewStyle,
} from './extensions';

export function PlayerPreview( props: {
	context: AdminContext;
	description?: string;
} ) {
	const { context } = props;
	const { draft } = useStore( context.freeStore );
	const { dirty } = useStoresSummary();
	const holder = useRef< HTMLDivElement >( null );
	const article = useRef< HTMLDivElement >( null );
	const [ , refresh ] = useReducer( ( count: number ) => count + 1, 0 );

	// Re-render when an extension's settings (e.g. Pro colours) change.
	const stores = filterPreviewStores( [], context );
	useEffect( () => {
		const unsubscribe = stores.map( ( store ) =>
			store.subscribe( refresh )
		);
		return () => unsubscribe.forEach( ( fn ) => fn() );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ stores.length ] );

	const sampleTitle = __(
		'A short article to try the player',
		'text-to-speech-reader'
	);
	const config = filterPreviewConfig(
		{
			id: 'ttsr-preview',
			source: 'preview',
			title: sampleTitle,
			includeTitle: draft.include_title,
			layout: draft.layout,
			lang: draft.lang || context.data.siteLanguage,
			voice: draft.voice,
			rate: draft.rate,
			pitch: draft.pitch,
			allowVoiceSelect: draft.allow_voice_select,
			allowRateSelect: draft.allow_rate_select,
			labels: context.data.labels,
		},
		context
	);
	const style = filterPreviewStyle( {}, context );
	const configKey = JSON.stringify( config );
	const styleKey = JSON.stringify( style );
	const api = window.TTSR;

	useEffect( () => {
		if ( ! api || ! holder.current || ! article.current ) {
			return;
		}
		const element = document.createElement( 'div' );
		element.className = `ttsr-player ttsr-player--${ config.layout ?? 'standard' }`;
		element.setAttribute( 'role', 'region' );
		element.setAttribute(
			'aria-label',
			__( 'Player preview', 'text-to-speech-reader' )
		);
		for ( const [ name, value ] of Object.entries( style ) ) {
			if ( /^--ttsrp?-[a-z0-9-]+$/.test( name ) ) {
				element.style.setProperty( name, value );
			}
		}
		holder.current.append( element );
		api.mount( element, {
			config: config as Partial< PlayerConfig >,
			contentRoot: article.current,
		} );
		return () => {
			api.unmount( element );
			element.remove();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ api, configKey, styleKey ] );

	const rate = `${ +draft.rate.toFixed( 2 ) }×`;
	const pitch = draft.pitch.toFixed( 1 );

	return (
		<PreviewArea
			title={ __( 'Live preview', 'text-to-speech-reader' ) }
			badge={
				dirty && (
					<span className="ttsr-admin-preview__badge">
						{ __( 'Unsaved changes', 'text-to-speech-reader' ) }
					</span>
				)
			}
			description={
				props.description ??
				__(
					'Uses your unsaved changes and this browser’s voices. Visitors hear the voices installed on their own devices.',
					'text-to-speech-reader'
				)
			}
			footer={
				<>
					<span>
						<Icon name="record_voice_over" size={ 16 } />
						<span className="ttsr-admin-preview__voice">
							{ draft.voice ||
								__(
									'Automatic voice',
									'text-to-speech-reader'
								) }
						</span>
					</span>
					<span>
						<Icon name="speed" size={ 16 } />
						{ rate }
					</span>
					<span>
						<Icon name="graphic_eq" size={ 16 } />
						{ sprintf(
							/* translators: %s: pitch value such as 1.0. */
							__( 'Pitch %s', 'text-to-speech-reader' ),
							pitch
						) }
					</span>
				</>
			}
		>
			{ ! api && (
				<EmptyState
					title={ __(
						'The player script did not load.',
						'text-to-speech-reader'
					) }
				>
					<p>
						{ __(
							'Another plugin or a browser extension may be blocking scripts on this page.',
							'text-to-speech-reader'
						) }
					</p>
				</EmptyState>
			) }
			<div className="ttsr-admin-preview">
				<div className="ttsr-admin-preview__chrome" aria-hidden="true">
					<span />
					<span />
					<span />
					<span className="ttsr-admin-preview__url">
						yoursite.com/a-short-article
					</span>
				</div>
				<div
					className={ `ttsr-admin-preview__page${
						draft.placement === 'after' ? ' is-after' : ''
					}` }
				>
					<p className="ttsr-admin-preview__title" data-ttsr-skip>
						{ sampleTitle }
					</p>
					<div
						ref={ holder }
						className="ttsr-admin-preview__player"
					/>
					<div
						ref={ article }
						className="ttsr-admin-preview__article"
					>
						<p>
							{ __(
								'Text to Speech Reader reads your content aloud with the speech voices built into the visitor’s browser.',
								'text-to-speech-reader'
							) }
						</p>
						<p>
							{ __(
								'Nothing is sent to an external service. Choose a voice and a speed, then press the button to listen.',
								'text-to-speech-reader'
							) }
						</p>
					</div>
				</div>
			</div>
		</PreviewArea>
	);
}
