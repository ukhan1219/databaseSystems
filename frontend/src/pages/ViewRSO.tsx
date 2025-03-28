import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import './ViewRSO.css';

interface RSO {
  rso_id: number;
  rso_name: string;
  description: string;
  is_active: boolean;
  admin_user_id: number;
  admin_username: string;
  admin_email: string;
  university_name: string;
  member_count: number;
  has_enough_members: boolean;
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
        const response = await fetch(`http://localhost:5001/api/rsos/${id}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch RSO details');
        }
        
        const data = await response.json();
        setOrg(data.rso);  // Update to match the expected response format
        
        // Check if user is a member of this RSO
        const membershipResponse = await fetch(`http://localhost:5001/api/rsos/${id}/membership`, {
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
      const response = await fetch(`http://localhost:5001/api/rsos/${id}/${action}`, {
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
        <h1 className="page-title">RSO Details</h1>
        
        <div className="view-rso-card">
          <h2 className="rso-name">{org.rso_name}</h2>
          <p className="rso-description">{org.description}</p>
          <div className="rso-meta">
            <p><strong>Admin:</strong> {org.admin_username}</p>
            <p><strong>University:</strong> {org.university_name}</p>
            <p><strong>Members:</strong> {org.member_count}</p>
            <p><strong>Status:</strong> {org.is_active ? 'Active' : 'Inactive'}</p>
          </div>

          <button 
            className={joinStatus === 1 ? "join-button" : "leave-button"}
            onClick={handleButtonClick}
            disabled={!org.is_active}
          >
            {joinStatus === 1 ? "Join" : "Leave"}
          </button>
        </div>
      </div>
    </>
  );
};

export default ViewRSO; 