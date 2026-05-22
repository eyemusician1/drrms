import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { API_BASE_URL } from '../services/api';

export default function useRequireAuth(requiredRole = null) {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const validate = async () => {
      if (!isAuthenticated) {
        navigate('/login', { replace: true });
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('drrms_access_token')}` },
        });
        if (!mounted) return;
        if (!res.ok) {
          await logout();
          navigate('/login', { replace: true });
          return;
        }
        if (requiredRole) {
          const data = await res.json();
          if (data.role !== requiredRole) {
            await logout();
            navigate('/login', { replace: true });
            return;
          }
        }
      } catch (err) {
        if (mounted) {
          await logout();
          navigate('/login', { replace: true });
        }
      }
    };

    validate();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, logout, navigate, requiredRole]);
}
