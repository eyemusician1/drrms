import React, { createContext, useContext, useMemo, useState } from 'react';
import { API_BASE_URL } from '../services/api';
import { clearTokens, getAccessToken, getRefreshToken, getRole, setTokens } from '../utils/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
	const [accessToken, setAccessToken] = useState(getAccessToken());
	const [refreshToken, setRefreshToken] = useState(getRefreshToken());
	const [role, setRole] = useState(getRole());
	const [isLoading, setIsLoading] = useState(false);

	const isAuthenticated = !!accessToken;

	const login = async (email, password) => {
		setIsLoading(true);
		try {
			const body = new URLSearchParams();
			body.append('username', email);
			body.append('password', password);

			const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body,
			});

			if (!response.ok) {
				const errorPayload = await response.json().catch(() => ({}));
				const message = errorPayload.detail || 'Login failed.';
				throw new Error(message);
			}

			const data = await response.json();
			setTokens({
				accessToken: data.access_token,
				refreshToken: data.refresh_token,
				role: data.role,
			});
			setAccessToken(data.access_token);
			setRefreshToken(data.refresh_token);
			setRole(data.role);
			return data;
		} finally {
			setIsLoading(false);
		}
	};

	const logout = async () => {
		try {
			if (accessToken) {
				await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
					method: 'POST',
					headers: { Authorization: `Bearer ${accessToken}` },
				});
			}
		} finally {
			clearTokens();
			setAccessToken('');
			setRefreshToken('');
			setRole('');
		}
	};

	const value = useMemo(
		() => ({
			accessToken,
			refreshToken,
			role,
			isAuthenticated,
			isLoading,
			login,
			logout,
		}),
		[accessToken, refreshToken, role, isAuthenticated, isLoading]
	);

	return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
};
