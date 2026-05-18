import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../services/api';
import { useAuth } from './useAuth';

const buildStreamUrl = (path, token) => {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (token) {
    url.searchParams.set('token', token);
  }
  return url.toString();
};

const buildStorageKey = (path) => `drrms:realtime:${path}`;

const readCachedData = (key) => {
  if (!key) return null;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
};

const writeCachedData = (key, value) => {
  if (!key) return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // Ignore cache write failures (storage limits, privacy mode)
  }
};

export const useRealtimeStream = (path, initialData) => {
  const { accessToken } = useAuth();
  const storageKey = useMemo(() => buildStorageKey(path), [path]);
  const [data, setData] = useState(() => {
    const cached = readCachedData(storageKey);
    return cached ?? initialData;
  });
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');

  const streamUrl = useMemo(() => {
    if (!path || !accessToken) return '';
    return buildStreamUrl(path, accessToken);
  }, [path, accessToken]);

  useEffect(() => {
    const cached = readCachedData(storageKey);
    if (cached != null) {
      setData(cached);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!streamUrl) return undefined;

    const source = new EventSource(streamUrl);

    source.onopen = () => {
      setIsConnected(true);
      setError('');
    };

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setData(payload);
        writeCachedData(storageKey, payload);
      } catch (err) {
        setError('Realtime payload parse failed.');
      }
    };

    source.onerror = () => {
      setIsConnected(false);
      setError('Realtime connection lost.');
    };

    return () => {
      source.close();
    };
  }, [streamUrl]);

  return { data, isConnected, error, setData };
};
