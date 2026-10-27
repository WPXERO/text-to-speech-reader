/**
 * Reads the visible text of a content area without changing it.
 *
 * Text is grouped into blocks (paragraphs, headings, list items, …). Each
 * block keeps a map from its normalised text back to the original text
 * nodes, so extensions can build DOM Ranges for read-along highlighting
 * without wrapping or otherwise mutating the article markup.
 */

interface Span {
	node: Text;
	/** Offset of this node's first character within the block text. */
	start: number;
	/** `offsets[i]` is the node offset of block character `start + i`. */
	offsets: number[];
}

export interface TextBlock {
	element: Element;
	text: string;
	spans: Span[];
}

export interface ExtractOptions {
	/** Extra selectors whose matches are skipped. Invalid selectors are ignored. */
	exclude?: readonly string[];
}

const SKIP_TAGS = new Set( [
	'SCRIPT',
	'STYLE',
	'NOSCRIPT',
	'TEMPLATE',
	'SVG',
	'MATH',
	'IFRAME',
	'OBJECT',
	'EMBED',
	'CANVAS',
	'VIDEO',
	'AUDIO',
	'BUTTON',
	'SELECT',
	'OPTION',
	'TEXTAREA',
	'INPUT',
	'FORM',
	'NAV',
	'DIALOG',
] );

const BLOCK_TAGS = new Set( [
	'ADDRESS',
	'ARTICLE',
	'ASIDE',
	'BLOCKQUOTE',
	'CAPTION',
	'DD',
	'DETAILS',
	'DIV',
	'DL',
	'DT',
	'FIGCAPTION',
	'FIGURE',
	'FOOTER',
	'H1',
	'H2',
	'H3',
	'H4',
	'H5',
	'H6',
	'HEADER',
	'HR',
	'LI',
	'MAIN',
	'OL',
	'P',
	'PRE',
	'SECTION',
	'SUMMARY',
	'TABLE',
	'TBODY',
	'TD',
	'TFOOT',
	'TH',
	'THEAD',
	'TR',
	'UL',
] );

/** Never read: the players themselves, opt-outs and screen-reader-only text. */
const BUILT_IN_EXCLUDE = [
	'.ttsr-player',
	'[data-ttsr-skip]',
	'[aria-hidden="true"]',
	'.screen-reader-text',
	'.sr-only',
];

function safeMatches( element: Element, selector: string ): boolean {
	try {
		return element.matches( selector );
	} catch {
		return false;
	}
}

function isHidden( element: Element ): boolean {
	if (
		( element as HTMLElement ).hidden ||
		element.hasAttribute( 'inert' )
	) {
		return true;
	}
	const view = element.ownerDocument.defaultView;
	if ( ! view ) {
		return false;
	}
	const style = view.getComputedStyle( element );
	return style.display === 'none' || style.visibility === 'hidden';
}

class Builder {
	blocks: TextBlock[] = [];
	private current: TextBlock | null = null;
	private pendingSpace = false;

	open( element: Element ) {
		this.close();
		this.current = { element, text: '', spans: [] };
		this.pendingSpace = false;
	}

	close() {
		const block = this.current;
		if ( block && block.text.length > 0 ) {
			this.blocks.push( block );
		}
		this.current = null;
		this.pendingSpace = false;
	}

	space() {
		if ( this.current && this.current.text.length > 0 ) {
			this.pendingSpace = true;
		}
	}

	append( node: Text, fallback: Element ) {
		const data = node.data;
		if ( ! data ) {
			return;
		}
		if ( ! this.current ) {
			this.open( fallback );
		}
		const block = this.current as TextBlock;
		let span: Span | null = null;
		for ( let i = 0; i < data.length; i++ ) {
			const char = data[ i ];
			if ( /\s/.test( char ) ) {
				if ( block.text.length > 0 ) {
					this.pendingSpace = true;
				}
				continue;
			}
			if ( ! span ) {
				span = { node, start: block.text.length, offsets: [] };
				block.spans.push( span );
			}
			if ( this.pendingSpace ) {
				// The space maps to the character it precedes.
				block.text += ' ';
				span.offsets.push( i );
				this.pendingSpace = false;
			}
			block.text += char;
			span.offsets.push( i );
		}
	}
}

/**
 * Extracts readable blocks from the given roots, in document order.
 *
 * @param roots   Elements to read. Nested roots are read once.
 * @param options Extraction options.
 */
export function extractBlocks(
	roots: readonly Element[],
	options: ExtractOptions = {}
): TextBlock[] {
	const exclude = [ ...BUILT_IN_EXCLUDE, ...( options.exclude ?? [] ) ];
	const builder = new Builder();
	const visited = new Set< Element >();

	const skip = ( element: Element ) =>
		SKIP_TAGS.has( element.tagName.toUpperCase() ) ||
		exclude.some( ( selector ) => safeMatches( element, selector ) ) ||
		isHidden( element );

	const walk = ( element: Element, block: Element ) => {
		visited.add( element );
		for ( const child of Array.from( element.childNodes ) ) {
			if ( child.nodeType === 3 ) {
				builder.append( child as Text, block );
				continue;
			}
			if ( child.nodeType !== 1 ) {
				continue;
			}
			const el = child as Element;
			if ( skip( el ) ) {
				continue;
			}
			const tag = el.tagName.toUpperCase();
			if ( tag === 'BR' ) {
				builder.space();
			} else if ( BLOCK_TAGS.has( tag ) ) {
				builder.open( el );
				walk( el, el );
				// Text after a nested block belongs to a new block of the parent.
				builder.close();
			} else {
				walk( el, block );
			}
		}
	};

	const sorted = [ ...roots ].sort( ( a, b ) =>
		// eslint-disable-next-line no-bitwise
		a.compareDocumentPosition( b ) & 4 ? -1 : 1
	);
	for ( const root of sorted ) {
		if (
			visited.has( root ) ||
			[ ...visited ].some( ( v ) => v.contains( root ) )
		) {
			continue;
		}
		if ( skip( root ) ) {
			continue;
		}
		builder.open( root );
		walk( root, root );
		builder.close();
	}
	return builder.blocks;
}

function locate(
	block: TextBlock,
	index: number
): { node: Text; offset: number } | null {
	for ( const span of block.spans ) {
		const relative = index - span.start;
		if ( relative >= 0 && relative < span.offsets.length ) {
			return { node: span.node, offset: span.offsets[ relative ] };
		}
	}
	return null;
}

/**
 * A DOM Range covering block characters [start, end).
 *
 * Returns null when the text nodes have since been removed from the page.
 *
 * @param block Block returned by extractBlocks().
 * @param start Start offset in `block.text`.
 * @param end   End offset in `block.text`.
 */
export function rangeFor(
	block: TextBlock,
	start: number,
	end: number
): Range | null {
	if ( end <= start ) {
		return null;
	}
	const first = locate( block, start );
	const last = locate( block, end - 1 );
	if (
		! first ||
		! last ||
		! first.node.isConnected ||
		! last.node.isConnected
	) {
		return null;
	}
	const range = first.node.ownerDocument.createRange();
	range.setStart( first.node, first.offset );
	range.setEnd( last.node, last.offset + 1 );
	return range;
}
