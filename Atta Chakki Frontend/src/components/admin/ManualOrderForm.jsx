import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Plus, Trash2, Save, ShoppingCart, User } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config';

export function AddManualOrder() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // --- NUCLEAR TEST DATA ---
  // API is DISABLED. If you don't see these, restart your browser.
  const [products, setProducts] = useState([
     { id: 101, name: "NUCLEAR TEST ATTA", price: 150 },
     { id: 102, name: "NUCLEAR TEST RICE", price: 300 }
  ]);
  
  const [customer, setCustomer] = useState({ name: '', phone: '', address: 'Shop Pickup' });
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [qty, setQty] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [orderStatus, setOrderStatus] = useState('pending');

  // --- API DISABLED ---
  // useEffect(() => {
  //   We are NOT fetching anything. 
  //   This proves if the UI can simply show a list.
  // }, []);

  const addToCart = () => {
    if (!selectedProduct) return;
    const product = products.find(p => p.id.toString() === selectedProduct.toString());
    if (!product) return;
    setCart([...cart, { ...product, quantity: parseInt(qty) }]);
    setSelectedProduct('');
    setQty(1);
  };

  const removeFromCart = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleSubmit = async () => {
      // Keep submit logic active so you can test sending orders
      // ... (Same as before)
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-red-600">NUCLEAR MODE (No API)</h1>
        <Button variant="outline" onClick={() => navigate('/admin')}>Cancel</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Card */}
        <Card>
          <CardHeader><CardTitle>Customer Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
             <Input placeholder="0300..." value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} />
          </CardContent>
        </Card>

        {/* Settings Card */}
        <Card>
          <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
              <select className="border p-2 w-full rounded" value={orderStatus} onChange={e => setOrderStatus(e.target.value)}>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
              </select>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Products</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end mb-6">
            <div className="flex-1">
              <Label className="text-lg text-red-600 font-bold">SELECT PRODUCT HERE:</Label>
              
              {/* STANDARD HTML SELECT */}
              <select 
                className="w-full p-3 border-2 border-black bg-white text-black rounded"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
              >
                <option value="">-- OPEN THIS --</option>
                {products.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.name} (Rs. {p.price})
                    </option>
                ))}
              </select>

            </div>
            <div className="w-24">
               <Label>Qty</Label>
               <Input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />
            </div>
            <Button onClick={addToCart}><Plus className="h-4 w-4 mr-2" /> Add</Button>
          </div>

          <div className="border p-4 rounded bg-gray-50">
             {cart.length === 0 ? "Cart is Empty" : cart.map((item, i) => (
                 <div key={i} className="flex justify-between border-b p-2">
                     <span>{item.name} x {item.quantity}</span>
                     <Button size="sm" variant="ghost" onClick={() => removeFromCart(i)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                 </div>
             ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}