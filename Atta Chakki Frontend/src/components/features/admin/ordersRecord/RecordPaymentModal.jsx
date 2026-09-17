import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../common/dialog';
import { Button } from '../../../common/button';
import { Input } from '../../../common/input';
import { Label } from '../../../common/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../../../config';

export function RecordPaymentModal({ order, open, onClose, onPaymentSuccess }) {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  if (!order) return null;

  const outstanding = (order.total || 0) - (order.advancePayment || 0);

  const handleSavePayment = async () => {
    const amountToAdd = parseFloat(paymentAmount);
    if (isNaN(amountToAdd) || amountToAdd <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amountToAdd > outstanding) {
      toast.error(`Amount exceeds outstanding balance of Rs. ${outstanding.toLocaleString()}`);
      return;
    }

    setIsSavingPayment(true);
    try {
      const response = await fetch(`${API_BASE_URL}/record_payment.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: parseInt(order.id),
          amount: amountToAdd
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || `Payment of Rs. ${amountToAdd} recorded successfully`);
        setPaymentAmount('');
        onClose();
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
      } else {
        toast.error(result.message || 'Failed to record payment');
      }
    } catch (error) {
      console.error("Payment Error:", error);
      toast.error('Network error while recording payment');
    } finally {
      setIsSavingPayment(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
          <DialogDescription>
            Record a payment for Order #{order.id}. Current Due: Rs. {outstanding.toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount Received (Rs.)</Label>
            <Input 
              id="amount" 
              type="number" 
              placeholder="Enter amount" 
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              max={outstanding}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSavingPayment}>
            Cancel
          </Button>
          <Button onClick={handleSavePayment} disabled={isSavingPayment}>
            {isSavingPayment ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {isSavingPayment ? 'Saving...' : 'Save Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RecordPaymentModal;
