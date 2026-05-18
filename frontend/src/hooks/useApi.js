import { API_BASE_URL } from '../services/api';
import { useAuth } from './useAuth';

const isFormData = (body) => body && typeof FormData !== 'undefined' && body instanceof FormData;

export const useApi = () => {
	const { accessToken, logout } = useAuth();

	const request = async (path, options = {}) => {
		const headers = new Headers(options.headers || {});
		if (accessToken) {
			headers.set('Authorization', `Bearer ${accessToken}`);
		}
		if (options.body && !isFormData(options.body) && !headers.has('Content-Type')) {
			headers.set('Content-Type', 'application/json');
		}

		const response = await fetch(`${API_BASE_URL}${path}`, {
			...options,
			headers,
			cache: 'no-store',
			referrerPolicy: 'no-referrer',
		});

		if (response.status === 401) {
			await logout();
			throw new Error('Unauthorized');
		}

		const contentType = response.headers.get('content-type') || '';
		if (contentType.includes('application/json')) {
			const payload = await response.json();
			if (!response.ok) {
				const detail = payload.detail;
				const message = typeof detail === 'string'
					? detail
					: detail
						? JSON.stringify(detail)
						: 'Request failed.';
				throw new Error(message);
			}
			return payload;
		}

		const text = await response.text();
		if (!response.ok) throw new Error(text || 'Request failed.');
		return text;
	};

	return { request };
};
