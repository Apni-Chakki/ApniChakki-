import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { 
  Package, 
  Plus, 
  Minus, 
  AlertTriangle, 
  CheckCircle,
  Printer,
  Search,
  Loader2 // Added for loading state
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../lib/AuthContext';
import { PrintRestockList } from './PrintRestockList';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { API_BASE_URL } from '../../config'; // <-- NEW: API Config

export function InventoryManagement() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true); // <-- NEW: Loading State
  const [isUpdating, setIsUpdating] = useState(false); // To disable buttons while saving
  
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [updateType, setUpdateType] = useState('add');
  const [updateQuantity, setUpdateQuantity] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');

  // --- Filters ---
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchInventory(); 
  }, []);

  // --- NEW: FETCH FROM API ---
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/get_inventory.php`);
      const data = await response.json();

      if (data.success) {
        setInventory(data.inventory);
      } else {
        toast.error(data.message || "Failed to load inventory");
      }
    } catch (error) {
      console.error("Network Error:", error);
      toast.error("Network error: Could not load inventory");
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: UPDATE VIA API ---
  const handleUpdateStock = async () => {
    if (!selectedProduct || !updateQuantity) {
      toast.error('Please enter quantity');
      return;
    }

    const quantity = parseFloat(updateQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid positive number');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/manual_stock_update.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          quantity: quantity,
          type: updateType
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Inventory updated successfully!`);
        setShowUpdateDialog(false);
        setUpdateQuantity('');
        setUpdateNotes('');
        setSelectedProduct(null);
        fetchInventory(); // Reload the fresh data from the database
      } else {
        toast.error(data.message || "Failed to update inventory");
      }
    } catch (error) {
      console.error("Network Error:", error);
      toast.error("Network error while updating stock");
    } finally {
      setIsUpdating(false);
    }
  };

  const openUpdateDialog = (product, type) => {
    setSelectedProduct(product);
    setUpdateType(type);
    setShowUpdateDialog(true);
  };

  const getStockStatus = (item) => {
    if (item.currentStock <= item.minStockLevel) {
      return { label: 'Low Stock', color: 'bg-red-500 text-white' };
    } else if (item.maxStockLevel && item.currentStock >= item.maxStockLevel) {
      return { label: 'Full Stock', color: 'bg-blue-500 text-white' };
    } else if (item.currentStock <= item.minStockLevel * 1.5) {
      return { label: 'Medium Stock', color: 'bg-yellow-500 text-white' };
    } else {
      return { label: 'Good Stock', color: 'bg-green-500 text-white' };
    }
  };

  const handlePrintRestockList = () => {
    setShowPrintDialog(true);
  };

  // Extract unique categories dynamically from the database products
  const dbCategories = Array.from(new Set(inventory.map(item => item.category).filter(Boolean))).sort();

  // Filter Logic (Now uses category directly from the DB)
  const filteredInventory = inventory.filter(item => {
    const safeName = (item.productName || item.name || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = safeName.includes(searchLower) || (item.category || '').toLowerCase().includes(searchLower);
    
    // Category dropdown filter
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = inventory.filter(item => item.currentStock <= item.minStockLevel).length;

  if (loading && inventory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading Inventory Data...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-foreground mb-2">Inventory Management</h1>
          <p className="text-muted-foreground">Track and manage stock levels for your products</p>
        </div>
        
        <Button variant="outline" onClick={handlePrintRestockList}>
          <Printer className="h-4 w-4 mr-2" />
          Print Restock List
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Products</p>
              <p className="text-2xl mt-1">{inventory.length}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Low Stock</p>
              <p className="text-2xl mt-1">{lowStockCount}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Well Stocked</p>
              <p className="text-2xl mt-1">
                {inventory.filter(item => item.currentStock > item.minStockLevel).length}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="w-full sm:w-[200px]">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {dbCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Inventory Table */}
      {filteredInventory.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">No matching products found.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Product Name</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Min Level</TableHead>
                <TableHead>Max Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item) => {
                const status = getStockStatus(item);
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{item.productName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-lg">
                        {item.currentStock} {item.unit}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {item.minStockLevel} {item.unit}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {item.maxStockLevel || '-'} {item.maxStockLevel ? item.unit : ''}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={status.color}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(item.lastUpdated).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openUpdateDialog(item, 'add')}
                          className="text-green-600 hover:bg-green-50"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openUpdateDialog(item, 'remove')}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Minus className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Update Stock Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {updateType === 'add' ? 'Add Stock' : updateType === 'remove' ? 'Remove Stock' : 'Adjust Stock'}
            </DialogTitle>
            <DialogDescription>
              Update inventory for {selectedProduct?.productName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Stock</p>
              <p className="text-2xl">
                {selectedProduct?.currentStock} {selectedProduct?.unit}
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                {updateType === 'adjust' ? 'New Stock Level' : 'Quantity'} ({selectedProduct?.unit})
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={updateQuantity}
                onChange={(e) => setUpdateQuantity(e.target.value)}
                placeholder={updateType === 'adjust' ? 'Enter new stock level' : 'Enter quantity'}
                disabled={isUpdating}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
                placeholder="Add any notes about this update..."
                rows={3}
                disabled={isUpdating}
              />
            </div>

            {updateQuantity && selectedProduct && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">New Stock Level</p>
                <p className="text-xl">
                  {updateType === 'add'
                    ? selectedProduct.currentStock + (parseFloat(updateQuantity) || 0)
                    : updateType === 'remove'
                    ? Math.max(0, selectedProduct.currentStock - (parseFloat(updateQuantity) || 0))
                    : (parseFloat(updateQuantity) || 0)}{' '}
                  {selectedProduct.unit}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleUpdateStock} className="flex-1" disabled={isUpdating}>
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isUpdating ? 'Updating...' : 'Update Inventory'}
              </Button>
              <Button
                variant="outline"
                disabled={isUpdating}
                onClick={() => {
                  setShowUpdateDialog(false);
                  setUpdateQuantity('');
                  setUpdateNotes('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PrintRestockList 
        items={inventory}
        open={showPrintDialog}
        onClose={() => setShowPrintDialog(false)}
      />
    </div>
  );
}