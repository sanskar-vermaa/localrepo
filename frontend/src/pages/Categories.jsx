import { useEffect, useState } from 'react';
import client from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Categories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);

  function load() {
    client.get('/categories').then((res) => setCategories(res.data));
  }

  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      await client.post('/categories', { name, description });
      setName('');
      setDescription('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create category');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this category?')) return;
    await client.delete(`/categories/${id}`);
    load();
  }

  return (
    <div>
      <h1>Categories</h1>

      {user?.role === 'admin' && (
        <form onSubmit={handleCreate} className="card form-row">
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <button type="submit" className="btn-primary">Add category</button>
        </form>
      )}
      {error && <p className="error-text">{error}</p>}

      <table>
        <thead><tr><th>Name</th><th>Description</th>{user?.role === 'admin' && <th></th>}</tr></thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td className="muted">{c.description}</td>
              {user?.role === 'admin' && (
                <td><button className="btn-danger" onClick={() => handleDelete(c.id)}>Delete</button></td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
