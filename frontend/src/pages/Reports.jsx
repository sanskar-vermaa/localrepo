import { useEffect, useState } from 'react';
import client from '../api/client.js';

export default function Reports() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [summary, setSummary] = useState(null);
  const [topProducts, setTopProducts] = useState([]);

  function load() {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    client.get('/reports/sales-summary', { params }).then((res) => setSummary(res.data));
    client.get('/reports/top-products').then((res) => setTopProducts(res.data));
  }

  useEffect(load, [from, to]);

  return (
    <div>
      <h1>Reports</h1>

      <div className="card form-row">
        <label>From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>

      <div className="stat-grid">
        <div className="card stat">
          <span className="muted">Orders</span>
          <strong>{summary?.order_count ?? 0}</strong>
        </div>
        <div className="card stat">
          <span className="muted">Revenue</span>
          <strong>₹{Number(summary?.revenue ?? 0).toFixed(2)}</strong>
        </div>
      </div>

      <section className="card">
        <h2>Top-selling products</h2>
        <table>
          <thead><tr><th>Product</th><th>SKU</th><th>Units sold</th><th>Revenue</th></tr></thead>
          <tbody>
            {topProducts.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td className="muted">{p.sku}</td>
                <td>{p.units_sold}</td>
                <td>₹{p.revenue.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
