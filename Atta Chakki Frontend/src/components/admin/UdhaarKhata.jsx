import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Search, Phone, ChevronRight, History, CheckCircle, Wallet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';

export function UdhaarKhata() {
  const [ledgers, setLedgers] = useState([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadLedgers();
  }, []);

  // --- FETCH FROM API ---
  const loadLedgers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/get_udhaar_ledger.php`);
      const data = await response.json();

      if (data.success) {
        setLedgers(data.ledgers || []);
        setTotalOutstanding(data.totalOutstanding || 0);
      } else {
        toast.error(data.message || 'Failed to load ledger');
      }
    } catch (error) {
      console.error("Network Error:", error);
      toast.error("Network error: Could not connect to database");
    } finally {
      setLoading(false);
    }
  };

  // --- SETTLE PAYMENT VIA API ---
  const handleReceivePayment = async () => {
    if (!selectedCustomer || !paymentAmount) return;

    const amountReceived = parseFloat(paymentAmount);
    if (isNaN(amountReceived) || amountReceived <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const customerDebt = parseFloat(selectedCustomer.totalDebt) || 0;
    if (amountReceived > customerDebt) {
      toast.error(`Amount exceeds total debt of Rs. ${customerDebt.toLocaleString()}`);
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/record_udhaar_payment.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selectedCustomer.phone,
          amount: amountReceived
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || `Payment of Rs. ${amountReceived} recorded successfully`);
        setShowPaymentDialog(false);
        setPaymentAmount('');
        setSelectedCustomer(null);
        loadLedgers(); // Reload fresh data from DB
      } else {
        toast.error(result.message || 'Failed to record payment');
      }
    } catch (error) {
      console.error("Payment Error:", error);
      toast.error('Network error while recording payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredLedgers = ledgers.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.phone.includes(searchTerm)
  );

  if (loading && ledgers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading Udhaar Ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-foreground mb-2">Udhaar Khata</h1>
          <p className="text-muted-foreground">Customer Ledger & Outstanding Payments</p>
        </div>
        <Card className="px-4 py-2 bg-red-50 border-red-200 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-red-600 font-medium">Total Outstanding</p>
            <p className="text-xl font-bold text-red-700">Rs. {totalOutstanding.toLocaleString()}</p>
          </div>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Pending Orders</TableHead>
              <TableHead>Last Order</TableHead>
              <TableHead>Total Debt</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLedgers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  {searchTerm ? "No customers found matching your search." : "No outstanding debts! Good job."}
                </TableCell>
              </TableRow>
            ) : (
              filteredLedgers.map((customer) => (
                <TableRow key={customer.phone}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      {customer.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {customer.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{customer.orderCount} Orders</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(customer.lastOrderDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <span className="text-red-600 font-bold">Rs. {customer.totalDebt.toLocaleString()}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      View & Settle <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Detail & Settle Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={(open) => { 
        if(!open) {
          setSelectedCustomer(null);
          setPaymentAmount('');
        }
      }}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedCustomer?.name}'s Ledger</span>
              <span className="text-red-600 font-bold mr-6">Total Due: Rs. {parseFloat(selectedCustomer?.totalDebt || 0).toLocaleString()}</span>
            </DialogTitle>
            <DialogDescription>
              Phone: {selectedCustomer?.phone}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {/* Payment Action */}
            <div className="bg-secondary/30 p-4 rounded-lg border border-border flex items-end gap-4">
              <div className="flex-1">
                <Label htmlFor="payAmount">Receive Payment</Label>
                <Input 
                  id="payAmount" 
                  type="number" 
                  placeholder="Enter amount to settle..." 
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="mt-1.5"
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This will automatically pay off oldest orders first (FIFO).
                </p>
              </div>
              <Button 
                onClick={() => setShowPaymentDialog(true)} 
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || isProcessing}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Settle Amount
              </Button>
            </div>

            {/* Order History Table */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <History className="h-4 w-4" /> Outstanding Orders History
              </h4>
              <div className="border rounded-md max-h-[40vh] overflow-auto">
                <Table className="min-w-[600px]">
                  <TableHeader className="sticky top-0 z-10 bg-background border-b">
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>Date</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Order Total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCustomer?.orders?.map(order => (
                      <TableRow key={order.order_id}>
                        <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="font-mono text-xs">#{order.order_id}</TableCell>
                        <TableCell>Rs. {order.total?.toLocaleString()}</TableCell>
                        <TableCell className="text-green-600">Rs. {(order.amount_paid || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-red-600 font-bold">Rs. {(order.outstanding || order.total)?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={order.payment_status === 'pending' ? 'destructive' : 'secondary'}
                            className="capitalize"
                          >
                            {order.payment_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedCustomer(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              Are you sure you want to receive <strong>Rs. {paymentAmount}</strong> from <strong>{selectedCustomer?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} disabled={isProcessing}>Cancel</Button>
            <Button onClick={handleReceivePayment} className="bg-green-600 hover:bg-green-700" disabled={isProcessing}>
              {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {isProcessing ? 'Processing...' : 'Confirm & Update Ledger'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default UdhaarKhata;
