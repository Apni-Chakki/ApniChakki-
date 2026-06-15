import { useState, useEffect } from 'react';
import { Card } from '../../components/common/card';
import { Button } from '../../components/common/button';
import { Input } from '../../components/common/input';
import { Label } from '../../components/common/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/common/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/common/dialog';
import { Badge } from '../../components/common/badge';
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">Udhaar Khata</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Customer Ledger &amp; Outstanding Payments</p>
        </div>
        <Card className="px-3 sm:px-4 py-2 bg-red-50 border-red-200 flex items-center gap-3 w-full md:w-auto">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <Wallet className="h-5 w-5 text-red-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-red-600 font-medium">Total Outstanding</p>
            <p className="text-lg sm:text-xl font-bold text-red-700 break-all">Rs. {totalOutstanding.toLocaleString()}</p>
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

      {/* Mobile: card list (below md) */}
      <div className="md:hidden space-y-3">
        {filteredLedgers.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            {searchTerm ? "No customers found matching your search." : "No outstanding debts! Good job."}
          </Card>
        ) : (
          filteredLedgers.map((customer) => (
            <Card key={customer.phone} className="p-3 space-y-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm break-words">{customer.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 break-all">
                    <Phone className="h-3 w-3 shrink-0" />
                    {customer.phone}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Pending</p>
                  <p className="text-sm font-semibold">{customer.orderCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Last Order</p>
                  <p className="text-xs font-medium">{new Date(customer.lastOrderDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Total Debt</p>
                  <p className="text-sm font-bold text-red-600 break-all">Rs. {customer.totalDebt.toLocaleString()}</p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setSelectedCustomer(customer)}
              >
                View &amp; Settle <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Card>
          ))
        )}
      </div>

      {/* Desktop: table (md and up) */}
      <Card className="hidden md:block overflow-hidden">
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
                      View &amp; Settle <ChevronRight className="h-4 w-4 ml-1" />
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
        <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-lg w-full flex flex-col" style={{ maxHeight: '90vh', overflow: 'hidden' }}>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-base sm:text-lg pr-6 break-words">{selectedCustomer?.name}'s Ledger</DialogTitle>
            <DialogDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
              <span className="text-xs sm:text-sm break-all">Phone: {selectedCustomer?.phone}</span>
              <span className="text-red-600 font-bold text-xs sm:text-sm break-all">Due: Rs. {parseFloat(selectedCustomer?.totalDebt || 0).toLocaleString()}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
            {/* Payment Action — input and Settle each on their own row */}
            <div className="bg-secondary/30 p-3 rounded-lg border border-border space-y-2">
              <Label htmlFor="payAmount" className="text-sm font-semibold">Receive Payment</Label>
              <Input
                id="payAmount"
                type="number"
                placeholder="Enter amount..."
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full"
                disabled={isProcessing}
              />
              <Button
                onClick={() => setShowPaymentDialog(true)}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || isProcessing}
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-1.5 text-white" />
                Settle
              </Button>
              <p className="text-xs text-muted-foreground">
                This will automatically pay off oldest orders first (FIFO).
              </p>
            </div>

            {/* Order History */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                <History className="h-4 w-4" /> Outstanding Orders History
              </h4>

              {/* Mobile: card list */}
              <div className="sm:hidden space-y-2">
                {selectedCustomer?.orders?.map(order => (
                  <div key={order.order_id} className="border rounded-md p-3 bg-background space-y-2">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
                      <span className="font-mono text-sm font-bold">#{order.order_id}</span>
                      <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                        <p className="text-xs font-semibold break-all">Rs. {order.total?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Paid</p>
                        <p className="text-xs font-semibold text-green-600 break-all">Rs. {(order.amount_paid || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Due</p>
                        <p className="text-xs font-bold text-red-600 break-all">Rs. {(order.outstanding || order.total)?.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Badge
                        variant={order.payment_status === 'pending' ? 'destructive' : 'secondary'}
                        className="capitalize text-[10px] px-2 py-0.5"
                      >
                        {order.payment_status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden sm:block border rounded-md overflow-x-auto" style={{ maxHeight: 'calc(85vh - 280px)', overflowY: 'auto' }}>
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background border-b">
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="px-3 py-2 text-xs">Date</TableHead>
                      <TableHead className="px-3 py-2 text-xs">#ID</TableHead>
                      <TableHead className="px-3 py-2 text-xs">Total</TableHead>
                      <TableHead className="px-3 py-2 text-xs">Paid</TableHead>
                      <TableHead className="px-3 py-2 text-xs">Due</TableHead>
                      <TableHead className="px-3 py-2 text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCustomer?.orders?.map(order => (
                      <TableRow key={order.order_id}>
                        <TableCell className="px-3 py-2 text-xs">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="px-3 py-2 font-mono text-xs">#{order.order_id}</TableCell>
                        <TableCell className="px-3 py-2 text-xs">Rs. {order.total?.toLocaleString()}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-green-600">Rs. {(order.amount_paid || 0).toLocaleString()}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-red-600 font-bold">Rs. {(order.outstanding || order.total)?.toLocaleString()}</TableCell>
                        <TableCell className="px-3 py-2">
                          <Badge
                            variant={order.payment_status === 'pending' ? 'destructive' : 'secondary'}
                            className="capitalize text-xs px-2 py-0.5"
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

          <DialogFooter className="flex-shrink-0 pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>Close</Button>
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





