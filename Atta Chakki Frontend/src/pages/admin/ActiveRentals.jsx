import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/common/card';
import { Button } from '../../components/common/button';
import { Badge } from '../../components/common/badge';
import { Input } from '../../components/common/input';
import { Label } from '../../components/common/label';
import { Textarea } from '../../components/common/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/common/dialog';
import {
  RotateCcw, Loader2, Clock, User, Phone, MapPin, Package,
  CalendarClock, AlertTriangle, CheckCircle, Shield, Banknote,
  MessageCircle, Calendar, ArrowDownCircle, RefreshCw, TrendingUp,
  Printer
} from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';
import { PrintOrderDetails } from './PrintOrderDetails';
import { downloadBillPDF } from '../../utils/billPdfUtils';

export function ActiveRentals() {
  const [rentals, setRentals] = useState([]);
  const [summary, setSummary] = useState({ total_active: 0, total_overdue: 0, total_deposits_held: 0 });
  const [loading, setLoading] = useState(true);
  const [returnModal, setReturnModal] = useState(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [isReturning, setIsReturning] = useState(false);
  const [viewHistory, setViewHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [printOrder, setPrintOrder] = useState(null);

  const mapRentalToOrder = (rental) => {
    const isOverdue = rental.status === 'overdue';
    const overdueDays = getOverdueDays(rental);
    const runningPenalty = isOverdue ? overdueDays * parseFloat(rental.late_penalty_per_day || 0) : 0;
    
    const totalAmount = parseFloat(rental.total_rental_amount || 0) + parseFloat(rental.security_deposit || 0) + runningPenalty;

    return {
      id: `RENTAL-${rental.id}`,
      createdAt: rental.created_at || rental.rental_start_date,
      customerName: rental.customer_name,
      phone: rental.customer_phone,
      deliveryAddress: rental.customer_address,
      paymentMethod: rental.payment_method || 'cash',
      paymentStatus: (parseFloat(rental.amount_paid || 0) >= totalAmount) ? 'paid' : (parseFloat(rental.amount_paid || 0) > 0 ? 'partial' : 'unpaid'),
      total: totalAmount,
      advancePayment: parseFloat(rental.amount_paid || 0),
      status: rental.status === 'overdue' ? 'ready' : (rental.status === 'returned' ? 'completed' : 'processing'),
      items: [
        {
          name: rental.product_name,
          isRental: true,
          quantity: rental.quantity || 1,
          rental_days: rental.rental_days,
          rental_price_per_day: rental.rental_price_per_day,
          security_deposit: rental.security_deposit,
          runningPenalty: runningPenalty,
          rental_start_date: rental.rental_start_date,
          rental_end_date: rental.rental_end_date,
          price_at_purchase: rental.rental_price_per_day,
          unit: 'unit'
        }
      ]
    };
  };

  const handlePrintSlip = (rental) => {
    const orderObj = mapRentalToOrder(rental);
    setPrintOrder(orderObj);
  };

  const handlePdfAndWhatsApp = async (rental) => {
    try {
      const orderObj = mapRentalToOrder(rental);
      await downloadBillPDF(orderObj);
      toast.success('PDF bill downloaded!');
      generateWhatsAppReminder(rental);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    }
  };

  const loadRentals = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_active_rentals.php`);
      const data = await response.json();
      if (data.success && data.data) {
        setRentals(data.data.rentals || []);
        if (data.data.summary) setSummary(data.data.summary);
      }
    } catch (error) {
      console.error('Error loading rentals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`${API_BASE_URL}/get_rental_history.php`);
      const data = await response.json();
      if (data.success && data.data) {
        setHistory(data.data.rentals || []);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadRentals();
    const interval = setInterval(loadRentals, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleReturn = async () => {
    if (!returnModal) return;
    setIsReturning(true);
    try {
      const response = await fetch(`${API_BASE_URL}/return_rental.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rental_id: returnModal.id,
          condition_notes: returnNotes,
          actual_return_date: new Date().toISOString().slice(0, 10)
        })
      });
      const result = await response.json();
      if (result.success) {
        toast.success(`✅ Item returned successfully! Deposit refund: Rs. ${result.deposit_refund_amount || 0}`);
        setReturnModal(null);
        setReturnNotes('');
        loadRentals();
      } else {
        toast.error(result.message || 'Failed to process return');
      }
    } catch (error) {
      toast.error('Network error while processing return');
    } finally {
      setIsReturning(false);
    }
  };

  const generateWhatsAppReminder = (rental) => {
    let phone = (rental.customer_phone || '').replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '92' + phone.substring(1);
    else if (!phone.startsWith('92')) phone = '92' + phone;

    const isOverdue = rental.status === 'overdue';
    const overdueDays = getOverdueDays(rental);
    const runningPenalty = isOverdue ? overdueDays * parseFloat(rental.late_penalty_per_day || 0) : 0;
    const remainingBalance = parseFloat(rental.total_rental_amount || 0) + parseFloat(rental.security_deposit || 0) - parseFloat(rental.amount_paid || 0);

    const title = isOverdue 
      ? `🚨 *RENTAL OVERDUE NOTICE* 🚨\n⚠️ *YOUR RENTAL IS OVERDUE BY ${overdueDays} DAY${overdueDays !== 1 ? 'S' : ''}!*`
      : `⏰ *RENTAL RETURN REMINDER* ⏰`;

    const statusSection = isOverdue
      ? `• Overdue Days: ${overdueDays} day(s)\n• Running Penalty: Rs. ${parseInt(runningPenalty).toLocaleString()}`
      : `• Days Remaining: ${getDaysRemaining(rental)} day(s)`;

    const message = `*APNI CHAKKI* 🌾
───────────────────────────
Hello *${rental.customer_name}*! 👋

${title}

Your rental of *${rental.product_name}* is due for return on *${new Date(rental.rental_end_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}*.

📋 *Rental Details:*
• Item: ${rental.product_name}
• Quantity: ${rental.quantity || 1}
• Rental ID: #${rental.id}
• Start Date: ${new Date(rental.rental_start_date).toLocaleDateString()}
• End Date: ${new Date(rental.rental_end_date).toLocaleDateString()}
${statusSection}
📍 *Delivery/Pickup Address:* ${rental.customer_address || 'Provided Address'}

💰 *PRICING BREAKDOWN:*
• Rental Rate: Rs. ${parseInt(rental.rental_price_per_day).toLocaleString()}/day
• Total Rental (${rental.rental_days} days): Rs. ${parseInt(rental.total_rental_amount || 0).toLocaleString()}
• Security Deposit: Rs. ${parseInt(rental.security_deposit || 0).toLocaleString()}
• Advance Paid: Rs. ${parseInt(rental.amount_paid || 0).toLocaleString()}
• Remaining Dues: Rs. ${parseInt(remainingBalance).toLocaleString()}
${isOverdue ? `• Total Amount Payable (with penalty): Rs. ${parseInt(remainingBalance + runningPenalty).toLocaleString()}` : ''}

⚠️ Late return penalty: Rs. ${parseInt(rental.late_penalty_per_day).toLocaleString()}/day

Please return the item promptly or contact us to extend your rental.

Thank you! 🙏
Apni Chakki - Fresh Flour Daily`.trim();

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  const getOverdueDays = (rental) => {
    if (rental.overdue_days) return parseInt(rental.overdue_days);
    const today = new Date();
    const endDate = new Date(rental.rental_end_date);
    const diff = Math.floor((today - endDate) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const getDaysRemaining = (rental) => {
    if (rental.days_remaining) return parseInt(rental.days_remaining);
    const today = new Date();
    const endDate = new Date(rental.rental_end_date);
    const diff = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  if (loading && rentals.length === 0) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" />
        <p className="text-muted-foreground mt-2">Loading Active Rentals...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RotateCcw className="h-7 w-7 text-teal-500" />
            Active Rentals
          </h1>
          <p className="text-muted-foreground">{rentals.length} rental(s) currently active</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => { setViewHistory(!viewHistory); if (!viewHistory) loadHistory(); }}
            className="border-teal-200 text-teal-700 hover:bg-teal-50"
          >
            <Clock className="h-4 w-4 mr-2" />
            {viewHistory ? 'Hide History' : 'View History'}
          </Button>
          <Button
            onClick={loadRentals}
            variant="outline"
            size="icon"
            className="border-teal-200 text-teal-700 hover:bg-teal-50"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
          <CardContent className="py-4 text-center">
            <Package className="h-6 w-6 text-teal-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-teal-800">{summary.total_active || 0}</p>
            <p className="text-xs text-teal-600 font-medium">Active Rentals</p>
          </CardContent>
        </Card>
        <Card className={`bg-gradient-to-br border-red-200 ${summary.total_overdue > 0 ? 'from-red-50 to-rose-50 animate-pulse' : 'from-slate-50 to-gray-50 border-slate-200'}`}>
          <CardContent className="py-4 text-center">
            <AlertTriangle className={`h-6 w-6 mx-auto mb-1 ${summary.total_overdue > 0 ? 'text-red-600' : 'text-slate-400'}`} />
            <p className={`text-2xl font-bold ${summary.total_overdue > 0 ? 'text-red-800' : 'text-slate-500'}`}>{summary.total_overdue || 0}</p>
            <p className={`text-xs font-medium ${summary.total_overdue > 0 ? 'text-red-600' : 'text-slate-400'}`}>Overdue Items</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
          <CardContent className="py-4 text-center">
            <Shield className="h-6 w-6 text-amber-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-amber-800">Rs. {parseInt(summary.total_deposits_held || 0).toLocaleString()}</p>
            <p className="text-xs text-amber-600 font-medium">Deposits Held</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Rentals List */}
      {rentals.length === 0 ? (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-background p-4 mb-4">
              <RotateCcw className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No Active Rentals</h3>
            <p className="text-muted-foreground">When items are rented out, they will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {rentals.map((rental) => {
            const isOverdue = rental.status === 'overdue';
            const overdueDays = getOverdueDays(rental);
            const daysRemaining = getDaysRemaining(rental);
            const runningPenalty = isOverdue ? overdueDays * parseFloat(rental.late_penalty_per_day || 0) : 0;

            return (
              <Card
                key={rental.id}
                className={`border-l-[6px] shadow-lg hover:shadow-xl transition-all rounded-xl bg-white ${
                  isOverdue ? 'border-l-red-500 animate-pulse' : 'border-l-teal-500'
                }`}
              >
                {/* Header */}
                <div className={`p-5 pb-3 rounded-t-xl ${isOverdue ? 'bg-red-50/50' : 'bg-teal-50/30'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2 flex-wrap">
                        Rental #{rental.id}
                        <Badge className={`text-[10px] px-2 py-0.5 font-bold uppercase ${
                          isOverdue
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : 'bg-teal-100 text-teal-800 border-teal-300'
                        }`}>
                          {isOverdue ? '⚠️ OVERDUE' : '✅ Active'}
                        </Badge>
                      </h3>
                      <p className="text-sm font-semibold text-slate-700 mt-1">{rental.product_name}</p>
                      {rental.quantity > 1 && (
                        <span className="text-xs text-muted-foreground">Qty: {rental.quantity}</span>
                      )}
                    </div>
                    <div className="text-right">
                      {isOverdue ? (
                        <div className="bg-red-100 px-3 py-2 rounded-lg border border-red-200">
                          <p className="text-xl font-black text-red-700">{overdueDays} day{overdueDays !== 1 ? 's' : ''}</p>
                          <p className="text-[10px] font-bold text-red-600 uppercase">Overdue</p>
                          {runningPenalty > 0 && (
                            <p className="text-xs font-bold text-red-800 mt-1">Penalty: Rs. {parseInt(runningPenalty).toLocaleString()}</p>
                          )}
                        </div>
                      ) : (
                        <div className="bg-teal-50 px-3 py-2 rounded-lg border border-teal-200">
                          <p className="text-xl font-black text-teal-700">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</p>
                          <p className="text-[10px] font-bold text-teal-600 uppercase">Remaining</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <CardContent className="space-y-4 pt-4">
                  {/* Rental Details Grid */}
                  <div className={`p-3 rounded-lg border ${isOverdue ? 'bg-red-50/50 border-red-200' : 'bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200'}`}>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className={`flex items-center justify-center gap-1 mb-0.5 ${isOverdue ? 'text-red-600' : 'text-teal-600'}`}>
                          <Calendar className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-semibold uppercase">Start</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800">{new Date(rental.rental_start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                      </div>
                      <div className="border-x border-teal-200">
                        <div className={`flex items-center justify-center gap-1 mb-0.5 ${isOverdue ? 'text-red-600' : 'text-teal-600'}`}>
                          <CalendarClock className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-semibold uppercase">Due</span>
                        </div>
                        <p className={`text-sm font-bold ${isOverdue ? 'text-red-700' : 'text-slate-800'}`}>{new Date(rental.rental_end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                      </div>
                      <div>
                        <div className={`flex items-center justify-center gap-1 mb-0.5 ${isOverdue ? 'text-red-600' : 'text-teal-600'}`}>
                          <Banknote className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-semibold uppercase">Deposit</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800">Rs. {parseInt(rental.security_deposit || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="bg-muted/30 p-3 rounded-md space-y-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{rental.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{rental.customer_phone}</span>
                    </div>
                    {rental.customer_address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{rental.customer_address}</span>
                      </div>
                    )}
                  </div>

                  {/* Pricing Summary */}
                  <div className="text-xs space-y-1 p-2 bg-slate-50 rounded-md">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rental ({rental.rental_days} days × Rs. {parseInt(rental.rental_price_per_day).toLocaleString()})</span>
                      <span className="font-bold">Rs. {parseInt(rental.total_rental_amount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Security Deposit</span>
                      <span className="font-bold">Rs. {parseInt(rental.security_deposit || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount Paid</span>
                      <span className="font-bold text-green-700">Rs. {parseInt(rental.amount_paid || 0).toLocaleString()}</span>
                    </div>
                    {runningPenalty > 0 && (
                      <div className="flex justify-between text-red-600 font-bold border-t pt-1 mt-1">
                        <span>Running Penalty ({overdueDays} days × Rs. {parseInt(rental.late_penalty_per_day).toLocaleString()})</span>
                        <span>Rs. {parseInt(runningPenalty).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                    <Button
                      className={`font-medium shadow-md ${isOverdue ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'}`}
                      onClick={() => setReturnModal(rental)}
                    >
                      <ArrowDownCircle className="h-4 w-4 mr-2" />
                      Process Return
                    </Button>
                    <Button
                      variant="outline"
                      className="border-blue-200 text-blue-700 hover:bg-blue-50 font-medium"
                      onClick={() => handlePrintSlip(rental)}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print Slip
                    </Button>
                    <Button
                      variant="outline"
                      className="border-green-200 text-green-700 hover:bg-green-50 font-medium"
                      onClick={() => handlePdfAndWhatsApp(rental)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      PDF & WhatsApp
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* History Section */}
      {viewHistory && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-3 px-1">
            <div className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-full text-sm font-bold shadow-sm border border-slate-200">
              <Clock className="h-4 w-4 text-slate-500" />
              Rental History
            </div>
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-500 font-semibold">{history.length} record(s)</span>
          </div>

          {loadingHistory ? (
            <div className="text-center py-8"><Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-400" /></div>
          ) : history.length === 0 ? (
            <Card className="bg-slate-50/50 border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-slate-500 text-sm font-semibold">No rental history found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {history.map((h) => (
                <Card key={h.id} className={`border-l-4 ${
                  h.status === 'returned' ? 'border-l-green-400' :
                  h.status === 'active' ? 'border-l-teal-400' :
                  h.status === 'overdue' ? 'border-l-red-400' :
                  'border-l-slate-300'
                }`}>
                  <CardContent className="py-3 px-4">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div>
                        <p className="font-bold text-sm">{h.product_name} — #{h.id}</p>
                        <p className="text-xs text-muted-foreground">{h.customer_name} • {h.customer_phone}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(h.rental_start_date).toLocaleDateString()} → {new Date(h.rental_end_date).toLocaleDateString()}
                          {h.actual_return_date && ` (Returned: ${new Date(h.actual_return_date).toLocaleDateString()})`}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={`text-[10px] px-2 py-0.5 font-bold uppercase ${
                          h.status === 'returned' ? 'bg-green-100 text-green-800 border-green-300' :
                          h.status === 'active' ? 'bg-teal-100 text-teal-800 border-teal-300' :
                          h.status === 'overdue' ? 'bg-red-100 text-red-800 border-red-300' :
                          'bg-slate-100 text-slate-600 border-slate-300'
                        }`}>
                          {h.status === 'returned' ? '✅ Returned' :
                           h.status === 'active' ? '🟢 Active' :
                           h.status === 'overdue' ? '🔴 Overdue' :
                           h.status}
                        </Badge>
                        <p className="text-xs font-semibold text-slate-600 mt-1">Rs. {parseInt(h.total_rental_amount || 0).toLocaleString()}</p>
                        {parseFloat(h.late_penalty_total || 0) > 0 && (
                          <p className="text-xs text-red-600 font-bold">Penalty: Rs. {parseInt(h.late_penalty_total).toLocaleString()}</p>
                        )}
                        {h.deposit_status && h.deposit_status !== 'held' && (
                          <p className="text-[10px] text-muted-foreground capitalize">Deposit: {h.deposit_status}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Return Processing Dialog */}
      <Dialog open={!!returnModal} onOpenChange={() => { setReturnModal(null); setReturnNotes(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-teal-600" />
              Process Return — #{returnModal?.id}
            </DialogTitle>
            <DialogDescription>
              Returning <strong>{returnModal?.product_name}</strong> from {returnModal?.customer_name}
            </DialogDescription>
          </DialogHeader>

          {returnModal && (() => {
            const overdueDays = getOverdueDays(returnModal);
            const penalty = overdueDays * parseFloat(returnModal.late_penalty_per_day || 0);
            const refund = Math.max(0, parseFloat(returnModal.security_deposit || 0) - penalty);

            return (
              <div className="space-y-4 py-2">
                {/* Return Summary */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Return Date</span>
                    <span className="font-bold">{new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Rental End Date</span>
                    <span className="font-bold">{new Date(returnModal.rental_end_date).toLocaleDateString()}</span>
                  </div>
                  {overdueDays > 0 && (
                    <div className="flex justify-between py-1 border-b text-red-600">
                      <span className="font-medium">Late Days</span>
                      <span className="font-bold">{overdueDays} day{overdueDays !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {penalty > 0 && (
                    <div className="flex justify-between py-1 border-b text-red-600">
                      <span className="font-medium">Late Penalty ({overdueDays} × Rs. {parseInt(returnModal.late_penalty_per_day).toLocaleString()})</span>
                      <span className="font-bold">Rs. {parseInt(penalty).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Security Deposit</span>
                    <span className="font-bold">Rs. {parseInt(returnModal.security_deposit || 0).toLocaleString()}</span>
                  </div>
                  <div className={`flex justify-between py-2 rounded-md px-2 ${refund > 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    <span className="font-bold">Deposit Refund</span>
                    <span className="font-black text-lg">Rs. {parseInt(refund).toLocaleString()}</span>
                  </div>
                </div>

                {overdueDays > 0 && (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <p>
                      <strong>Note:</strong> Item is <strong>{overdueDays} day{overdueDays !== 1 ? 's' : ''} overdue</strong>.
                      Penalty of Rs. {parseInt(penalty).toLocaleString()} will be deducted from the security deposit.
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-xs font-semibold text-slate-600">Condition Notes (Optional)</Label>
                  <Textarea
                    placeholder="e.g., Item returned in good condition, minor wear..."
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </div>
            );
          })()}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setReturnModal(null); setReturnNotes(''); }} disabled={isReturning}>
              Cancel
            </Button>
            <Button
              onClick={handleReturn}
              disabled={isReturning}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isReturning ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                <><CheckCircle className="h-4 w-4 mr-2" /> Confirm Return</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {printOrder && (
        <PrintOrderDetails
          order={printOrder}
          open={!!printOrder}
          onClose={() => setPrintOrder(null)}
        />
      )}
    </div>
  );
}
