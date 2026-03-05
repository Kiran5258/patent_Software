import React, { useState } from 'react';
import axios from 'axios';
import { User, Lock, Briefcase, Globe, Landmark, ShieldCheck } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
    const [isSignup, setIsSignup] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');
    const [type, setType] = useState('offline');
    const [offlineMode, setOfflineMode] = useState('KRCE');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const validatePassword = (pass) => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return regex.test(pass);
    };

    const validateEmail = (em) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(em);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (isSignup) {
            if (!validateEmail(email)) {
                setError('Please enter a valid email address');
                setLoading(false);
                return;
            }
            if (!validatePassword(password)) {
                setError('Must be 8+ chars, with Uppercase, Lowercase, Number and Special character');
                setLoading(false);
                return;
            }
        }

        const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
        const payload = isSignup ? { email, password, role, type, offlineMode: type === 'offline' ? offlineMode : null } : { email, password };

        try {
            const response = await axios.post(`http://localhost:5001${endpoint}`, payload);
            if (!isSignup) {
                onLoginSuccess(response.data);
            } else {
                setIsSignup(false);
                alert('Signup successful, please login.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at top right, #1e1b4b, #000)',
            padding: '1rem'
        }}>
            <div className="glass-card animate-in" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        background: 'var(--primary)',
                        width: '60px',
                        height: '60px',
                        borderRadius: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem',
                        boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
                    }}>
                        <ShieldCheck size={32} color="white" />
                    </div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{isSignup ? 'Create Account' : 'Welcome Back'}</h1>
                    <p style={{ color: 'var(--text-muted)' }}>{isSignup ? 'Join PatentForge AI today.' : 'Please enter your details to login.'}</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="input-group">
                        <label>Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{ paddingLeft: '3rem' }}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ paddingLeft: '3rem' }}
                                required
                            />
                        </div>
                    </div>

                    {isSignup && (
                        <>
                            <div className="input-group">
                                <label>Operation Mode</label>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setType('attorney')}
                                        className={type === 'attorney' ? "btn-accent" : "btn-secondary"}
                                        style={{ flex: 1, height: '3rem', fontSize: '0.9rem' }}
                                    >
                                        <Briefcase size={16} /> Attorney
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('offline')}
                                        className={type === 'offline' ? "btn-accent" : "btn-secondary"}
                                        style={{ flex: 1, height: '3rem', fontSize: '0.9rem' }}
                                    >
                                        <Globe size={16} /> Offline
                                    </button>
                                </div>
                            </div>

                            {type === 'offline' && (
                                <div className="input-group">
                                    <label>Institution (Offline Mode)</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                        {['KRCE', 'KRCT', 'MKCE'].map(mode => (
                                            <button
                                                key={mode}
                                                type="button"
                                                onClick={() => setOfflineMode(mode)}
                                                className={offlineMode === mode ? "btn-primary" : "btn-secondary"}
                                                style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                                            >
                                                {mode}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {error && <p style={{ color: 'var(--error)', fontSize: '0.875rem', textAlign: 'center' }}>{error}</p>}

                    <button type="submit" className="btn-primary" style={{ height: '3.5rem', marginTop: '1rem' }} disabled={loading}>
                        {loading ? 'Authenticating...' : (isSignup ? 'Register Account' : 'Login Securely')}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {isSignup ? "Already have an account?" : "Need a new account?"}
                    <button
                        onClick={() => setIsSignup(!isSignup)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 600, marginLeft: '0.5rem', cursor: 'pointer' }}
                    >
                        {isSignup ? 'Login' : 'Sign Up'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Login;
