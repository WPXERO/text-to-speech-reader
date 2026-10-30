/**
 * Admin building blocks shared by the Free app and extension sections.
 *
 * Plain HTML controls styled by ui.scss (scoped under `.ttsr-ui`), so the
 * settings screen has its own look without a UI framework. Help and error
 * text is linked to its control with aria-describedby; errors are announced
 * as text, not only by colour.
 */
import { Modal } from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { useInstanceId } from '@wordpress/compose';
import type { CSSProperties, ReactNode } from 'react';
import { __, _n, sprintf } from '@wordpress/i18n';
import type { Option } from '../types';
import { isHexColor } from '../utils/validation';
import { ICON_DATA } from './icon-data';
import type { SettingsStore } from './store';
import { discardAll, saveAll, useStoresSummary } from './store';

export type IconName = keyof typeof ICON_DATA;
export type Tone = 'accent' | 'pro' | 'danger';

const cx = ( ...names: ( string | false | null | undefined )[] ) =>
	names.filter( Boolean ).join( ' ' );

/**
 * Material Symbols Rounded icon, drawn inline. Decorative unless `label` is set.
 */
export function Icon( props: {
	name: IconName;
	filled?: boolean;
	size?: number;
	label?: string;
	className?: string;
} ) {
	const data = ICON_DATA[ props.name ] as readonly string[];
	if ( ! data ) {
		return null;
	}
	const size = props.size ?? 20;
	return (
		<svg
			className={ cx( 'ttsr-ui-icon', props.className ) }
			width={ size }
			height={ size }
			viewBox="0 -960 960 960"
			fill="currentColor"
			focusable="false"
			aria-hidden={ props.label ? undefined : true }
			role={ props.label ? 'img' : undefined }
			aria-label={ props.label }
		>
			<path d={ ( props.filled && data[ 1 ] ) || data[ 0 ] } />
		</svg>
	);
}

export function Spinner( props: { className?: string } ) {
	return (
		<span
			className={ cx( 'ttsr-ui-spinner', props.className ) }
			aria-hidden="true"
		/>
	);
}

export function Button( props: {
	variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'link';
	size?: 'default' | 'small';
	icon?: IconName;
	iconFilled?: boolean;
	href?: string;
	target?: string;
	onClick?: () => void;
	disabled?: boolean;
	busy?: boolean;
	/** Accessible name, required for icon-only buttons. */
	label?: string;
	title?: string;
	pressed?: boolean;
	className?: string;
	children?: ReactNode;
} ) {
	const className = cx(
		'ttsr-ui-button',
		`is-${ props.variant ?? 'secondary' }`,
		props.size === 'small' && 'is-small',
		! props.children && 'is-icon-only',
		props.busy && 'is-busy',
		props.className
	);
	const content = (
		<>
			{ props.busy && <Spinner /> }
			{ ! props.busy && props.icon && (
				<Icon
					name={ props.icon }
					filled={ props.iconFilled }
					size={ 18 }
				/>
			) }
			{ props.children }
		</>
	);
	if ( props.href && ! props.disabled ) {
		return (
			<a
				className={ className }
				href={ props.href }
				target={ props.target }
				rel={ props.target === '_blank' ? 'noreferrer' : undefined }
				aria-label={ props.label }
				title={ props.title }
				onClick={ props.onClick }
			>
				{ content }
			</a>
		);
	}
	return (
		<button
			type="button"
			className={ className }
			onClick={ props.onClick }
			disabled={ props.disabled }
			aria-busy={ props.busy || undefined }
			aria-label={ props.label }
			aria-pressed={ props.pressed }
			title={ props.title }
		>
			{ content }
		</button>
	);
}

export function Badge( props: {
	tone?: 'pro' | 'neutral' | 'accent';
	children: ReactNode;
} ) {
	return (
		<span
			className={ cx(
				'ttsr-ui-badge',
				`is-${ props.tone ?? 'neutral' }`
			) }
		>
			{ props.children }
		</span>
	);
}

/** Rounded status label with a dot, e.g. "Active". */
export function StatusPill( props: {
	tone?: 'success' | 'neutral' | 'warning';
	children: ReactNode;
} ) {
	return (
		<span
			className={ cx(
				'ttsr-ui-pill',
				`is-${ props.tone ?? 'neutral' }`
			) }
		>
			<span className="ttsr-ui-pill__dot" aria-hidden="true" />
			{ props.children }
		</span>
	);
}

export function PageHeader( props: {
	title: string;
	description?: ReactNode;
	/** Shown in a small chip next to the title, e.g. the version. */
	meta?: ReactNode;
	icon?: IconName;
	badges?: ReactNode;
	actions?: ReactNode;
} ) {
	return (
		<header className="ttsr-ui-page-header">
			<span className="ttsr-ui-page-header__logo" aria-hidden="true">
				<Icon name={ props.icon ?? 'graphic_eq' } filled size={ 26 } />
			</span>
			<div className="ttsr-ui-page-header__text">
				<div className="ttsr-ui-page-header__title-row">
					<h1 className="ttsr-ui-page-header__title">
						{ props.title }
					</h1>
					{ props.meta && (
						<span className="ttsr-ui-page-header__meta">
							{ props.meta }
						</span>
					) }
					{ props.badges }
				</div>
				{ props.description && (
					<p className="ttsr-ui-page-header__description">
						{ props.description }
					</p>
				) }
			</div>
			{ props.actions && (
				<div className="ttsr-ui-page-header__actions">
					{ props.actions }
				</div>
			) }
		</header>
	);
}

export function SectionHeader( props: {
	title: string;
	description?: ReactNode;
	id?: string;
	/** Small label above the title, e.g. "Settings". */
	eyebrow?: string;
	tone?: 'accent' | 'pro';
} ) {
	return (
		<div className="ttsr-ui-section-header">
			{ props.eyebrow && (
				<p
					className={ cx(
						'ttsr-ui-section-header__eyebrow',
						props.tone === 'pro' && 'is-pro'
					) }
				>
					{ props.eyebrow }
				</p>
			) }
			<h2
				id={ props.id }
				tabIndex={ -1 }
				className="ttsr-ui-section-header__title"
			>
				{ props.title }
			</h2>
			{ props.description && (
				<p className="ttsr-ui-section-header__description">
					{ props.description }
				</p>
			) }
		</div>
	);
}

function IconTile( props: { icon: IconName; tone?: Tone; large?: boolean } ) {
	return (
		<span
			className={ cx(
				'ttsr-ui-icon-tile',
				`is-${ props.tone ?? 'accent' }`,
				props.large && 'is-large'
			) }
			aria-hidden="true"
		>
			<Icon name={ props.icon } size={ props.large ? 22 : 20 } />
		</span>
	);
}

/**
 * A card with a heading. Each child is laid out as a row of the card.
 */
export function SettingsPanel( props: {
	title: string;
	description?: ReactNode;
	icon?: IconName;
	tone?: Tone;
	/** Shown at the end of the heading, e.g. a status pill or a count. */
	aside?: ReactNode;
	children?: ReactNode;
} ) {
	return (
		<section className="ttsr-ui-panel">
			<div className="ttsr-ui-panel__intro">
				{ props.icon && (
					<IconTile icon={ props.icon } tone={ props.tone } />
				) }
				<div className="ttsr-ui-panel__heading">
					<h3 className="ttsr-ui-panel__title">{ props.title }</h3>
					{ props.description && (
						<HelpText>{ props.description }</HelpText>
					) }
				</div>
				{ props.aside && (
					<div className="ttsr-ui-panel__aside">{ props.aside }</div>
				) }
			</div>
			{ props.children && (
				<div className="ttsr-ui-panel__body">{ props.children }</div>
			) }
		</section>
	);
}

/** Lays out several fields side by side in one panel row. */
export function FieldGrid( props: { children: ReactNode; minWidth?: number } ) {
	return (
		<div
			className="ttsr-ui-grid"
			style={
				{
					'--ttsr-ui-grid-min': `${ props.minWidth ?? 220 }px`,
				} as CSSProperties
			}
		>
			{ props.children }
		</div>
	);
}

export function HelpText( props: { children: ReactNode; id?: string } ) {
	return (
		<p className="ttsr-ui-help" id={ props.id }>
			{ props.children }
		</p>
	);
}

function Feedback( props: { id: string; help?: ReactNode; error?: string } ) {
	if ( props.error ) {
		return (
			<p className="ttsr-ui-help ttsr-ui-error" id={ props.id }>
				<Icon name="error" filled size={ 16 } />
				<span>
					<span className="screen-reader-text">
						{ __( 'Error:', 'wpxero-text-to-speech' ) }{ ' ' }
					</span>
					{ props.error }
				</span>
			</p>
		);
	}
	return props.help ? (
		<HelpText id={ props.id }>{ props.help }</HelpText>
	) : null;
}

interface FieldProps< V > {
	label: string;
	value: V;
	onChange: ( value: V ) => void;
	help?: ReactNode;
	error?: string;
	disabled?: boolean;
}

function useFieldIds( prefix: string ) {
	const id = useInstanceId( useFieldIds, prefix ) as string;
	return { id, helpId: `${ id }__help` };
}

function FieldShell( props: {
	id: string;
	helpId: string;
	label: string;
	help?: ReactNode;
	error?: string;
	aside?: ReactNode;
	disabled?: boolean;
	children: ReactNode;
} ) {
	return (
		<div
			className={ cx(
				'ttsr-ui-field',
				props.disabled && 'is-disabled',
				props.error && 'has-error'
			) }
		>
			<div className="ttsr-ui-field__head">
				<label className="ttsr-ui-label" htmlFor={ props.id }>
					{ props.label }
				</label>
				{ props.aside }
			</div>
			{ props.children }
			<Feedback
				id={ props.helpId }
				help={ props.help }
				error={ props.error }
			/>
		</div>
	);
}

export function ToggleField(
	props: FieldProps< boolean > & { tone?: 'accent' | 'danger' }
) {
	const { id, helpId } = useFieldIds( 'ttsr-ui-toggle' );
	const described = props.help || props.error;
	return (
		<div
			className={ cx(
				'ttsr-ui-field ttsr-ui-toggle',
				props.disabled && 'is-disabled',
				props.error && 'has-error'
			) }
		>
			<div className="ttsr-ui-toggle__text">
				<label className="ttsr-ui-toggle__label" htmlFor={ id }>
					{ props.label }
				</label>
				<Feedback
					id={ helpId }
					help={ props.help }
					error={ props.error }
				/>
			</div>
			<button
				id={ id }
				type="button"
				role="switch"
				aria-checked={ props.value }
				aria-describedby={ described ? helpId : undefined }
				className={ cx(
					'ttsr-ui-switch',
					props.tone === 'danger' && 'is-danger'
				) }
				disabled={ props.disabled }
				onClick={ () => props.onChange( ! props.value ) }
			>
				<span className="ttsr-ui-switch__knob" />
			</button>
		</div>
	);
}

export function SelectField(
	props: FieldProps< string > & { options: Option[]; aside?: ReactNode }
) {
	const { id, helpId } = useFieldIds( 'ttsr-ui-select' );
	return (
		<FieldShell { ...props } id={ id } helpId={ helpId }>
			<div className="ttsr-ui-select">
				<select
					id={ id }
					className="ttsr-ui-input"
					value={ props.value }
					disabled={ props.disabled }
					aria-invalid={ props.error ? true : undefined }
					aria-describedby={
						props.help || props.error ? helpId : undefined
					}
					onChange={ ( event ) =>
						props.onChange( event.target.value )
					}
				>
					{ props.options.map( ( option ) => (
						<option key={ option.value } value={ option.value }>
							{ option.label }
						</option>
					) ) }
				</select>
				<Icon
					name="keyboard_arrow_down"
					className="ttsr-ui-select__icon"
				/>
			</div>
		</FieldShell>
	);
}

export function TextField(
	props: FieldProps< string > & {
		placeholder?: string;
		maxLength?: number;
		/** Monospace, for codes such as language tags and selectors. */
		mono?: boolean;
	}
) {
	const { id, helpId } = useFieldIds( 'ttsr-ui-text' );
	return (
		<FieldShell { ...props } id={ id } helpId={ helpId }>
			<input
				id={ id }
				type="text"
				className={ cx( 'ttsr-ui-input', props.mono && 'is-mono' ) }
				value={ props.value }
				placeholder={ props.placeholder }
				maxLength={ props.maxLength }
				disabled={ props.disabled }
				aria-invalid={ props.error ? true : undefined }
				aria-describedby={
					props.help || props.error ? helpId : undefined
				}
				onChange={ ( event ) => props.onChange( event.target.value ) }
			/>
		</FieldShell>
	);
}

export function NumberField(
	props: FieldProps< number > & {
		min: number;
		max: number;
		step: number;
		/** Adds − and + buttons that change the value by this amount. */
		stepper?: number;
	}
) {
	const { id, helpId } = useFieldIds( 'ttsr-ui-number' );
	const input = (
		<input
			id={ id }
			type="number"
			className="ttsr-ui-input is-mono"
			value={
				Number.isFinite( props.value ) ? String( props.value ) : ''
			}
			min={ props.min }
			max={ props.max }
			step={ props.step }
			disabled={ props.disabled }
			aria-invalid={ props.error ? true : undefined }
			aria-describedby={ props.help || props.error ? helpId : undefined }
			onChange={ ( event ) =>
				props.onChange(
					event.target.value === ''
						? NaN
						: Number( event.target.value )
				)
			}
		/>
	);
	const by = ( delta: number ) => {
		const base = Number.isFinite( props.value ) ? props.value : props.min;
		props.onChange(
			Math.min( props.max, Math.max( props.min, base + delta ) )
		);
	};
	return (
		<FieldShell { ...props } id={ id } helpId={ helpId }>
			{ props.stepper ? (
				<div className="ttsr-ui-stepper">
					<Button
						variant="tertiary"
						icon="remove"
						label={ __( 'Decrease', 'wpxero-text-to-speech' ) }
						disabled={ props.disabled || props.value <= props.min }
						onClick={ () => by( -props.stepper! ) }
					/>
					{ input }
					<Button
						variant="tertiary"
						icon="add"
						label={ __( 'Increase', 'wpxero-text-to-speech' ) }
						disabled={ props.disabled || props.value >= props.max }
						onClick={ () => by( props.stepper! ) }
					/>
				</div>
			) : (
				<div className="ttsr-ui-number">{ input }</div>
			) }
		</FieldShell>
	);
}

/** Slider with the current value shown in a chip. */
export function RangeField(
	props: FieldProps< number > & {
		min: number;
		max: number;
		step: number;
		format?: ( value: number ) => string;
		/** Labels shown under the track. */
		marks?: { value: number; label: string }[];
	}
) {
	const { id, helpId } = useFieldIds( 'ttsr-ui-range' );
	const format = props.format ?? String;
	const value = Number.isFinite( props.value ) ? props.value : props.min;
	const percent = ( v: number ) =>
		( ( v - props.min ) / ( props.max - props.min ) ) * 100;
	return (
		<div
			className={ cx(
				'ttsr-ui-field ttsr-ui-range',
				props.disabled && 'is-disabled',
				props.error && 'has-error'
			) }
		>
			<div className="ttsr-ui-range__head">
				<div className="ttsr-ui-toggle__text">
					<label className="ttsr-ui-toggle__label" htmlFor={ id }>
						{ props.label }
					</label>
					<Feedback
						id={ helpId }
						help={ props.help }
						error={ props.error }
					/>
				</div>
				<output className="ttsr-ui-value-chip" htmlFor={ id }>
					{ format( value ) }
				</output>
			</div>
			<input
				id={ id }
				type="range"
				className="ttsr-ui-range__input"
				min={ props.min }
				max={ props.max }
				step={ props.step }
				value={ value }
				disabled={ props.disabled }
				aria-valuetext={ format( value ) }
				aria-describedby={
					props.help || props.error ? helpId : undefined
				}
				style={
					{
						'--ttsr-ui-range-fill': `${ percent( value ) }%`,
					} as CSSProperties
				}
				onChange={ ( event ) =>
					props.onChange( Number( event.target.value ) )
				}
			/>
			{ props.marks && (
				<div className="ttsr-ui-range__marks" aria-hidden="true">
					{ props.marks.map( ( mark ) => (
						<span
							key={ mark.value }
							style={ { left: `${ percent( mark.value ) }%` } }
						>
							{ mark.label }
						</span>
					) ) }
				</div>
			) }
		</div>
	);
}

/**
 * Checkbox group for choosing several values, shown as toggle chips.
 */
export function CheckboxGroupField(
	props: FieldProps< string[] > & { options: Option[] }
) {
	const { id, helpId } = useFieldIds( 'ttsr-ui-check' );
	const toggle = ( value: string, checked: boolean ) =>
		props.onChange(
			checked
				? [ ...props.value, value ]
				: props.value.filter( ( item ) => item !== value )
		);
	return (
		<fieldset
			className={ cx(
				'ttsr-ui-field ttsr-ui-fieldset',
				props.disabled && 'is-disabled',
				props.error && 'has-error'
			) }
			aria-describedby={ props.help || props.error ? helpId : undefined }
		>
			<legend className="ttsr-ui-label">{ props.label }</legend>
			<div className="ttsr-ui-chips">
				{ props.options.map( ( option ) => {
					const checked = props.value.includes( option.value );
					return (
						<label
							key={ option.value }
							htmlFor={ `${ id }-${ option.value }` }
							className={ cx(
								'ttsr-ui-chip',
								checked && 'is-checked'
							) }
						>
							<input
								id={ `${ id }-${ option.value }` }
								type="checkbox"
								className="ttsr-ui-visually-hidden"
								checked={ checked }
								disabled={ props.disabled }
								onChange={ ( event ) =>
									toggle( option.value, event.target.checked )
								}
							/>
							<Icon
								name={
									checked
										? 'check_box'
										: 'check_box_outline_blank'
								}
								filled={ checked }
							/>
							{ option.label }
						</label>
					);
				} ) }
			</div>
			<Feedback id={ helpId } help={ props.help } error={ props.error } />
		</fieldset>
	);
}

export interface ChoiceOption extends Omit< Option, 'badge' > {
	description?: ReactNode;
	/** Illustration shown above the label. */
	preview?: ReactNode;
	badge?: ReactNode;
	disabled?: boolean;
}

/**
 * Single choice shown as selectable cards (radio buttons underneath).
 */
export function ChoiceField(
	props: FieldProps< string > & {
		options: ChoiceOption[];
		/** `check` marks the selected card with a tick instead of a radio. */
		indicator?: 'radio' | 'check';
		minWidth?: number;
		/** Hides the legend visually, e.g. when the panel title says it. */
		hideLabel?: boolean;
	}
) {
	const { id, helpId } = useFieldIds( 'ttsr-ui-choice' );
	const indicator = props.indicator ?? 'radio';
	return (
		<fieldset
			className={ cx(
				'ttsr-ui-field ttsr-ui-fieldset',
				props.hideLabel && 'has-hidden-label',
				props.disabled && 'is-disabled',
				props.error && 'has-error'
			) }
			aria-describedby={ props.help || props.error ? helpId : undefined }
		>
			<legend className="ttsr-ui-label">{ props.label }</legend>
			<div
				className="ttsr-ui-choices"
				style={
					{
						'--ttsr-ui-grid-min': `${ props.minWidth ?? 180 }px`,
					} as CSSProperties
				}
			>
				{ props.options.map( ( option ) => {
					const selected = option.value === props.value;
					const disabled = props.disabled || option.disabled;
					return (
						<label
							key={ option.value }
							htmlFor={ `${ id }-${ option.value }` }
							className={ cx(
								'ttsr-ui-choice',
								selected && 'is-selected',
								disabled && 'is-disabled'
							) }
						>
							<input
								id={ `${ id }-${ option.value }` }
								type="radio"
								name={ id }
								className="ttsr-ui-visually-hidden"
								value={ option.value }
								checked={ selected }
								disabled={ disabled }
								onChange={ () =>
									props.onChange( option.value )
								}
							/>
							{ option.preview && (
								<span
									className="ttsr-ui-choice__preview"
									aria-hidden="true"
								>
									{ option.preview }
								</span>
							) }
							<span className="ttsr-ui-choice__label">
								{ indicator === 'radio' && (
									<Icon
										name={
											selected
												? 'radio_button_checked'
												: 'radio_button_unchecked'
										}
										className="ttsr-ui-choice__radio"
									/>
								) }
								<span className="ttsr-ui-choice__text">
									<span className="ttsr-ui-choice__title">
										{ option.label }
									</span>
									{ option.description && (
										<span className="ttsr-ui-choice__description">
											{ option.description }
										</span>
									) }
								</span>
								{ option.badge }
								{ indicator === 'check' && selected && (
									<Icon
										name="check_circle"
										filled
										className="ttsr-ui-choice__check"
									/>
								) }
							</span>
						</label>
					);
				} ) }
			</div>
			<Feedback id={ helpId } help={ props.help } error={ props.error } />
		</fieldset>
	);
}

/** Small single choice shown as a segmented control. */
export function SegmentedField(
	props: FieldProps< string > & { options: Option[] }
) {
	const { id, helpId } = useFieldIds( 'ttsr-ui-segmented' );
	return (
		<fieldset
			className={ cx(
				'ttsr-ui-field ttsr-ui-fieldset',
				props.disabled && 'is-disabled'
			) }
			aria-describedby={ props.help || props.error ? helpId : undefined }
		>
			<legend className="ttsr-ui-label">{ props.label }</legend>
			<div className="ttsr-ui-segmented">
				{ props.options.map( ( option ) => (
					<label
						key={ option.value }
						htmlFor={ `${ id }-${ option.value }` }
						className={ cx(
							'ttsr-ui-segmented__item',
							option.value === props.value && 'is-selected'
						) }
					>
						<input
							id={ `${ id }-${ option.value }` }
							type="radio"
							name={ id }
							className="ttsr-ui-visually-hidden"
							checked={ option.value === props.value }
							disabled={ props.disabled }
							onChange={ () => props.onChange( option.value ) }
						/>
						{ option.label }
					</label>
				) ) }
			</div>
			<Feedback id={ helpId } help={ props.help } error={ props.error } />
		</fieldset>
	);
}

const sixDigits = ( hex: string ) =>
	hex.length === 4
		? '#' +
			hex
				.slice( 1 )
				.split( '' )
				.map( ( c ) => c + c )
				.join( '' )
		: hex;

/**
 * Hex colour with a swatch that opens the browser's colour picker.
 */
export function ColorField(
	props: FieldProps< string > & {
		allowEmpty?: boolean;
		/** Colour used while the value is empty. */
		placeholder?: string;
		presets?: string[];
	}
) {
	const { id, helpId } = useFieldIds( 'ttsr-ui-color' );
	const valid = isHexColor( props.value );
	const fallback = props.placeholder ?? '#000000';
	return (
		<FieldShell { ...props } id={ id } helpId={ helpId }>
			<div className="ttsr-ui-color">
				<span
					className={ cx(
						'ttsr-ui-color__swatch',
						! valid && 'is-empty'
					) }
					style={ valid ? { background: props.value } : undefined }
				>
					<input
						type="color"
						aria-label={ sprintf(
							/* translators: %s: setting name, such as "Accent colour". */
							__( 'Pick %s', 'wpxero-text-to-speech' ),
							props.label
						) }
						value={ sixDigits( valid ? props.value : fallback ) }
						disabled={ props.disabled }
						onChange={ ( event ) =>
							props.onChange( event.target.value )
						}
					/>
				</span>
				<input
					id={ id }
					type="text"
					className="ttsr-ui-input is-mono ttsr-ui-color__hex"
					value={ props.value }
					placeholder={ fallback }
					maxLength={ 7 }
					disabled={ props.disabled }
					aria-invalid={ props.error ? true : undefined }
					aria-describedby={
						props.help || props.error ? helpId : undefined
					}
					onChange={ ( event ) =>
						props.onChange( event.target.value.trim() )
					}
				/>
				{ props.presets && (
					<div className="ttsr-ui-color__presets">
						{ props.presets.map( ( color ) => (
							<button
								key={ color }
								type="button"
								className="ttsr-ui-color__preset"
								style={ { background: color } }
								aria-label={ color }
								title={ color }
								aria-pressed={
									props.value.toLowerCase() ===
									color.toLowerCase()
								}
								disabled={ props.disabled }
								onClick={ () => props.onChange( color ) }
							/>
						) ) }
					</div>
				) }
				{ props.allowEmpty && props.value && (
					<Button
						variant="link"
						disabled={ props.disabled }
						onClick={ () => props.onChange( '' ) }
					>
						{ __( 'Use default', 'wpxero-text-to-speech' ) }
					</Button>
				) }
			</div>
		</FieldShell>
	);
}

const NOTICE_ICONS: Record< string, IconName > = {
	success: 'check_circle',
	error: 'error',
	warning: 'warning',
	info: 'info',
	neutral: 'info',
};

export function StatusNotice( props: {
	status: 'success' | 'error' | 'warning' | 'info' | 'neutral';
	children: ReactNode;
	onDismiss?: () => void;
} ) {
	return (
		<div
			className={ cx( 'ttsr-ui-notice', `is-${ props.status }` ) }
			role={ props.status === 'error' ? 'alert' : 'status' }
		>
			<Icon
				name={ NOTICE_ICONS[ props.status ] }
				filled={ props.status !== 'neutral' }
				className="ttsr-ui-notice__icon"
			/>
			<div className="ttsr-ui-notice__body">{ props.children }</div>
			{ props.onDismiss && (
				<Button
					variant="tertiary"
					size="small"
					icon="close"
					label={ __( 'Dismiss', 'wpxero-text-to-speech' ) }
					onClick={ props.onDismiss }
				/>
			) }
		</div>
	);
}

export function LoadingState( props: { label: string } ) {
	return (
		<div className="ttsr-ui-loading" role="status">
			<Spinner />
			<span>{ props.label }</span>
		</div>
	);
}

export function EmptyState( props: { title: string; children?: ReactNode } ) {
	return (
		<div className="ttsr-ui-empty">
			<p className="ttsr-ui-empty__title">{ props.title }</p>
			{ props.children }
		</div>
	);
}

export function PreviewArea( props: {
	title: string;
	description?: ReactNode;
	badge?: ReactNode;
	footer?: ReactNode;
	children: ReactNode;
} ) {
	return (
		<section className="ttsr-ui-preview" aria-label={ props.title }>
			<div className="ttsr-ui-preview__header">
				<div className="ttsr-ui-preview__title-row">
					<Icon name="visibility" className="ttsr-ui-preview__icon" />
					<h3 className="ttsr-ui-panel__title">{ props.title }</h3>
					{ props.badge }
				</div>
				{ props.description && (
					<HelpText>{ props.description }</HelpText>
				) }
			</div>
			<div className="ttsr-ui-preview__canvas">{ props.children }</div>
			{ props.footer && (
				<div className="ttsr-ui-preview__footer">{ props.footer }</div>
			) }
		</section>
	);
}

/**
 * Button that asks for confirmation in a modal before resetting.
 */
export function ResetConfirm( props: {
	label: string;
	title: string;
	description: ReactNode;
	onConfirm: () => void;
	disabled?: boolean;
} ) {
	const [ open, setOpen ] = useState( false );
	return (
		<>
			<Button
				variant="danger"
				onClick={ () => setOpen( true ) }
				disabled={ props.disabled }
			>
				{ props.label }
			</Button>
			{ open && (
				<Modal
					className="ttsr-ui-modal"
					title={ props.title }
					onRequestClose={ () => setOpen( false ) }
					size="small"
				>
					<p className="ttsr-ui-modal__text">{ props.description }</p>
					<div className="ttsr-ui-modal-actions">
						<Button onClick={ () => setOpen( false ) }>
							{ __( 'Cancel', 'wpxero-text-to-speech' ) }
						</Button>
						<Button
							variant="primary"
							className="is-destructive"
							onClick={ () => {
								setOpen( false );
								props.onConfirm();
							} }
						>
							{ props.label }
						</Button>
					</div>
				</Modal>
			) }
		</>
	);
}

const isApple =
	typeof navigator !== 'undefined' &&
	/Mac|iPhone|iPad/.test( navigator.platform || navigator.userAgent );

/**
 * Floating save bar. Saves and discards every settings store on the page
 * together (Free and extensions), so changes made in other sections are
 * never left behind. Ctrl/⌘+S saves. The reset button only resets `store`.
 */
export function SaveActions< T >( props: {
	store: SettingsStore< T >;
	resetLabel?: string;
	resetDescription?: ReactNode;
} ) {
	const summary = useStoresSummary();
	const [ toast, setToast ] = useState( '' );
	const [ justSaved, setJustSaved ] = useState( false );
	const { saving, dirty, changes } = summary;

	const save = async () => {
		if ( saving || ! dirty ) {
			return;
		}
		if ( await saveAll() ) {
			setJustSaved( true );
			setToast( __( 'Settings saved', 'wpxero-text-to-speech' ) );
		}
	};

	useEffect( () => {
		const onKey = ( event: KeyboardEvent ) => {
			if (
				( event.metaKey || event.ctrlKey ) &&
				! event.altKey &&
				event.key.toLowerCase() === 's'
			) {
				event.preventDefault();
				save();
			}
		};
		window.addEventListener( 'keydown', onKey );
		return () => window.removeEventListener( 'keydown', onKey );
	} );

	useEffect( () => {
		if ( ! toast ) {
			return;
		}
		const timer = setTimeout( () => setToast( '' ), 2600 );
		return () => clearTimeout( timer );
	}, [ toast ] );

	useEffect( () => {
		if ( dirty ) {
			setJustSaved( false );
		}
	}, [ dirty ] );

	let state: ReactNode;
	if ( saving ) {
		state = __( 'Saving…', 'wpxero-text-to-speech' );
	} else if ( dirty ) {
		state = (
			<>
				<span className="ttsr-ui-save__dot" aria-hidden="true" />
				{ sprintf(
					/* translators: %d: number of changed settings. */
					_n(
						'%d unsaved change',
						'%d unsaved changes',
						Math.max( 1, changes ),
						'wpxero-text-to-speech'
					),
					Math.max( 1, changes )
				) }
			</>
		);
	} else {
		state = (
			<>
				<Icon name="check_circle" filled className="ttsr-ui-save__ok" />
				{ justSaved
					? __( 'Changes saved', 'wpxero-text-to-speech' )
					: __( 'All changes saved', 'wpxero-text-to-speech' ) }
			</>
		);
	}

	return (
		<div className="ttsr-ui-save">
			{ summary.errors.map( ( message ) => (
				<StatusNotice key={ message } status="error">
					{ message }
				</StatusNotice>
			) ) }
			<div className={ cx( 'ttsr-ui-save__bar', dirty && 'is-dirty' ) }>
				<span
					className={ cx(
						'ttsr-ui-save__state',
						dirty && 'is-dirty'
					) }
					aria-live="polite"
				>
					{ state }
				</span>
				<div className="ttsr-ui-save__buttons">
					{ props.resetLabel && (
						<ResetConfirm
							label={ props.resetLabel }
							title={ props.resetLabel }
							description={ props.resetDescription }
							onConfirm={ async () => {
								if ( await props.store.reset() ) {
									setToast(
										props.store.getState().message ||
											__(
												'Settings restored to their defaults.',
												'wpxero-text-to-speech'
											)
									);
								}
							} }
							disabled={ saving }
						/>
					) }
					<Button
						onClick={ discardAll }
						disabled={ ! dirty || saving }
					>
						{ __( 'Discard changes', 'wpxero-text-to-speech' ) }
					</Button>
					<Button
						variant="primary"
						onClick={ save }
						busy={ saving }
						disabled={ ! dirty || saving }
					>
						{ __( 'Save changes', 'wpxero-text-to-speech' ) }
						<kbd className="ttsr-ui-save__kbd" aria-hidden="true">
							{ isApple ? '⌘S' : 'Ctrl S' }
						</kbd>
					</Button>
				</div>
			</div>
			<div className="ttsr-ui-toast-region" role="status">
				{ toast && (
					<div className="ttsr-ui-toast">
						<Icon name="check_circle" filled />
						{ toast }
					</div>
				) }
			</div>
		</div>
	);
}
