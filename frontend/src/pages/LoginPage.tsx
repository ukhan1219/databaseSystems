import React from 'react';
import Login from '../components/Login';

const LoginPage: React.FC = () => {
    const handleLogin = (username: string, password: string) => {
        // Implement your login logic here
        console.log('Logging in with', username, password);
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
