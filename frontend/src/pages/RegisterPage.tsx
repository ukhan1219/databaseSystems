import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Register from '../components/Register';

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleRegister = async (
        username: string, 
        password: string, 
        email: string, 
        universityId: number | null, 
        role: string
    ) => {
        try {
            const res = await fetch('http://localhost:5001/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ 
                    username, 
                    password, 
                    email, 
                    university_id: universityId, 
                    role 
                })
            });

            const data = await res.json();

            if (res.ok) {
                console.log('Registration successful:', data);
                // Redirect to home after successful registration
                navigate('/events');
            } else {
                setError(data.message || 'Registration failed');
                console.error('Registration failed:', data.message);
            }
        } catch (err) {
            setError('Registration error');
            console.error('Registration error:', err);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div style={{ width: '400px', padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
                <h2>Create an Account</h2>
                {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
                <Register onRegister={handleRegister} />
                <div style={{ marginTop: '15px', textAlign: 'center' }}>
                    <p>Already have an account? <a href="/login">Login</a></p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage; 