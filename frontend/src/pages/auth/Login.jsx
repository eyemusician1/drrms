import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Logic for your FastAPI backend goes here
      setTimeout(() => {
        setIsLoading(false);
        navigate('/manage/dashboard');
      }, 1500);
    } catch (err) {
      setError('Invalid credentials.');
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="labs-background-glow"></div>

      {!showForm ? (
        /* HERO SECTION: Project Genie Style */
        <div className="hero-section fade-in">
          <h1 className="hero-title">DRRMS</h1>
          <p className="hero-subtitle">The Central DRRM System and Real-time Disaster Network.</p>
          <button className="labs-btn-hero" onClick={() => setShowForm(true)}>
            Login
          </button>
        </div>
      ) : (
        /* FORM SECTION: Modern & Minimal */
        <div className="login-content slide-up">
          <div className="login-header">
            <h2>Admin Access</h2>
            <p>Provide your credentials to manage the network.</p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            {error && <div className="error-message">{error}</div>}

            <div className="input-group">
              <span className="material-symbols-rounded">mail</span>
              <input
                type="email"
                placeholder="Admin Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <span className="material-symbols-rounded">lock</span>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="labs-btn-primary" disabled={isLoading}>
              {isLoading ? <span className="material-symbols-rounded spinner">sync</span> : 'Enter Portal'}
            </button>
          </form>

          <div className="login-footer">
            <button className="text-link" onClick={() => setShowForm(false)}>Back</button>
            <a href="#forgot" className="text-link">Forgot?</a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;