import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';
import { Trash2, Plus, Calendar as CalendarIcon, Wallet, TrendingDown, Printer, Loader2 } from 'lucide-react'; 
import { toast } from 'sonner';
import { useAuth } from '../../lib/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '../ui/utils';
import { PrintExpenseReport } from './PrintExpenseReport'; 
import { API_BASE_URL } from '../../config'; // <-- NEW: Import API Config

export function DigitalKhata() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [backendTotals, setBackendTotals] = useState({ today: 0, month: 0 }); // <-- Store DB totals
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [productCategories, setProductCategories] = useState([]);
  const [description, setDescription] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [showPrintReport, setShowPrintReport] = useState(false);

  // --- NEW: FETCH FROM API ---
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/get_expenses.php`);
      const data = await response.json();

      if (data.success) {
        setBackendTotals(data.totals);
        
        // Map Database format to React format
        const mappedExpenses = data.records.map(record => ({
          id: record.id,
          date: record.expense_time, 
          category: record.category || "Uncategorized",
          amount: parseFloat(record.amount),
          description: record.description,
          recordedBy: record.recorded_by || 'Admin'
        }));
        
        setExpenses(mappedExpenses);
      } else {
        toast.error("Failed to load expenses");
      }
    } catch (error) {
      console.error("Network Error:", error);
      toast.error("Network Error: Could not connect to database");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_products.php`);
      const data = await response.json();
      if (data.success && data.products) {
        // Use product names as potential expense categories
        setProductCategories(data.products.map(p => p.name));
      }
    } catch (error) {
      console.error('Failed to load product categories', error);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchProducts();
  }, []);

  // --- NEW: SAVE TO API ---
  const handleAddExpense = async () => {
    if (!amount || !category || (category === "Other" && !customCategory)) {
      toast.error('Please enter amount and category details');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }

    setIsSaving(true);
    try {
      // Format local time for MySQL (YYYY-MM-DD HH:MM:SS)
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(now - offset)).toISOString().slice(0, 19).replace('T', ' ');

      const finalCategory = category === "Other" ? customCategory.trim() : category;

      const payload = {
        user_id: user?.id || 1, // Fallback to 1 (Admin) if missing
        category: finalCategory,
        amount: numAmount,
        description: description,
        expense_time: localISOTime
      };

      const response = await fetch(`${API_BASE_URL}/add_expense.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Expense recorded successfully');
        setAmount('');
        setCategory('');
        setCustomCategory('');
        setDescription('');
        setIsAdding(false);
        fetchExpenses(); // Reload to get fresh totals and data
      } else {
        toast.error(result.message || 'Failed to record expense');
      }
    } catch (error) {
      toast.error('Network Error while saving');
    } finally {
      setIsSaving(false);
    }
  };

  // --- NEW: DELETE VIA API ---
  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/delete_expense.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: id })
        });
        
        const result = await response.json();
        
        if (result.success) {
          toast.success('Entry deleted');
          fetchExpenses(); // Reload list and totals
        } else {
          toast.error('Failed to delete');
        }
      } catch (error) {
        toast.error('Network error while deleting');
      }
    }
  };

  const filteredExpenses = expenses.filter(e => {
    if (!dateRange || !dateRange.from) return true;
    const expenseDate = new Date(e.date);
    const fromDate = new Date(dateRange.from);
    fromDate.setHours(0, 0, 0, 0);
    
    if (expenseDate < fromDate) return false;
    
    if (dateRange.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      if (expenseDate > toDate) return false;
    }
    
    return true;
  });

  const getPeriodLabel = () => {
    if (dateRange?.from) {
      if (dateRange.to) {
        return `${format(dateRange.from, 'dd MMM yyyy')} - ${format(dateRange.to, 'dd MMM yyyy')}`;
      }
      return format(dateRange.from, 'dd MMM yyyy');
    }
    return 'All Time';
  };

  if (loading && expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading Khata Records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-foreground mb-2">Digital Khata</h1>
          <p className="text-muted-foreground">Track daily expenditures and purchases</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={() => setShowPrintReport(true)}>
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
          <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "outline" : "default"}>
            {isAdding ? 'Cancel' : <><Plus className="h-4 w-4 mr-2" /> Add New Expense</>}
          </Button>
        </div>
      </div>

      {/* Stats Cards (Now using Backend Totals!) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-orange-50 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-800 font-medium">Today's Expenditure</p>
              <h2 className="text-3xl font-bold text-orange-900 mt-2">
                Rs. {parseFloat(backendTotals.today).toLocaleString()}
              </h2>
            </div>
            <div className="h-12 w-12 bg-orange-200 rounded-full flex items-center justify-center">
              <Wallet className="h-6 w-6 text-orange-700" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-800 font-medium">This Month's Total</p>
              <h2 className="text-3xl font-bold text-blue-900 mt-2">
                Rs. {parseFloat(backendTotals.month).toLocaleString()}
              </h2>
            </div>
            <div className="h-12 w-12 bg-blue-200 rounded-full flex items-center justify-center">
              <CalendarIcon className="h-6 w-6 text-blue-700" />
            </div>
          </div>
        </Card>
      </div>

      {/* Add Expense Form */}
      {isAdding && (
        <Card className="p-6 border-primary/20 shadow-md">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            Record New Expense
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="category">Category (from Products)</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger disabled={isSaving}>
                    <SelectValue placeholder="Select expense type" />
                  </SelectTrigger>
                  <SelectContent>
                    {productCategories.map((cat, idx) => (
                      <SelectItem key={`cat-${idx}`} value={cat}>{cat}</SelectItem>
                    ))}
                    <SelectItem value="Other">Other (Custom)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {category === "Other" && (
                <div className="animate-in fade-in slide-in-from-top-1">
                  <Label htmlFor="customCategory">Custom Expense Name</Label>
                  <Input 
                    id="customCategory" 
                    type="text" 
                    className="mt-1"
                    placeholder="e.g. Utility Bills, Maintenance..." 
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="amount">Amount (Rs)</Label>
              <Input 
                id="amount" 
                type="number" 
                placeholder="0.00" 
                value={amount}
                onChange={e => setAmount(e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Description / Note (Optional)</Label>
              <Textarea 
                id="description" 
                placeholder="Additional details..." 
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                disabled={isSaving}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleAddExpense} size="lg" className="w-full md:w-auto" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {isSaving ? 'Saving...' : 'Save Record'}
            </Button>
          </div>
        </Card>
      )}

      {/* Expenses List with Filter */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b bg-muted/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-semibold">Expense Records</h3>
          
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  size="sm"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            {dateRange && (
              <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)}>
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Recorded By</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No expenses found for the selected period.
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">
                      {new Date(expense.date).toLocaleDateString()} <br/>
                      <span className="text-xs text-muted-foreground">{new Date(expense.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                        {expense.category}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {expense.description || '-'}
                    </TableCell>
                    <TableCell className="text-sm">{expense.recordedBy}</TableCell>
                    <TableCell className="text-right font-bold text-red-600">
                      Rs. {expense.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(expense.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Footer Total for Filtered View */}
        {filteredExpenses.length > 0 && (
          <div className="p-4 border-t bg-muted/10 flex justify-end items-center gap-4">
            <span className="text-muted-foreground font-medium">Total for period:</span>
            <span className="text-xl font-bold text-foreground">
              Rs. {filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
            </span>
          </div>
        )}
      </Card>

      <PrintExpenseReport 
        expenses={filteredExpenses}
        dateRangeLabel={getPeriodLabel()}
        open={showPrintReport}
        onClose={() => setShowPrintReport(false)}
      />
    </div>
  );
}