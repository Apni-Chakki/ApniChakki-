import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { API_BASE_URL } from '../../config';

export function UpdateWeightModal({ order, open, onClose, onOrderUpdated }) {
  const [itemQuantities, setItemQuantities] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Populate state when modal opens
  useEffect(() => {
    if (order) {
      const initialQuantities = {};
      order.items.forEach(item => {
        const itemId = item.order_item_id || item.service?.id || item.id;
        if (item.isWeightPending) {
          initialQuantities[itemId] = ''; 
        } else {
          initialQuantities[itemId] = String(item.quantity);
        }
      });
      setItemQuantities(initialQuantities);
    }
  }, [order]);

  const handleQuantityChange = (itemId, value) => {
    setItemQuantities(prev => ({
      ...prev,
      [itemId]: value,
    }));
  };

  // --- SAVE VIA API ---
  const handleSave = async () => {
    if (!order) return;
    setIsSaving(true);

    let hasInvalidEntry = false;
    const itemsToUpdate = [];

    // Validate and collect items to update
    const pendingItems = order.items.filter(item => item.isWeightPending);
    
    for (const item of pendingItems) {
      const itemId = item.order_item_id || item.service?.id || item.id;
      const newQuantityStr = itemQuantities[itemId];
      const newQuantity = parseFloat(newQuantityStr);
      
      if (isNaN(newQuantity) || newQuantity <= 0) {
        const itemName = item.service?.name || item.name || 'Unknown';
        toast.error(`Please enter a valid weight for ${itemName}`);
        hasInvalidEntry = true;
        break;
      }

      itemsToUpdate.push({
        order_item_id: item.order_item_id || itemId,
        quantity: newQuantity
      });
    }

    if (hasInvalidEntry) {
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/update_order_items.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          items: itemsToUpdate
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Order weight and price updated!');
        onOrderUpdated(); // Refresh parent data
        onClose();
      } else {
        toast.error(result.message || 'Failed to update order items');
      }
    } catch (error) {
      console.error("Update Error:", error);
      toast.error('Network error while updating order');
    } finally {
      setIsSaving(false);
    }
  };

  const pendingItems = order?.items?.filter(item => item.isWeightPending) || [];
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Update Order Weight</DialogTitle>
          <DialogDescription>
            Enter the measured weight for items in order #{order?.id}. The total price will be recalculated server-side.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {pendingItems.length > 0 ? (
            pendingItems.map(item => {
              const itemId = item.order_item_id || item.service?.id || item.id;
              const itemName = item.service?.name || item.name || 'Unknown';
              const itemPrice = item.service?.price || item.price || 0;
              const itemUnit = item.service?.unit || item.unit || 'kg';
              
              return (
                <div key={itemId} className="space-y-2">
                  <Label htmlFor={`weight-${itemId}`}>
                    {itemName} (Price: Rs. {itemPrice}/{itemUnit})
                  </Label>
                  <Input
                    id={`weight-${itemId}`}
                    type="number"
                    placeholder={`Enter weight in ${itemUnit}`}
                    value={itemQuantities[itemId] || ''}
                    onChange={(e) => handleQuantityChange(itemId, e.target.value)}
                    min="0.1"
                    step="0.01"
                  />
                </div>
              );
            })
          ) : (
            <p className="text-muted-foreground text-center">No pending items found in this order.</p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSave} 
            disabled={isSaving || pendingItems.length === 0}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Weight
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}