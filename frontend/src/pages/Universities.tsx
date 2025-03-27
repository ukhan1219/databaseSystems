import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import './Universities.css';

interface University {
  University_ID?: number;
  University_Name: string;
  Location: string;
  Description: string;
  Student_Population: string;
}

const Universities: React.FC = () => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [formData, setFormData] = useState<University>({
    University_Name: '',
    Location: '',
    Description: '',
    Student_Population: ''
  });

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
  
        setUniversities(universityList); // ✅ now you're setting just the array
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
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.University_Name || !formData.Location || !formData.Description || !formData.Student_Population) {
      setMessage('Please fill in all fields');
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5001/api/universities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to create university');
      }

      const newUniversity = await response.json();
      
      // Update universities list
      setUniversities([...universities, newUniversity]);
      
      // Reset form
      setFormData({
        University_Name: '',
        Location: '',
        Description: '',
        Student_Population: ''
      });
      
      setMessage('University created successfully');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <>
      <Header />
      <div className="universities-container">
        <h1 className="page-title">Universities</h1>
        
        {message && <div className="message">{message}</div>}
        
        <div className="content-container">
          <div className="new-university">
            <h2>New University</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">University Name:</label>
                <input 
                  type="text" 
                  id="name" 
                  name="University_Name" 
                  value={formData.University_Name}
                  onChange={handleInputChange}
                />
                
                <label htmlFor="location">Location:</label>
                <input 
                  type="text" 
                  id="location" 
                  name="Location" 
                  value={formData.Location}
                  onChange={handleInputChange}
                />
                
                <label htmlFor="description">Description:</label>
                <input 
                  type="text" 
                  id="description" 
                  name="Description" 
                  value={formData.Description}
                  onChange={handleInputChange}
                />
                
                <label htmlFor="population">Student Population:</label>
                <input 
                  type="text" 
                  id="population" 
                  name="Student_Population" 
                  value={formData.Student_Population}
                  onChange={handleInputChange}
                />
              </div>
              
              <button type="submit" className="create-button">Create</button>
            </form>
          </div>
          
          <div className="view-universities">
            <h2>Posted Universities</h2>
            <ul className="universities-list">
              {universities.length === 0 ? (
                <p>No universities found.</p>
              ) : (
                universities.map((university, index) => (
                  <li key={index} className="university-item">
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