import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Login from '../components/Login';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleLogin = async (username: string, password: string) => {
        try {
            const res = await fetch('http://localhost:5001/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok) {
                console.log('Login successful:', data);
                // Redirect to events page after successful login
                navigate('/events');
            } else {
                setError(data.message || 'Login failed');
                console.error('Login failed:', data.message);
            }
        } catch (err) {
            setError('Login error');
            console.error('Login error:', err);
        }
    };

    return (
        <>
            <div className="container" style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: 'calc(100vh - 100px)',
                padding: '2rem 1rem'
            }}>
                <div style={{ 
                    width: '400px', 
                    padding: '2rem',
                    backgroundColor: 'white',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                }}>
                    <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Login</h2>
                    {error && (
                        <div style={{ 
                            color: 'white', 
                            backgroundColor: '#dc3545',
                            padding: '0.75rem', 
                            borderRadius: '4px', 
                            marginBottom: '1.5rem',
                            textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}
                    <Login onLogin={handleLogin} />
                    
                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                        <p style={{ marginBottom: '0.75rem' }}>Don't have an account?</p>
                        <button 
                            onClick={() => navigate('/register')}
                            style={{ 
                                padding: '0.75rem 1.5rem',
                                backgroundColor: '#f8f9fa',
                                border: '1px solid #dee2e6',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 500,
                                width: '100%'
                            }}
                        >
                            Sign Up
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LoginPage;
