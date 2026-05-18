const ACCESS_TOKEN_KEY = 'drrms_access_token';
const REFRESH_TOKEN_KEY = 'drrms_refresh_token';
const ROLE_KEY = 'drrms_role';

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY) || '';
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY) || '';
export const getRole = () => localStorage.getItem(ROLE_KEY) || '';

export const setTokens = ({ accessToken, refreshToken, role }) => {
	if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
	if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
	if (role) localStorage.setItem(ROLE_KEY, role);
};

export const clearTokens = () => {
	localStorage.removeItem(ACCESS_TOKEN_KEY);
	localStorage.removeItem(REFRESH_TOKEN_KEY);
	localStorage.removeItem(ROLE_KEY);
};
