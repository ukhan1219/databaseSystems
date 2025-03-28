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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div style={{ width: '300px', padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
                <h2>Login</h2>
                {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
                <Login onLogin={handleLogin} />
                
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <p>Don't have an account?</p>
                    <button 
                        onClick={() => navigate('/register')}
                        style={{ 
                            padding: '8px 16px',
                            backgroundColor: '#f0f0f0',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Sign Up
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
