import { useEffect, useState } from 'react';
import client from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = { sku: '', name: '', category_id: '', price: '', cost: '', reorder_level: 5 };

export default function Products() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const pageSize = 10;

  function load() {
    client.get('/products', { params: { search, page, pageSize } }).then((res) => {
      setItems(res.data.items);
      setTotal(res.data.total);
    });
  }

  useEffect(load, [search, page]);
  useEffect(() => {
    client.get('/categories').then((res) => setCategories(res.data));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      await client.post('/products', {
        ...form,
        category_id: form.category_id || null,
        price: Number(form.price),
        cost: Number(form.cost || 0),
        reorder_level: Number(form.reorder_level),
      });
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create product');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <h1>Products</h1>

      <input
        placeholder="Search by name or SKU…"
        value={search}
        onChange={(e) => { setPage(1); setSearch(e.target.value); }}
        className="search-input"
      />

      {user?.role === 'admin' && (
        <form onSubmit={handleCreate} className="card form-row">
          <input placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">No category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input placeholder="Price" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <input placeholder="Cost" type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          <input placeholder="Reorder level" type="number" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} />
          <button type="submit" className="btn-primary">Add product</button>
        </form>
      )}
      {error && <p className="error-text">{error}</p>}

      <table>
        <thead>
          <tr><th>SKU</th><th>Name</th><th>Price</th><th>Stock</th><th>Reorder level</th></tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id}>
              <td>{p.sku}</td>
              <td>{p.name}</td>
              <td>₹{p.price.toFixed(2)}</td>
              <td className={p.quantity <= p.reorder_level ? 'danger-text' : ''}>{p.quantity}</td>
              <td>{p.reorder_level}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
        <span>Page {page} of {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  );
}
