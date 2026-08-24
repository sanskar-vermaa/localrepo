import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client.js';

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    client.get(`/orders/${id}`).then((res) => setOrder(res.data));
  }

  useEffect(load, [id]);

  async function handleCancel() {
    if (!window.confirm('Cancel this order and restore stock?')) return;
    setError(null);
    try {
      await client.post(`/orders/${id}/cancel`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel order');
    }
  }

  if (!order) return <p>Loading order…</p>;

  return (
    <div>
      <div className="page-header">
        <h1>Order #{order.id}</h1>
        {order.status === 'COMPLETED' && (
          <button className="btn-danger" onClick={handleCancel}>Cancel order</button>
        )}
      </div>

      <p className="muted">
        Status: <strong>{order.status}</strong> · Placed {new Date(order.created_at).toLocaleString()}
      </p>
      {error && <p className="error-text">{error}</p>}

      <table>
        <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit price</th><th>Subtotal</th></tr></thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>{item.product_name}</td>
              <td className="muted">{item.sku}</td>
              <td>{item.quantity}</td>
              <td>₹{item.unit_price.toFixed(2)}</td>
              <td>₹{(item.unit_price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="order-total">Total: ₹{order.total.toFixed(2)}</div>
    </div>
  );
}
