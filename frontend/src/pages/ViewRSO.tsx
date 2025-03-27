import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import './ViewRSO.css';

interface RSO {
  RSO_ID: number;
  Name: string;
  Admin: string;
}

const ViewRSO: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [org, setOrg] = useState<RSO | null>(null);
  const [joinStatus, setJoinStatus] = useState<number>(1); // 1: Not joined, 0: Joined
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRSODetails = async () => {
      try {
        // Replace with your actual API endpoint
        const response = await fetch(`http://localhost:8000/api/rsos/${id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch RSO details');
        }
        
        const data = await response.json();
        setOrg(data);
        
        // Check if user is a member of this RSO
        const membershipResponse = await fetch(`http://localhost:8000/api/rsos/${id}/membership`, {
          credentials: 'include', // Include cookies for auth
        });
        
        if (membershipResponse.ok) {
          const membershipData = await membershipResponse.json();
          setJoinStatus(membershipData.isMember ? 0 : 1);
        }
        
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    };

    fetchRSODetails();
  }, [id]);

  const handleButtonClick = async () => {
    try {
      const action = joinStatus === 1 ? 'join' : 'leave';
      const response = await fetch(`http://localhost:8000/api/rsos/${id}/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} RSO`);
      }

      // Toggle join status after successful action
      setJoinStatus(joinStatus === 1 ? 0 : 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!org) return <div className="not-found">RSO not found</div>;

  return (
    <>
      <Header />
      <div className="view-rso-container">
        <h1 className="page-title">Org Details</h1>
        
        <div className="view-rso-card">
          <h3 className="rso-name">Name: {org.Name}</h3>
          <h5 className="rso-admin">Admin: {org.Admin}</h5>

          <button 
            className={joinStatus === 1 ? "join-button" : "leave-button"}
            onClick={handleButtonClick}
          >
            {joinStatus === 1 ? "Join" : "Leave"}
          </button>
        </div>
      </div>
    </>
  );
};

export default ViewRSO; 