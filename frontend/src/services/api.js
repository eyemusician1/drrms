export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const buildApiUrl = (path) => {
	if (!path) return API_BASE_URL;
	return path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
};
