import React from 'react';

const badgeClasses = {
	low: 'badge badge-low',
	medium: 'badge badge-medium',
	high: 'badge badge-high',
	critical: 'badge badge-critical',
	default: 'badge badge-default',
};

const Badge = ({ type = 'default', children }) => {
	const className = badgeClasses[type] || badgeClasses.default;

	return <span className={className}>{children}</span>;
};

export default Badge;
