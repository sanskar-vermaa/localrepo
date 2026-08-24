import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client.js';

export default function Dashboard() {
  const [lowStock, setLowStock] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      client.get('/inventory/low-stock'),
      client.get('/reports/sales-summary'),
    ])
      .then(([lowStockRes, summaryRes]) => {
        setLowStock(lowStockRes.data);
        setSummary(summaryRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading dashboard…</p>;

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="stat-grid">
        <div className="card stat">
          <span className="muted">Completed orders</span>
          <strong>{summary?.order_count ?? 0}</strong>
        </div>
        <div className="card stat">
          <span className="muted">Total revenue</span>
          <strong>₹{Number(summary?.revenue ?? 0).toFixed(2)}</strong>
        </div>
        <div className="card stat">
          <span className="muted">Low stock items</span>
          <strong>{lowStock.length}</strong>
        </div>
      </div>

      <section className="card">
        <h2>Low stock alerts</h2>
        {lowStock.length === 0 ? (
          <p className="muted">Everything is above its reorder level.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Product</th><th>SKU</th><th>Quantity</th><th>Reorder level</th></tr>
            </thead>
            <tbody>
              {lowStock.map((p) => (
                <tr key={p.id}>
                  <td><Link to="/products">{p.name}</Link></td>
                  <td>{p.sku}</td>
                  <td className="danger-text">{p.quantity}</td>
                  <td>{p.reorder_level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
