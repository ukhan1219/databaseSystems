import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import './RSOs.css';

interface RSO {
  RSO_ID: number;
  Name: string;
  Admin: string;
}

const RSOs: React.FC = () => {
  const [rsos, setRSOs] = useState<RSO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRSOs = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/rsos');
        
        if (!response.ok) {
          throw new Error('Failed to fetch RSOs');
        }
        
        const data = await response.json();
        setRSOs(data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    };

    fetchRSOs();
  }, []);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <>
      <Header />
      <div className="rsos-container">
        <h1 className="page-title">Registered Student Organizations</h1>
        
        <div className="rsos-list">
          {rsos.length === 0 ? (
            <p className="no-rsos">No RSOs found.</p>
          ) : (
            rsos.map((rso) => (
              <div key={rso.RSO_ID} className="rso-card">
                <h2 className="rso-name">{rso.Name}</h2>
                <p className="rso-admin">Admin: {rso.Admin}</p>
                <Link to={`/rsos/${rso.RSO_ID}`} className="view-details-button">
                  View Details
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default RSOs; 