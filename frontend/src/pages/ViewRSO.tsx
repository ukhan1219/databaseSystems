import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

interface Member {
  user_id: number;
  username: string;
  email: string;
  user_role: string;
  joined_date: string;
  is_admin: boolean;
  rso_role: string;
  membership_duration: string;
}

interface MembershipStatus {
  isMember: boolean;
  isAdmin: boolean;
  joinStatus: number;
  joinStatusText: string;
  canJoin: boolean;
}

const ViewRSO: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [org, setOrg] = useState<RSO | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [membership, setMembership] = useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchRSODetails = async () => {
      try {
        // Fetch RSO details
        const response = await fetch(`http://localhost:5001/api/rsos/${id}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch RSO details');
        }
        
        const data = await response.json();
        console.log("RSO data:", data);
        
        setOrg(data.rso);
        setMembership(data.membership);
        
        // If user is a member, fetch the member list
        if (data.membership && data.membership.isMember) {
          await fetchMembers();
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching RSO details:", err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    };

    fetchRSODetails();
  }, [id]);

  const fetchMembers = async () => {
    try {
      const membersResponse = await fetch(`http://localhost:5001/api/rsos/${id}/members`, {
        credentials: 'include'
      });

      if (!membersResponse.ok) {
        throw new Error('Failed to fetch RSO members');
      }

      const membersData = await membersResponse.json();
      console.log("Members data:", membersData);
      setMembers(membersData.members || []);
    } catch (err) {
      console.error("Error fetching members:", err);
      // Don't set an error to avoid breaking the whole page
    }
  };

  const handleJoinLeaveRSO = async () => {
    if (!membership) return;
    setActionLoading(true);
    
    try {
      const action = membership.isMember ? 'leave' : 'join';
      const response = await fetch(`http://localhost:5001/api/rsos/${id}/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      // First check if the response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Server returned invalid response format: ${contentType || 'unknown'}`);
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `Failed to ${action} RSO`);
      }

      if (action === 'join') {
        // After joining, refresh to see updated data
        window.location.reload();
      } else {
        // After leaving, go back to RSOs page
        navigate('/rsos');
      }
    } catch (err) {
      console.error(`Error ${membership.isMember ? 'leaving' : 'joining'} RSO:`, err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <>
      <Header />
      <div className="loading">Loading RSO details...</div>
    </>
  );
  
  if (error) return (
    <>
      <Header />
      <div className="error">{error}</div>
    </>
  );
  
  if (!org || !membership) return (
    <>
      <Header />
      <div className="not-found">RSO not found</div>
    </>
  );

  return (
    <>
      <Header />
      <div className="view-rso-container">
        <div className="back-navigation">
          <button className="back-button" onClick={() => navigate('/rsos')}>
            &larr; Back to RSOs
          </button>
        </div>
        <h1 className="page-title">RSO Details</h1>
        
        <div className="view-rso-card">
          <div className="rso-header">
            <h2 className="rso-name">{org.rso_name}</h2>
            <div className="rso-badges">
              {membership.isAdmin && <span className="badge admin-badge">Admin</span>}
              <span className={`badge status-badge ${org.is_active ? 'active' : 'inactive'}`}>
                {org.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          
          <p className="rso-description">{org.description}</p>
          
          <div className="rso-meta">
            <p><strong>Admin:</strong> {org.admin_username}</p>
            <p><strong>University:</strong> {org.university_name}</p>
            <p><strong>Members:</strong> {org.member_count}</p>
            {!org.is_active && org.has_enough_members && (
              <p className="pending-approval">This RSO has enough members and is awaiting admin approval</p>
            )}
            {!org.is_active && !org.has_enough_members && (
              <p className="needs-members">This RSO needs at least 5 members to be activated</p>
            )}
          </div>

          {!membership.isMember && (
            <button 
              className="join-button"
              onClick={handleJoinLeaveRSO}
              disabled={!org.is_active || actionLoading}
            >
              {actionLoading ? 'Processing...' : 'Join RSO'}
            </button>
          )}
          
          {membership.isMember && (
            <>
              <h3>Members</h3>
              <div className="members-list">
                {members.length === 0 ? (
                  <p>Loading members...</p>
                ) : (
                  <table className="members-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map(member => (
                        <tr key={member.user_id} className={member.is_admin ? 'admin-row' : ''}>
                          <td>{member.username}</td>
                          <td>{member.rso_role}</td>
                          <td>{member.membership_duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              
              {!membership.isAdmin && (
                <button 
                  className="leave-button"
                  onClick={handleJoinLeaveRSO}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing...' : 'Leave RSO'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ViewRSO; 