import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header: React.FC = () => {
  return (
    <header className="app-header">
      <nav className="nav-container">
        <div className="nav-brand">
          <Link to="/">Database Systems</Link>
        </div>
        <ul className="nav-links">
          <li><Link to="/universities">Universities</Link></li>
          <li><Link to="/events">Events</Link></li>
          <li><Link to="/rsos">RSOs</Link></li>
          <li><Link to="/super-admin">Super Admin</Link></li>
        </ul>
      </nav>
    </header>
  );
};

export default Header; 