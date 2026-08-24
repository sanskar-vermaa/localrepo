import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client.js';

export default function OrderForm() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [cart, setCart] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    client.get('/products', { params: { pageSize: 100 } }).then((res) => setProducts(res.data.items));
    client.get('/customers').then((res) => setCustomers(res.data));
  }, []);

  function addToCart(productId) {
    const product = products.find((p) => p.id === Number(productId));
    if (!product) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) => (i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  }

  function updateQuantity(productId, quantity) {
    setCart((prev) => prev.map((i) => (i.product_id === productId ? { ...i, quantity } : i)));
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  }

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const { data } = await client.post('/orders', {
        customer_id: customerId || null,
        items: cart.map(({ product_id, quantity }) => ({ product_id, quantity })),
      });
      navigate(`/orders/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create order');
    }
  }

  return (
    <div>
      <h1>New order</h1>

      <div className="card form-row">
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">Walk-in customer</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select onChange={(e) => e.target.value && addToCart(e.target.value)} defaultValue="">
          <option value="" disabled>Add a product…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id} disabled={p.quantity === 0}>
              {p.name} — ₹{p.price.toFixed(2)} ({p.quantity} in stock)
            </option>
          ))}
        </select>
      </div>

      {cart.length > 0 && (
        <table>
          <thead><tr><th>Product</th><th>Price</th><th>Qty</th><th>Subtotal</th><th></th></tr></thead>
          <tbody>
            {cart.map((item) => (
              <tr key={item.product_id}>
                <td>{item.name}</td>
                <td>₹{item.price.toFixed(2)}</td>
                <td>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.product_id, Math.max(1, Number(e.target.value)))}
                    className="qty-input"
                  />
                </td>
                <td>₹{(item.price * item.quantity).toFixed(2)}</td>
                <td><button className="btn-danger" onClick={() => removeFromCart(item.product_id)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="order-total">Total: ₹{total.toFixed(2)}</div>
      {error && <p className="error-text">{error}</p>}

      <button className="btn-primary" onClick={handleSubmit} disabled={cart.length === 0}>
        Place order
      </button>
    </div>
  );
}
