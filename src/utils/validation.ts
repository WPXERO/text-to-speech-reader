/**
 * Small framework-free helpers shared by the admin apps and frontend scripts.
 *
 * The PHP sanitisers are authoritative; these mirror them so the admin can
 * show an error next to a field before a round trip, and so the frontend
 * can skip anything that slipped through.
 */

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor( value: string ): boolean {
	return HEX_COLOR.test( value );
}

export function clamp( value: number, min: number, max: number ): number {
	if ( Number.isNaN( value ) ) {
		return min;
	}
	return Math.min( max, Math.max( min, value ) );
}

/** Same limits as TTSRP\Settings::is_selector(). */
export const SELECTOR_MAX_LENGTH = 200;
const SELECTOR_FORBIDDEN = /[{}<;\\]|\/\*|@/;

export type SelectorCheck = { valid: true } | { valid: false; reason: string };

/**
 * Checks that a string is a plain CSS selector list.
 *
 * Rejects characters that only make sense in style sheets or markup, then
 * asks the browser's own parser (when available) whether it is a selector.
 * Selectors are only ever passed to `querySelectorAll`/`matches`, never
 * injected into a style sheet or evaluated.
 *
 * @param selector Selector text entered by an administrator.
 */
export function checkSelector( selector: string ): SelectorCheck {
	const trimmed = selector.trim();
	if ( '' === trimmed ) {
		return { valid: false, reason: 'empty' };
	}
	if ( trimmed.length > SELECTOR_MAX_LENGTH ) {
		return { valid: false, reason: 'length' };
	}
	if ( SELECTOR_FORBIDDEN.test( trimmed ) ) {
		return { valid: false, reason: 'characters' };
	}
	if ( typeof document !== 'undefined' ) {
		try {
			document.createDocumentFragment().querySelector( trimmed );
		} catch {
			return { valid: false, reason: 'syntax' };
		}
	}
	return { valid: true };
}

/**
 * Returns only the selectors the browser accepts.
 */
export function validSelectors( selectors: readonly string[] ): string[] {
	return selectors
		.map( ( selector ) => selector.trim() )
		.filter( ( selector ) => checkSelector( selector ).valid );
}

/**
 * Keys whose values differ between two flat settings objects.
 *
 * @param before Saved settings.
 * @param after  Edited settings.
 */
export function changedKeys< T extends object >(
	before: T,
	after: T
): ( keyof T )[] {
	const keys = new Set( [
		...Object.keys( before ),
		...Object.keys( after ),
	] ) as Set< keyof T >;
	return [ ...keys ].filter(
		( key ) =>
			JSON.stringify( before[ key ] ) !== JSON.stringify( after[ key ] )
	);
}
