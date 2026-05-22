import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../services/api';

const ProtectedRoute = ({ children }) => {
	const { isAuthenticated, logout } = useAuth();
	const location = useLocation();
	const [isValid, setIsValid] = useState(null); // null = validating, false = invalid, true = valid

	useEffect(() => {
		let mounted = true;

		const validate = async () => {
			if (!isAuthenticated) {
				if (mounted) setIsValid(false);
				return;
			}
			try {
				const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
					headers: { Authorization: `Bearer ${localStorage.getItem('drrms_access_token')}` },
				});
				if (!mounted) return;
				if (!res.ok) {
					// token invalid or expired
					await logout();
					setIsValid(false);
					return;
				}
				// valid
				setIsValid(true);
			} catch (err) {
				if (mounted) {
					await logout();
					setIsValid(false);
				}
			}
		};

		validate();

		return () => {
			mounted = false;
		};
	}, [isAuthenticated, logout]);

	// still validating - don't render protected content yet
	if (isValid === null) return null;

	if (!isValid) {
		return <Navigate to="/login" replace state={{ from: location.pathname }} />;
	}

	return children;
};

export default ProtectedRoute;
