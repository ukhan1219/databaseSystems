import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';

interface User {
  user_id: number;
  username: string;
  role: string;
}

const Header: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('http://localhost:5001/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (err) {
        console.error('Error fetching user:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/auth/logout', {
        method: 'GET',
        credentials: 'include',
      });

      if (res.ok) {
        setUser(null);
        navigate('/login');
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return null; // Or a simple loading indicator
  }

  return (
    <header className="app-header">
      <nav className="nav-container">
        <div className="nav-brand">
          <Link to={user ? "/events" : "/login"}>Database Systems</Link>
        </div>
        <ul className="nav-links">
          {user ? (
            // Logged in navigation
            <>
              <li><Link to="/events">Events</Link></li>
              <li><Link to="/rsos">RSOs</Link></li>
              
              {/* Super admin specific links */}
              {user.role === 'super_admin' && (
                <>
                  <li><Link to="/universities">Universities</Link></li>
                  <li><Link to="/super-admin">Admin Panel</Link></li>
                </>
              )}
              
              {/* Regular admin specific links */}
              {user.role === 'admin' && (
                <li><Link to="/rso-admin">RSO Admin</Link></li>
              )}
              
              <li><button onClick={handleLogout} className="logout-btn">Logout</button></li>
            </>
          ) : (
            // Not logged in navigation
            <>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Sign Up</Link></li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
};

export default Header; 