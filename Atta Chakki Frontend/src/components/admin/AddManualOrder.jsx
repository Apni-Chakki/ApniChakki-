import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Plus, Trash2, Save, ShoppingCart, User } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '../ui/checkbox';

export function AddManualOrder() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  
  const [products, setProducts] = useState([]); 
  
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    address: 'Shop Pickup'
  });

  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [qty, setQty] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [orderStatus, setOrderStatus] = useState('pending');
  const [isCleaning, setIsCleaning] = useState(true);
  const [isGrinding, setIsGrinding] = useState(true);

  useEffect(() => {
    if (selectedProduct) {
       const product = products.find(p => p.id.toString() === selectedProduct.toString());
       if (product && product.is_grinding_service) {
          setIsCleaning(true);
          setIsGrinding(true);
       }
    }
  }, [selectedProduct, products]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/get_products.php`);
        const data = await response.json();

        if (data.success && Array.isArray(data.products)) {
          setProducts(data.products);
        } else {
          toast.error(t("Failed to load products list."));
        }
      } catch (error) {
        console.error("Fetch Error:", error);
        toast.error(t("Network Error: Could not connect to database."));
      }
    };

    loadProducts();
  }, []);

  const addToCart = () => {
    if (!selectedProduct) return;
    
    const product = products.find(p => p.id.toString() === selectedProduct.toString());
    
    if (!product) return;

    let originalPrice = parseFloat(product.price);
    if (product.is_grinding_service) {
       originalPrice = 0;
       if (isCleaning) originalPrice += parseFloat(product.cleaning_price || 0);
       if (isGrinding) originalPrice += parseFloat(product.grinding_price || 0);
       if (originalPrice === 0 && !isCleaning && !isGrinding) originalPrice = parseFloat(product.price);
    }

    let itemPrice = originalPrice;
    const discountType = product.discount_type || 'none';
    const discountValue = parseFloat(product.discount_value) || 0;
    
    if (discountType === 'percentage') {
      itemPrice = Math.max(0, itemPrice - (itemPrice * discountValue / 100));
    } else if (discountType === 'fixed') {
      itemPrice = Math.max(0, itemPrice - discountValue);
    }

    const newItem = {
      id: product.id,
      name: product.name,
      price: itemPrice,
      original_price: originalPrice,
      quantity: parseInt(qty),
      is_cleaning: product.is_grinding_service ? (isCleaning ? 1 : 0) : 0,
      is_grinding: product.is_grinding_service ? (isGrinding ? 1 : 0) : 0,
      is_grinding_service: product.is_grinding_service
    };

    setCart([...cart, newItem]);
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
    if (!customer.phone || cart.length === 0) {
      toast.error(t("Please enter customer phone and add items."));
      return;
    }

    setLoading(true);
    try {
      const orderTotal = calculateTotal();
      let paidAmount = 0;
      if (paymentStatus === 'paid') {
        paidAmount = orderTotal;
      } else if (paymentStatus === 'partial') {
        paidAmount = parseFloat(amountPaid) || 0;
        if (paidAmount <= 0 || paidAmount >= orderTotal) {
          toast.error(t('Partial amount must be between 1 and ') + (orderTotal - 1));
          setLoading(false);
          return;
        }
      }

      const payload = {
        name: customer.name,
        phone: customer.phone.trim(),
        address: customer.address,
        items: cart,
        total: orderTotal,
        status: orderStatus,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        amount_paid: paidAmount
      };

      const response = await fetch(`${API_BASE_URL}/admin_create_order.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(t("Order Created Successfully!"));
        navigate('/admin');
      } else {
        toast.error(data.message || t("Failed to create order"));
      }
    } catch (error) {
      console.error(error);
      toast.error(t("Network Error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('Add Manual Order')}</h1>
          <p className="text-muted-foreground">{t('Create order for walk-in or phone customers')}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin')}>{t('Cancel')}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Customer Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> {t('Customer Details')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t('Phone Number')} ({t('Required')})</Label>
              <Input 
                placeholder="03001234567" 
                value={customer.phone}
                onChange={e => setCustomer({...customer, phone: e.target.value})}
              />
            </div>
            <div>
              <Label>{t('Full Name')}</Label>
              <Input 
                placeholder={t('Guest Customer')} 
                value={customer.name}
                onChange={e => setCustomer({...customer, name: e.target.value})}
              />
            </div>
            <div>
              <Label>{t('Address')} / {t('Notes')}</Label>
              <Input 
                placeholder={t('Shop Pickup')} 
                value={customer.address}
                onChange={e => setCustomer({...customer, address: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Order Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Order Settings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>{t('Payment Status')}</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t('Unpaid')}</SelectItem>
                    <SelectItem value="paid">{t('Paid')}</SelectItem>
                    <SelectItem value="partial">{t('Partial')}</SelectItem>
                  </SelectContent>
                </Select>
                {paymentStatus === 'partial' && (
                  <div className="mt-2">
                    <Label className="text-sm">{t('Amount Paid')}</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder={t('Enter partial amount...')}
                      value={amountPaid}
                      onChange={e => setAmountPaid(e.target.value)}
                      className="mt-1"
                    />
                    {amountPaid && parseFloat(amountPaid) > 0 && (
                      <p className="text-xs text-orange-600 mt-1">
                        {t('Udhaar')}: Rs. {Math.max(0, calculateTotal() - parseFloat(amountPaid)).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>{t('Payment Method')}</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('Cash Payment')}</SelectItem>
                  <SelectItem value="jazzcash">JazzCash</SelectItem>
                  <SelectItem value="bank">{t('Bank Transfer')}</SelectItem>
                  <SelectItem value="udhaar">{t('Udhaar Khata')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" /> {t('Add Products')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end mb-6">
            <div className="flex-1">
              <Label>{t('Select Product')}</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder={t('Choose an item...')} />
                </SelectTrigger>
                <SelectContent>
                  {products.length > 0 ? (
                    products.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name} (Rs. {p.price})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>{t('Loading Products...')}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <Label>{t('Quantity')}</Label>
              <Input 
                type="number" 
                min="1" 
                value={qty} 
                onChange={e => setQty(e.target.value)} 
              />
            </div>
          </div>

          {selectedProduct && products.find(p => p.id.toString() === selectedProduct.toString())?.is_grinding_service && (
            <div className="flex gap-6 mb-6 p-4 bg-muted rounded-lg border border-border">
               <div className="flex items-center space-x-2">
                 <Checkbox 
                   id="admin-cleaning" 
                   checked={isCleaning} 
                   onCheckedChange={(checked) => setIsCleaning(!!checked)} 
                 />
                 <Label htmlFor="admin-cleaning" className="text-sm font-medium">{t('Cleaning')}</Label>
               </div>
               <div className="flex items-center space-x-2">
                 <Checkbox 
                   id="admin-grinding" 
                   checked={isGrinding} 
                   onCheckedChange={(checked) => setIsGrinding(!!checked)} 
                 />
                 <Label htmlFor="admin-grinding" className="text-sm font-medium">{t('Grinding')}</Label>
               </div>
               <p className="text-xs text-muted-foreground ml-auto flex items-center">
                 {t('Current Price')}: Rs. {(() => {
                    const p = products.find(prod => prod.id.toString() === selectedProduct.toString());
                    let pr = 0;
                    if (isCleaning) pr += parseFloat(p.cleaning_price || 0);
                    if (isGrinding) pr += parseFloat(p.grinding_price || 0);
                    return pr;
                 })()}
               </p>
            </div>
          )}

          <div className="flex justify-end mb-6">
            <Button onClick={addToCart} disabled={!selectedProduct || selectedProduct === "none"}>
              <Plus className="h-4 w-4 mr-2" /> {t('Add to Cart')}
            </Button>
          </div>

          {/* Cart Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3">{t('Product')}</th>
                  <th className="p-3">{t('Price')}</th>
                  <th className="p-3">{t('Quantity')}</th>
                  <th className="p-3">{t('Total')}</th>
                  <th className="p-3">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr><td colSpan="5" className="p-4 text-center text-muted-foreground">{t('Cart is empty')}</td></tr>
                ) : (
                  cart.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-3">
                        <div>{item.name}</div>
                        {item.is_grinding_service && (
                          <div className="text-[10px] text-muted-foreground">
                            ({item.is_cleaning ? t('Cleaning') : ''}{item.is_cleaning && item.is_grinding ? ' + ' : ''}{item.is_grinding ? t('Grinding') : ''})
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {item.original_price && item.original_price > item.price ? (
                          <div className="flex flex-col">
                            <span className="line-through text-xs text-muted-foreground">Rs. {item.original_price.toLocaleString()}</span>
                            <span className="text-green-600 font-bold">Rs. {item.price.toLocaleString()}</span>
                            <span className="text-[9px] text-green-700 bg-green-50 px-1 py-0.5 rounded border border-green-200 w-max font-bold mt-0.5">🏷 DISC</span>
                          </div>
                        ) : (
                          <span>Rs. {item.price.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="p-3">{item.quantity}</td>
                      <td className="p-3">Rs. {(item.price * item.quantity).toLocaleString()}</td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm" onClick={() => removeFromCart(idx)} className="text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-muted font-bold">
                <tr>
                  <td colSpan="3" className="p-3 text-right">{t('Grand Total')}:</td>
                  <td className="p-3">Rs. {calculateTotal().toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <Button size="lg" onClick={handleSubmit} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? t('Creating Order...') : t('Create Order')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}