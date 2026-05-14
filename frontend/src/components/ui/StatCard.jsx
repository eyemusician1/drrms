import React from 'react';

const StatCard = ({ title, value, icon }) => {
	return (
		<article className="stat-card">
			<div className="stat-card-icon" aria-hidden="true">
				{icon}
			</div>
			<div className="stat-card-body">
				<p className="stat-card-title">{title}</p>
				<p className="stat-card-value">{value}</p>
			</div>
		</article>
	);
};

export default StatCard;
