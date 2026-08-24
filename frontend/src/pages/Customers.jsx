import { useEffect, useState } from 'react';
import client from '../api/client.js';

const emptyForm = { name: '', email: '', phone: '', address: '' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);

  function load() {
    client.get('/customers', { params: search ? { search } : {} }).then((res) => setCustomers(res.data));
  }

  useEffect(load, [search]);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      await client.post('/customers', form);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add customer');
    }
  }

  return (
    <div>
      <h1>Customers</h1>
      <input placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)} className="search-input" />

      <form onSubmit={handleCreate} className="card form-row">
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <button type="submit" className="btn-primary">Add customer</button>
      </form>
      {error && <p className="error-text">{error}</p>}

      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Address</th></tr></thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td className="muted">{c.email}</td>
              <td className="muted">{c.phone}</td>
              <td className="muted">{c.address}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
