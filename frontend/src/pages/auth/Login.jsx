import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Login.css';

const Login = () => {
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // <-- New State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email.trim(), password);
      navigate('/manage/dashboard');
    } catch (err) {
      setError(err?.message || 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="labs-background-glow"></div>

      {!showForm ? (
        /* HERO SECTION */
        <div className="hero-section fade-in">
          <h1 className="hero-title">DRRMS</h1>
          <p className="hero-subtitle">The Central DRRM System and Real-time Disaster Network.</p>
          <button className="labs-btn-hero" onClick={() => setShowForm(true)}>
            Login
          </button>
        </div>
      ) : (
        /* REDESIGNED FORM SECTION */
        <div className="login-content slide-up">
          <div className="login-header">
            <h2>Admin Access</h2>
            <p>Provide your credentials to manage the network.</p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>

            {/* GOOGLE MATERIAL 3 ERROR STATE */}
            {error && (
              <div className="error-message fade-in">
                <span className="material-symbols-rounded">error</span>
                <p>{error}</p>
              </div>
            )}

            <div className="input-group">
              <span className="material-symbols-rounded icon-left">mail</span>
              <input
                type="email"
                placeholder="Admin Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <span className="material-symbols-rounded icon-left">lock</span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {/* PASSWORD TOGGLE BUTTON */}
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-rounded">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            <button type="submit" className="labs-btn-primary" disabled={isLoading}>
              {isLoading ? <span className="material-symbols-rounded spinner">sync</span> : 'Enter Portal'}
            </button>
          </form>

          <div className="login-footer">
            <button className="text-link" onClick={() => { setShowForm(false); setError(''); }}>Back</button>
            <a href="#forgot" className="text-link">Forgot?</a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;