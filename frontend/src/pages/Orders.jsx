import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client.js';

const statusClass = { COMPLETED: 'badge success', CANCELLED: 'badge danger', PENDING: 'badge' };

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');

  function load() {
    client.get('/orders', { params: status ? { status } : {} }).then((res) => setOrders(res.data));
  }

  useEffect(load, [status]);

  return (
    <div>
      <div className="page-header">
        <h1>Orders</h1>
        <Link to="/orders/new" className="btn-primary">New order</Link>
      </div>

      <select value={status} onChange={(e) => setStatus(e.target.value)} className="search-input">
        <option value="">All statuses</option>
        <option value="COMPLETED">Completed</option>
        <option value="CANCELLED">Cancelled</option>
      </select>

      <table>
        <thead><tr><th>ID</th><th>Date</th><th>Status</th><th>Total</th><th></th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>#{o.id}</td>
              <td className="muted">{new Date(o.created_at).toLocaleString()}</td>
              <td><span className={statusClass[o.status] || 'badge'}>{o.status}</span></td>
              <td>₹{o.total.toFixed(2)}</td>
              <td><Link to={`/orders/${o.id}`}>View</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
