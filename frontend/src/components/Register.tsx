import React, { useState, useEffect } from 'react';

interface University {
  university_id: number;
  name: string;
}

interface RegisterProps {
  onRegister: (username: string, password: string, email: string, universityId: number | null, role: string) => void;
}

const Register: React.FC<RegisterProps> = ({ onRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [universityId, setUniversityId] = useState<number | null>(null);
  const [role, setRole] = useState('student');
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch universities for the dropdown
  useEffect(() => {
    const fetchUniversities = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/register', {
          method: 'GET',
          credentials: 'include',
        });
        
        const data = await response.json();
        
        if (response.ok) {
          setUniversities(data.universities);
        } else {
          setError('Failed to fetch universities');
        }
      } catch (err) {
        setError('Error fetching universities');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUniversities();
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    // For super_admin, university is optional
    if (role !== 'super_admin' && !universityId) {
      setError('University is required for students and admins');
      return;
    }
    
    onRegister(username, password, email, universityId, role);
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      
      <div className="form-group">
        <label htmlFor="username">Username:</label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="password">Password:</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="role">Role:</label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="student">Student</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </div>
      
      <div className="form-group">
        <label htmlFor="university">University:</label>
        <select
          id="university"
          value={universityId || ''}
          onChange={(e) => setUniversityId(e.target.value ? parseInt(e.target.value) : null)}
          disabled={loading}
          required={role !== 'super_admin'}
        >
          <option value="">-- Select University --</option>
          {universities.map((uni) => (
            <option key={uni.university_id} value={uni.university_id}>
              {uni.name}
            </option>
          ))}
        </select>
        {loading && <span> Loading universities...</span>}
      </div>
      
      <button type="submit" disabled={loading}>Register</button>
    </form>
  );
};

export default Register; 