import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/card';
import { Input } from '../../components/common/input';
import { Label } from '../../components/common/label';
import { Button } from '../../components/common/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/common/select';
import { Plus, Trash2, Save, ShoppingCart, User } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '../../components/common/checkbox';

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

  // Dynamic customization selections for currently selected product
  const [selectedOptions, setSelectedOptions] = useState({});

  useEffect(() => {
    if (selectedProduct) {
       const product = products.find(p => p.id.toString() === selectedProduct.toString());
       if (product) {
          const custs = getEffectiveCustomizations(product);
          // Select all by default
          const defaults = {};
          custs.forEach((_, i) => { defaults[i] = true; });
          setSelectedOptions(defaults);
       }
    }
  }, [selectedProduct, products]);

  const getEffectiveCustomizations = (product) => {
    if (product.customizations && product.customizations.length > 0) {
      return product.customizations;
    }
    if (product.is_grinding_service == 1 || product.is_grinding_service === true) {
      return [
        { option_name: 'Cleaning', option_price: product.cleaning_price || 0 },
        { option_name: 'Grinding', option_price: product.grinding_price || 0 }
      ];
    }
    return [];
  };

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

    const custs = getEffectiveCustomizations(product);
    const hasCustomizations = custs.length > 0;

    // Stock validation
    const isService = product.unit?.toLowerCase() === 'trip';
    const requestedQty = parseInt(qty);
    const existingQty = cart
      .filter(item => item.id === product.id)
      .reduce((sum, item) => sum + item.quantity, 0);

    if (!isService && !hasCustomizations && product.stock_quantity < (requestedQty + existingQty)) {
      toast.error(`${t('Insufficient stock')}. ${t('Available')}: ${product.stock_quantity}. ${t('Already in cart')}: ${existingQty}`);
      return;
    }

    let itemPrice = parseFloat(product.price);
    const selected = [];

    if (hasCustomizations) {
      itemPrice = 0;
      custs.forEach((c, i) => {
        if (selectedOptions[i]) {
          itemPrice += parseFloat(c.option_price || 0);
          selected.push({ option_name: c.option_name, option_price: parseFloat(c.option_price || 0) });
        }
      });
      if (itemPrice === 0 && selected.length === 0) itemPrice = parseFloat(product.price);
    }

    // Backward compat
    const isCleaning = selected.some(s => s.option_name.toLowerCase().includes('clean')) ? 1 : 0;
    const isGrinding = selected.some(s => s.option_name.toLowerCase().includes('grind')) ? 1 : 0;

    const newItem = {
      id: product.id,
      name: product.name,
      price: itemPrice,
      quantity: parseInt(qty),
      is_cleaning: hasCustomizations ? isCleaning : 0,
      is_grinding: hasCustomizations ? isGrinding : 0,
      has_customizations: hasCustomizations,
      selected_customizations: selected
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

  // Get effective customizations for currently selected product
  const currentProduct = products.find(p => p.id.toString() === selectedProduct.toString());
  const currentCustomizations = currentProduct ? getEffectiveCustomizations(currentProduct) : [];

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
              <Input placeholder="03001234567" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} />
            </div>
            <div>
              <Label>{t('Full Name')}</Label>
              <Input placeholder={t('Guest Customer')} value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} />
            </div>
            <div>
              <Label>{t('Address')} / {t('Notes')}</Label>
              <Input placeholder={t('Shop Pickup')} value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} />
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
                    <Input type="number" min="1" placeholder={t('Enter partial amount...')} value={amountPaid} onChange={e => setAmountPaid(e.target.value)} className="mt-1" />
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
                        {p.unit?.toLowerCase() !== 'trip' && parseInt(p.is_grinding_service) !== 1 && (!p.customizations || p.customizations.length === 0) && ` - ${t('Stock')}: ${p.stock_quantity}`}
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
              <Input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />
            </div>
          </div>

          {/* Dynamic Customizations for selected product */}
          {selectedProduct && currentCustomizations.length > 0 && (
            <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted rounded-lg border border-border">
              {currentCustomizations.map((cust, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`admin-cust-${idx}`} 
                    checked={!!selectedOptions[idx]} 
                    onCheckedChange={(checked) => setSelectedOptions(prev => ({ ...prev, [idx]: !!checked }))} 
                  />
                  <Label htmlFor={`admin-cust-${idx}`} className="text-sm font-medium">
                    {t(cust.option_name)} (Rs. {cust.option_price})
                  </Label>
                </div>
              ))}
              <p className="text-xs text-muted-foreground ml-auto flex items-center">
                {t('Current Price')}: Rs. {currentCustomizations.reduce((sum, c, i) => sum + (selectedOptions[i] ? parseFloat(c.option_price || 0) : 0), 0)}
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
                        {item.selected_customizations && item.selected_customizations.length > 0 && (
                          <div className="text-[10px] text-muted-foreground">
                            ({item.selected_customizations.map(c => t(c.option_name)).join(' + ')})
                          </div>
                        )}
                      </td>
                      <td className="p-3">Rs. {item.price}</td>
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
