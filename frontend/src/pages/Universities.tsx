import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import './Universities.css';

interface University {
  University_ID?: number;
  university_id?: number; // For API compatibility
  University_Name: string;
  Name?: string; // For API compatibility
  Location: string;
  Description: string;
  Student_Population: string;
  name?: string; // For API compatibility
}

interface User {
  user_id: number;
  username: string;
  email: string;
  role: string;
  university_id: number | null;
}

const Universities: React.FC = () => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [currentUniversity, setCurrentUniversity] = useState<University | null>(null);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [showChangeForm, setShowChangeForm] = useState<boolean>(false);
  const [formData, setFormData] = useState<University>({
    University_Name: '',
    Location: '',
    Description: '',
    Student_Population: ''
  });

  // Ref for the University Name input field to attach autocomplete
  const universityNameRef = useRef<HTMLInputElement>(null);

  // Dynamically load the Google Maps API script
  const loadGoogleMapsScript = (callback: () => void) => {
    if (document.getElementById('google-maps-script')) {
      callback();
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyBXRp_Fi8prlc_3ZyKsQyo0IpS2aIh8ZOs&libraries=places';
    script.async = true;
    script.defer = true;
    script.onload = callback;
    document.body.appendChild(script);
  };

  // When the create form is shown, attach autocomplete to the University Name input
  useEffect(() => {
    if (showCreateForm) {
      loadGoogleMapsScript(() => {
        if (window.google && universityNameRef.current) {
          const autocomplete = new window.google.maps.places.Autocomplete(universityNameRef.current, {
            types: ['establishment']
          });
          // Request specific fields including types for filtering
          autocomplete.setFields(['address_components', 'formatted_address', 'name', 'geometry', 'types']);
          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            // Filter to only allow educational institutions
            const allowedTypes = ['university', 'college', 'school'];
            const isValid = place.types && place.types.some((t: string) => allowedTypes.includes(t));
            if (!isValid) {
              alert("Please select a valid university or college.");
              return;
            }
            // Extract city and state for location display
            let city = '';
            let state = '';
            if (place.address_components) {
              for (const component of place.address_components) {
                if (component.types.includes('locality')) {
                  city = component.long_name;
                }
                if (component.types.includes('administrative_area_level_1')) {
                  state = component.long_name;
                }
              }
            }
            if (city && state) {
              setFormData(prev => ({
                ...prev,
                Location: `${city}, ${state}`,
                University_Name: place.name || prev.University_Name
              }));
            } else {
              // Fallback to the formatted address if city/state not found
              setFormData(prev => ({
                ...prev,
                Location: place.formatted_address || '',
                University_Name: place.name || prev.University_Name
              }));
            }
          });
        }
      });
    }
  }, [showCreateForm]);

  // Fetch current user information
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/auth/me', {
          credentials: 'include'
        });
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        const userData = await response.json();
        setUser(userData.user);
        if (userData.user.university_id) {
          fetchUserUniversity(userData.user.university_id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    };
    fetchCurrentUser();
  }, []);

  // Fetch the user's university details
  const fetchUserUniversity = async (universityId: number) => {
    try {
      const response = await fetch(`http://localhost:5001/api/universities/${universityId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch university details');
      }
      const data = await response.json();
      const universityData: University = {
        University_ID: data.university.university_id,
        University_Name: data.university.name,
        Location: data.university.location || '',
        Description: data.university.description || '',
        Student_Population: data.university.number_of_students?.toString() || ''
      };
      setCurrentUniversity(universityData);
    } catch (err) {
      console.error('Error fetching university details:', err);
    }
  };

  // Fetch all universities
  useEffect(() => {
    const fetchUniversities = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/universities', {
          credentials: 'include'
        });
        if (!response.ok) {
          throw new Error('Failed to fetch universities');
        }
        const data = await response.json();
        const universityList = Array.isArray(data.universities) ? data.universities : [];
        const formattedUniversities = universityList.map((uni: any) => ({
          University_ID: uni.university_id,
          University_Name: uni.name,
          Location: uni.location || '',
          Description: uni.description || '',
          Student_Population: uni.number_of_students?.toString() || ''
        }));
        setUniversities(formattedUniversities);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    };
    fetchUniversities();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.University_Name || !formData.Location || !formData.Description || !formData.Student_Population) {
      setMessage('Please fill in all fields');
      return;
    }
    try {
      const response = await fetch('http://localhost:5001/api/universities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.University_Name,
          location: formData.Location,
          description: formData.Description,
          number_of_students: formData.Student_Population
        }),
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to create university');
      }
      const newUniversityData = await response.json();
      // Refresh user data
      const refreshUserResponse = await fetch('http://localhost:5001/api/auth/me', { credentials: 'include' });
      if (refreshUserResponse.ok) {
        const userData = await refreshUserResponse.json();
        setUser(userData.user);
        if (userData.user.university_id) {
          fetchUserUniversity(userData.user.university_id);
        }
      }
      // Refresh all universities
      const universitiesResponse = await fetch('http://localhost:5001/api/universities', { credentials: 'include' });
      if (universitiesResponse.ok) {
        const data = await universitiesResponse.json();
        const universityList = Array.isArray(data.universities) ? data.universities : [];
        const formattedUniversities = universityList.map((uni: any) => ({
          University_ID: uni.university_id,
          University_Name: uni.name,
          Location: uni.location || '',
          Description: uni.description || '',
          Student_Population: uni.number_of_students?.toString() || ''
        }));
        setUniversities(formattedUniversities);
      }
      setFormData({
        University_Name: '',
        Location: '',
        Description: '',
        Student_Population: ''
      });
      setShowCreateForm(false);
      setShowChangeForm(false);
      setMessage('University created successfully');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleChangeUniversity = (universityId: number) => {
    fetch(`http://localhost:5001/api/users/university`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ university_id: universityId }),
      credentials: 'include'
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to update university');
        }
        return response.json();
      })
      .then(data => {
        fetch('http://localhost:5001/api/auth/me', { credentials: 'include' })
          .then(response => response.json())
          .then(userData => {
            setUser(userData.user);
            if (userData.user.university_id) {
              fetchUserUniversity(userData.user.university_id);
            }
            setShowChangeForm(false);
            setMessage('University updated successfully');
          });
      })
      .catch(err => {
        setMessage(err instanceof Error ? err.message : 'An error occurred');
      });
  };

  if (loading) return <div className="loading">Loading universities...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <>
      <Header />
      <div className="universities-container">
        <h1 className="page-title">Universities</h1>
        {message && <div className="message">{message}</div>}
        <div className="content-container">
          <div className="current-university-section">
            <h2>Your University</h2>
            {currentUniversity ? (
              <div className="current-university-info">
                <h3>{currentUniversity.University_Name}</h3>
                <p><strong>Location:</strong> {currentUniversity.Location}</p>
                <p><strong>Description:</strong> {currentUniversity.Description}</p>
                <p><strong>Student Population:</strong> {currentUniversity.Student_Population}</p>
                <button 
                  className="change-university-button"
                  onClick={() => setShowChangeForm(!showChangeForm)}
                >
                  {showChangeForm ? 'Cancel' : 'Change University'}
                </button>
              </div>
            ) : (
              <div className="no-university-info">
                <p>You are not associated with any university.</p>
                <button 
                  className="change-university-button"
                  onClick={() => setShowChangeForm(!showChangeForm)}
                >
                  {showChangeForm ? 'Cancel' : 'Select University'}
                </button>
              </div>
            )}
            {showChangeForm && (
              <div className="change-university-form">
                <h3>Select an Existing University</h3>
                <div className="university-selection">
                  {universities.map(university => (
                    <div key={university.University_ID} className="university-option">
                      <h4>{university.University_Name}</h4>
                      <p>{university.Location}</p>
                      <button 
                        onClick={() => handleChangeUniversity(university.University_ID || 0)}
                        className="select-university-button"
                      >
                        Select
                      </button>
                    </div>
                  ))}
                </div>
                <div className="create-new-option">
                  <h3>Or Create a New University</h3>
                  <button 
                    className="create-university-button"
                    onClick={() => setShowCreateForm(!showCreateForm)}
                  >
                    {showCreateForm ? 'Cancel' : 'Create New University'}
                  </button>
                </div>
                {showCreateForm && (
                  <form onSubmit={handleSubmit} className="create-university-form">
                    <div className="form-group">
                      <label htmlFor="name">University Name:</label>
                      <input 
                        type="text" 
                        id="name" 
                        name="University_Name" 
                        value={formData.University_Name}
                        onChange={handleInputChange}
                        ref={universityNameRef}
                        required
                      />
                      <label htmlFor="location">Location (Auto-filled from Google Maps):</label>
                      <input 
                        type="text" 
                        id="location" 
                        name="Location" 
                        value={formData.Location}
                        onChange={handleInputChange}
                        required
                      />
                      <label htmlFor="description">Description:</label>
                      <input 
                        type="text" 
                        id="description" 
                        name="Description" 
                        value={formData.Description}
                        onChange={handleInputChange}
                        required
                      />
                      <label htmlFor="population">Student Population:</label>
                      <input 
                        type="text" 
                        id="population" 
                        name="Student_Population" 
                        value={formData.Student_Population}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <button type="submit" className="create-university-button">Create University</button>
                  </form>
                )}
              </div>
            )}
          </div>
          <div className="view-universities">
            <h2>All Universities</h2>
            <ul className="universities-list">
              {universities.length === 0 ? (
                <p>No universities found.</p>
              ) : (
                universities.map((university) => (
                  <li key={university.University_ID} className="university-item">
                    <h3>Name: {university.University_Name}</h3>
                    <h4>
                      <p>Location: {university.Location}</p>
                      <p>Description: {university.Description}</p>
                      <p>Student Population: {university.Student_Population}</p>
                    </h4>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default Universities;
