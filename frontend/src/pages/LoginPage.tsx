import React from 'react';
import Login from '../components/Login';

const LoginPage: React.FC = () => {
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
                // Redirect or global state update can go here
            } else {
                console.error('Login failed:', data.message);
            }
        } catch (err) {
            console.error('Login error:', err);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div style={{ width: '300px', padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
                <h2>Login</h2>
                <Login onLogin={handleLogin} />
            </div>
        </div>
    );
};

export default LoginPage;
