import { useEffect, useState } from 'react';
import client from '../api/client.js';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [form, setForm] = useState({ product_id: '', type: 'IN', quantity: '', reason: '' });
  const [error, setError] = useState(null);

  function loadMovements() {
    client.get('/inventory/movements').then((res) => setMovements(res.data));
  }

  useEffect(() => {
    client.get('/products', { params: { pageSize: 100 } }).then((res) => setProducts(res.data.items));
    loadMovements();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await client.post('/inventory/movements', {
        ...form,
        product_id: Number(form.product_id),
        quantity: Number(form.quantity),
      });
      setForm({ product_id: '', type: 'IN', quantity: '', reason: '' });
      loadMovements();
      client.get('/products', { params: { pageSize: 100 } }).then((res) => setProducts(res.data.items));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record movement');
    }
  }

  return (
    <div>
      <h1>Inventory</h1>

      <form onSubmit={handleSubmit} className="card form-row">
        <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} required>
          <option value="">Select product…</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name} (stock: {p.quantity})</option>)}
        </select>
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="IN">Restock (IN)</option>
          <option value="ADJUSTMENT">Adjustment (+/-)</option>
        </select>
        <input placeholder="Quantity" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
        <input placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <button type="submit" className="btn-primary">Record movement</button>
      </form>
      {error && <p className="error-text">{error}</p>}

      <table>
        <thead><tr><th>Date</th><th>Product</th><th>Type</th><th>Qty</th><th>Reason</th></tr></thead>
        <tbody>
          {movements.map((m) => {
            const product = products.find((p) => p.id === m.product_id);
            return (
              <tr key={m.id}>
                <td className="muted">{new Date(m.created_at).toLocaleString()}</td>
                <td>{product?.name || `#${m.product_id}`}</td>
                <td>{m.type}</td>
                <td>{m.quantity}</td>
                <td className="muted">{m.reason}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
