import { useState, useEffect } from 'react';
import { Card } from '../../components/common/card';
import { Button } from '../../components/common/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, Eye, AlertCircle, Phone, User, MessageSquare, ChevronDown, ChevronUp, ShoppingBag, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/common/select";
import { API_BASE_URL } from '../../config';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/common/dialog';
import { Input } from '../../components/common/input';
import { Label } from '../../components/common/label';

export default function CustomMixRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Convert to order state variables
  const [convertingRequest, setConvertingRequest] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [orderQuantity, setOrderQuantity] = useState(5);
  const [orderAddress, setOrderAddress] = useState('Store Pickup');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [ratios, setRatios] = useState([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Custom ingredient states
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientPrice, setNewIngredientPrice] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleOpenConvertModal = (request) => {
    setConvertingRequest(request);
    setOrderQuantity(parseFloat(request.total_quantity) || 5);
    setOrderAddress(request.shipping_address || 'Store Pickup');
    setPaymentStatus('pending');
    setPaymentMethod('cash');
    
    // Parse selected items
    const parsedItems = Array.isArray(request.selected_items) 
      ? request.selected_items.map(item => ({
          item_name: item.item_name,
          price_per_kg: parseFloat(item.price_per_kg) || 30,
          ratio: parseFloat(item.ratio) || 0
        }))
      : [];
      
    setRatios(parsedItems);
    setModalOpen(true);
  };

  const getCalculatedPrice = () => {
    let totalPrice = 0;
    let totalRatio = 0;
    ratios.forEach(r => {
      totalPrice += r.ratio * r.price_per_kg;
      totalRatio += r.ratio;
    });
    return totalRatio > 0 ? (totalPrice / totalRatio) : 0;
  };

  const handleRatioChange = (index, value) => {
    const newVal = parseFloat(value) || 0;
    setRatios(prev => prev.map((item, idx) => idx === index ? { ...item, ratio: newVal } : item));
  };

  const handleAddNewIngredient = () => {
    if (!newIngredientName.trim() || !newIngredientPrice) {
      toast.error('Please enter ingredient name and price');
      return;
    }
    const price = parseFloat(newIngredientPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    
    if (ratios.some(r => r.item_name.toLowerCase() === newIngredientName.trim().toLowerCase())) {
      toast.error('This ingredient already exists in the mix');
      return;
    }

    setRatios(prev => [
      ...prev,
      {
        item_name: newIngredientName.trim(),
        price_per_kg: price,
        ratio: 0.5
      }
    ]);
    setNewIngredientName('');
    setNewIngredientPrice('');
    setShowAddForm(false);
    toast.success(`"${newIngredientName.trim()}" added to mix proportions!`);
  };

  const handleConvertSubmit = async () => {
    if (!convertingRequest) return;
    
    const calculatedPrice = getCalculatedPrice();
    if (calculatedPrice <= 0) {
      toast.error('Please select a valid mix ratio');
      return;
    }
    
    setIsSubmittingOrder(true);
    try {
      const orderPayload = {
        name: convertingRequest.customer_name,
        phone: convertingRequest.customer_phone,
        address: orderAddress || 'Store Pickup',
        status: 'processing',
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        total: Math.round(calculatedPrice * orderQuantity),
        amount_paid: paymentStatus === 'paid' ? Math.round(calculatedPrice * orderQuantity) : 0,
        items: [
          {
            id: convertingRequest.product_id,
            quantity: parseFloat(orderQuantity),
            price: Math.round(calculatedPrice),
            is_cleaning: 0,
            is_grinding: 0,
            selected_customizations: ratios.filter(r => r.ratio > 0).map(r => ({
              option_name: `Mix: ${r.item_name} (${parseFloat(r.ratio).toFixed(2)}kg)`,
              option_price: 0
            }))
          }
        ]
      };
      
      const response = await fetch(`${API_BASE_URL}/admin_create_order.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      
      const result = await response.json();
      if (result.success) {
        toast.success('Custom mix request successfully converted to active scheduled order!');
        // Update request status in DB to completed
        await updateStatus(convertingRequest.id, 'completed');
        setModalOpen(false);
        setConvertingRequest(null);
      } else {
        toast.error(result.message || 'Failed to convert request to order');
      }
    } catch (error) {
      toast.error('Network error during conversion');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_custom_mix_requests.php`);
      const data = await response.json();
      if (data.success) {
        setRequests(data.data);
      } else {
        toast.error('Failed to fetch requests');
      }
    } catch (error) {
      toast.error('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/update_custom_mix_request.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Status updated to ${status}`);
        setRequests(prev => prev.map(req => req.id === id ? { ...req, status } : req));
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'contacted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-primary animate-pulse font-bold text-lg">Loading Requests...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Custom Mix Requests</h2>
          <p className="text-muted-foreground">Manage customer requests for custom multigrain proportions.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {requests.length === 0 ? (
          <div className="text-center p-8 bg-muted/20 rounded-xl border-2 border-dashed border-border text-muted-foreground font-semibold">
            No custom mix requests found.
          </div>
        ) : (
          requests.map(request => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer bg-white hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full flex items-center justify-center w-10 h-10 ${getStatusColor(request.status).replace('border-', '')}`}>
                       {request.status === 'pending' ? <Clock className="w-5 h-5" /> : request.status === 'completed' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">
                        {request.customer_name} <span className="text-sm font-normal text-slate-500">({request.customer_phone})</span>
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                        <span className="font-semibold text-primary">{request.product_name}</span>
                        <span>•</span>
                        <span>{new Date(request.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(request.status)} uppercase tracking-wider`}>
                      {request.status}
                    </span>
                    {expandedId === request.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === request.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t bg-slate-50/50"
                    >
                      <div className="p-4 grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="font-semibold text-slate-700 flex items-center gap-2 border-b pb-2">
                            <MessageSquare className="w-4 h-4 text-primary" /> Request Details
                          </h4>
                          
                          {request.custom_items && (
                            <div className="bg-white p-3 rounded-lg border shadow-sm">
                              <p className="text-xs font-bold text-slate-500 uppercase mb-1">Customer Message</p>
                              <p className="text-slate-800 text-sm whitespace-pre-wrap">{request.custom_items}</p>
                            </div>
                          )}

                          {request.selected_items && request.selected_items.length > 0 && (
                            <div className="bg-white p-3 rounded-lg border shadow-sm">
                              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Base Ingredients Selected</p>
                              <div className="space-y-2">
                                {request.selected_items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-sm border-b border-slate-100 last:border-0 pb-1 last:pb-0">
                                    <span className="font-medium text-slate-700">{item.item_name}</span>
                                    <span className="text-slate-500">Ratio: <span className="font-bold text-primary">{item.ratio}</span></span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <h4 className="font-semibold text-slate-700 flex items-center gap-2 border-b pb-2">
                            <User className="w-4 h-4 text-primary" /> Contact Actions
                          </h4>
                          
                          <div className="flex items-center gap-2">
                            <Button variant="outline" className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 border-green-200" onClick={() => window.open(`https://wa.me/${request.customer_phone.replace(/[^0-9]/g, '')}`, '_blank')}>
                              <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp
                            </Button>
                            <Button variant="outline" className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" onClick={() => window.open(`tel:${request.customer_phone}`, '_self')}>
                              <Phone className="w-4 h-4 mr-2" /> Call
                            </Button>
                          </div>

                          <div className="bg-white p-4 rounded-lg border shadow-sm space-y-3">
                            <p className="text-xs font-bold text-slate-500 uppercase">Update Status</p>
                            <Select value={request.status} onValueChange={(val) => updateStatus(request.id, val)}>
                              <SelectTrigger className="w-full font-semibold">
                                <SelectValue placeholder="Select Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending" className="font-semibold text-yellow-600">Pending</SelectItem>
                                <SelectItem value="contacted" className="font-semibold text-blue-600">Contacted</SelectItem>
                                <SelectItem value="completed" className="font-semibold text-green-600">Completed</SelectItem>
                                <SelectItem value="cancelled" className="font-semibold text-red-600">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>

                            <div className="pt-2 border-t border-slate-100">
                              <Button 
                                className="w-full bg-primary hover:bg-primary/95 text-white font-extrabold h-9 shadow-md flex items-center justify-center gap-1.5 rounded-lg text-xs"
                                onClick={() => handleOpenConvertModal(request)}
                              >
                                <Check className="w-4.5 h-4.5" /> Convert to Active Order
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Dialog for converting request to manual order */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md w-full rounded-2xl bg-white border border-primary/20 p-5 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-primary/10 pb-3">
            <DialogTitle className="text-lg font-black text-primary uppercase tracking-wider flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 animate-pulse" /> Convert to Active Order
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-normal">
              Customer ke sath finalize ki gayi ratios adjust karein aur is request ko directly active scheduled order me convert karein.
            </DialogDescription>
          </DialogHeader>

          {convertingRequest && (
            <div className="space-y-4 py-3">
              {/* Customer Details */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Customer Name</span>
                  <p className="text-sm font-bold text-slate-700">{convertingRequest.customer_name}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Phone</span>
                  <p className="text-sm font-bold text-slate-700">{convertingRequest.customer_phone}</p>
                </div>
              </div>

              {/* Mix Ingredient Ratio Renders */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-600 block border-b pb-1">Adjust Custom Proportions:</span>
                {ratios.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-primary/10 shadow-sm gap-2">
                    <div className="flex flex-col min-w-0 text-left items-start flex-1">
                       <span className="text-xs font-bold text-slate-900 truncate leading-tight">{item.item_name}</span>
                       <span className="text-[10px] text-slate-500 mt-1 leading-none font-medium">Rs. {item.price_per_kg}/kg</span>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center border border-primary/20 rounded-lg overflow-hidden bg-white shadow-sm h-7">
                         <button 
                           type="button"
                           className="w-7 h-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors select-none" 
                           onClick={() => {
                             const newVal = Math.max(0, item.ratio - 0.1).toFixed(1);
                             handleRatioChange(idx, parseFloat(newVal));
                           }}
                         >
                           -
                         </button>
                         <span className="w-9 text-center text-xs font-black text-slate-800 select-none">
                           {item.ratio.toFixed(1)}
                         </span>
                         <button 
                           type="button"
                           className="w-7 h-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors select-none" 
                           onClick={() => {
                             const newVal = (item.ratio + 0.1).toFixed(1);
                             handleRatioChange(idx, parseFloat(newVal));
                           }}
                         >
                           +
                         </button>
                      </div>

                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-red-200"
                        onClick={() => setRatios(prev => prev.filter((_, rIdx) => rIdx !== idx))}
                        title="Remove Ingredient"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {showAddForm ? (
                  <div className="p-3.5 rounded-xl bg-[#fcfaf7] border border-primary/20 space-y-3 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <span className="text-[10px] font-bold text-primary uppercase block tracking-wider">Add Custom Ingredient</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold text-slate-500 uppercase">Ingredient Name</Label>
                        <Input 
                          type="text" 
                          placeholder="e.g. Jau (Barley)" 
                          className="text-xs h-8 bg-white rounded-lg focus:ring-primary focus:border-primary"
                          value={newIngredientName}
                          onChange={e => setNewIngredientName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold text-slate-500 uppercase">Price per kg</Label>
                        <Input 
                          type="number" 
                          placeholder="Rs." 
                          className="text-xs h-8 bg-white rounded-lg focus:ring-primary focus:border-primary"
                          value={newIngredientPrice}
                          onChange={e => setNewIngredientPrice(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <Button 
                        type="button"
                        variant="ghost" 
                        className="text-xs h-7 px-3 text-slate-500 rounded-lg" 
                        onClick={() => {
                          setShowAddForm(false);
                          setNewIngredientName('');
                          setNewIngredientPrice('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="button"
                        className="text-xs h-7 px-4 bg-primary text-white font-extrabold rounded-lg shadow-sm hover:bg-primary/90" 
                        onClick={handleAddNewIngredient}
                      >
                        Add to Mix
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-xs border-dashed border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 h-8.5 mt-1.5 rounded-xl font-extrabold flex items-center justify-center gap-1.5 transition-all"
                    onClick={() => setShowAddForm(true)}
                  >
                    + Add Custom Ingredient
                  </Button>
                )}
              </div>

              {/* Dynamic Price Calculation display */}
              <div className="bg-[#fcfaf7] border border-primary/20 rounded-xl p-3 flex justify-between items-center shadow-inner">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Avg Price / kg</span>
                  <p className="text-base font-black text-primary">Rs. {Math.round(getCalculatedPrice())}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Total Order Value</span>
                  <p className="text-base font-black text-slate-800">Rs. {Math.round(getCalculatedPrice() * orderQuantity)}</p>
                </div>
              </div>

              {/* Order form fields */}
              <div className="space-y-3 pt-1">
                <div>
                  <Label className="text-xs font-extrabold text-slate-600 mb-1 block">Total Quantity (kg):</Label>
                  <Input 
                    type="number" 
                    min="1"
                    className="w-full text-xs h-9 rounded-xl focus:ring-primary focus:border-primary shadow-sm"
                    value={orderQuantity} 
                    onChange={e => setOrderQuantity(Math.max(1, parseFloat(e.target.value) || 1))} 
                  />
                </div>

                <div>
                  <Label className="text-xs font-extrabold text-slate-600 mb-1 block">Delivery/Shipping Address:</Label>
                  <Input 
                    type="text" 
                    className="w-full text-xs h-9 rounded-xl focus:ring-primary focus:border-primary shadow-sm"
                    value={orderAddress} 
                    onChange={e => setOrderAddress(e.target.value)} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-extrabold text-slate-600 mb-1 block">Payment Status:</Label>
                    <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                      <SelectTrigger className="w-full text-xs font-bold rounded-xl h-9">
                        <SelectValue placeholder="Payment Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending" className="text-xs font-bold text-yellow-600">Pending</SelectItem>
                        <SelectItem value="paid" className="text-xs font-bold text-green-600">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-extrabold text-slate-600 mb-1 block">Payment Method:</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="w-full text-xs font-bold rounded-xl h-9">
                        <SelectValue placeholder="Payment Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash" className="text-xs font-bold">Cash/COD</SelectItem>
                        <SelectItem value="jazzcash" className="text-xs font-bold">JazzCash</SelectItem>
                        <SelectItem value="easypaisa" className="text-xs font-bold">EasyPaisa</SelectItem>
                        <SelectItem value="bank" className="text-xs font-bold">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-primary/10 pt-3 flex gap-2">
            <Button variant="outline" className="flex-1 text-xs font-bold rounded-xl h-9 border-primary/20" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="flex-1 text-xs font-bold rounded-xl h-9 bg-primary hover:bg-primary/90 text-white shadow-md flex items-center justify-center gap-1.5"
              onClick={handleConvertSubmit}
              disabled={isSubmittingOrder}
            >
              {isSubmittingOrder ? 'Converting...' : 'Confirm & Create Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
