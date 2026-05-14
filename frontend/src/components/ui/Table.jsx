import React from 'react';

const Table = ({ children }) => {
	return (
		<div className="table-shell">
			<table className="data-table">{children}</table>
		</div>
	);
};

export default Table;
