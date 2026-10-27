/**
 * Small decorative drawings for the placement and layout choice cards.
 * Unknown values (e.g. from an extension) get a neutral drawing.
 */
const lines = ( count: number ) =>
	Array.from( { length: count }, ( _, index ) => (
		<i
			key={ index }
			className={ index === count - 1 ? 'is-short' : undefined }
		/>
	) );

export function PlacementSketch( { value }: { value: string } ) {
	const player = <i className="is-player" />;
	return (
		<span className="ttsr-admin-sketch">
			<i className="is-heading" />
			{ value === 'before' && player }
			{ value === 'after_paragraph' ? (
				<>
					<i />
					{ player }
					<i className="is-short" />
				</>
			) : (
				lines( 3 )
			) }
			{ value === 'after' && player }
		</span>
	);
}

export function LayoutSketch( { value }: { value: string } ) {
	switch ( value ) {
		case 'standard':
			return (
				<span className="ttsr-admin-layout-sketch">
					<span className="is-bar">
						<i className="is-accent" style={ size( 26, 12, 3 ) } />
						<i className="is-line" />
						<i className="is-outline" style={ size( 14, 10 ) } />
					</span>
				</span>
			);
		case 'button':
			return (
				<span className="ttsr-admin-layout-sketch">
					<i className="is-accent" style={ size( 46, 18, 5 ) } />
				</span>
			);
		case 'expanded':
			return (
				<span className="ttsr-admin-layout-sketch">
					<span className="is-bar is-card">
						<i
							className="is-line is-dark"
							style={ { width: '50%', flex: 'none' } }
						/>
						<i className="is-line" style={ { flex: 'none' } } />
						<span className="is-row">
							<i
								className="is-line is-dot"
								style={ size( 6, 6 ) }
							/>
							<i
								className="is-accent is-dot"
								style={ size( 12, 12 ) }
							/>
							<i
								className="is-line is-dot"
								style={ size( 6, 6 ) }
							/>
						</span>
					</span>
				</span>
			);
		case 'compact':
			return (
				<span className="ttsr-admin-layout-sketch">
					<span className="is-bar is-pill">
						<i
							className="is-accent is-dot"
							style={ size( 12, 12 ) }
						/>
						<i className="is-line" />
						<i
							className="is-line is-dark"
							style={ { width: 10, flex: 'none' } }
						/>
					</span>
				</span>
			);
		case 'minimal':
			return (
				<span className="ttsr-admin-layout-sketch">
					<i className="is-accent is-dot" style={ size( 14, 14 ) } />
					<i
						className="is-line is-dark"
						style={ { width: 30, flex: 'none', height: 4 } }
					/>
				</span>
			);
		default:
			return (
				<span className="ttsr-admin-layout-sketch">
					<span className="is-bar">
						<i className="is-accent" style={ size( 18, 12, 3 ) } />
						<i className="is-line" />
					</span>
				</span>
			);
	}
}

function size( width: number, height: number, radius?: number ) {
	return { width, height, borderRadius: radius };
}
