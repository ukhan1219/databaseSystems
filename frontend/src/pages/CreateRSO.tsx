import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import './CreateRSO.css';

interface University {
  university_id: number;
  name: string;
}

interface FormData {
  rso_name: string;
  description: string;
  university_id: number;
}

interface User {
  user_id: number;
  university_id: number | null;
  role: string;
}

const CreateRSO: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    rso_name: '',
    description: '',
    university_id: 0
  });
  const [university, setUniversity] = useState<University | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/auth/me', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          // If not logged in, redirect to login page
          navigate('/login');
          return;
        }
        
        const data = await response.json();
        setUser(data.user);
        
        // If user has a university, pre-select it
        if (data.user.university_id) {
          setFormData(prev => ({
            ...prev,
            university_id: data.user.university_id
          }));
          
          // Fetch the university details
          await fetchUniversity(data.user.university_id);
        }
        
        setLoading(false);
      } catch (err) {
        setError('Failed to authenticate user');
        navigate('/login');
      }
    };

    fetchUser();
  }, [navigate]);

  const fetchUniversity = async (universityId: number) => {
    try {
      const response = await fetch(`http://localhost:5001/api/universities/${universityId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('University fetch error:', response.status, errorText);
        throw new Error(`Failed to fetch university details (${response.status})`);
      }
      
      const data = await response.json();
      console.log('University data:', data);
      
      if (data.success && data.university) {
        setUniversity(data.university);
      } else {
        throw new Error(data.message || 'Invalid university data format');
      }
    } catch (err) {
      console.error('Error fetching university:', err);
      setError('Failed to fetch university details. Please refresh or try again later.');
      // Continue without university data - we can still show the form
      // but it will be disabled until university data is available
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5001/api/rsos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create RSO');
      }
      
      setSuccess(true);
      // Reset form
      setFormData({
        rso_name: '',
        description: '',
        university_id: user?.university_id || 0
      });
      
      // After 3 seconds, redirect to RSOs page
      setTimeout(() => {
        navigate('/rsos');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <>
      <Header />
      <div className="loading">Loading...</div>
    </>
  );

  return (
    <>
      <Header />
      <div className="create-rso-container">
        <div className="back-navigation">
          <button className="back-button" onClick={() => navigate('/rsos')}>
            &larr; Back to RSOs
          </button>
        </div>
        
        <h1 className="page-title">Create New RSO</h1>
        
        {error && <div className="error-message">{error}</div>}
        {success && (
          <div className="success-message">
            RSO created successfully! Redirecting to RSOs page...
          </div>
        )}
        
        <div className="create-rso-card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="rso_name">RSO Name</label>
              <input
                type="text"
                id="rso_name"
                name="rso_name"
                value={formData.rso_name}
                onChange={handleChange}
                required
                placeholder="Enter the name of your RSO"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={5}
                placeholder="Describe the purpose and activities of your RSO"
              ></textarea>
            </div>
            
            <div className="form-group">
              <label>University</label>
              <p className="university-display">
                {university ? university.name : 'Not affiliated with a university'}
              </p>
              {!university && (
                <div className="university-warning">
                  You must be affiliated with a university to create an RSO. 
                  Please update your profile to include a university.
                </div>
              )}
            </div>
            
            <div className="form-footer">
              <p className="rso-requirements">
                <strong>Important:</strong> To activate this RSO, you will need at least 5 members. 
                Once created, you will become the admin of this RSO.
              </p>
              
              <button 
                type="submit" 
                className="submit-button"
                disabled={submitting || success || !university}
              >
                {submitting ? 'Creating...' : 'Create RSO'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CreateRSO; 