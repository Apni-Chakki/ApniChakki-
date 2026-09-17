import React from 'react';
import { Card } from '../../../common/card';
import { Button } from '../../../common/button';
import { Input } from '../../../common/input';
import { Label } from '../../../common/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../common/select';
import { Textarea } from '../../../common/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '../../../common/popover';
import { Calendar } from '../../../common/calendar';
import { format } from 'date-fns';
import { cn } from '../../../common/utils';
import { TrendingDown, Calendar as CalendarIcon, Loader2 } from 'lucide-react';

export function AddExpenseForm({
  amount,
  setAmount,
  category,
  setCategory,
  customCategory,
  setCustomCategory,
  productCategories,
  description,
  setDescription,
  expenseDate,
  setExpenseDate,
  isSaving,
  onSave,
}) {
  return (
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

          {category === 'Other' && (
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

        <div className="space-y-3">
          <div>
            <Label htmlFor="amount">Amount (Rs)</Label>
            <Input
              id="amount"
              type="number"
              className="mt-1"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div>
            <Label>Expense Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal mt-1',
                    !expenseDate && 'text-muted-foreground'
                  )}
                  disabled={isSaving}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expenseDate ? format(expenseDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expenseDate}
                  onSelect={(date) => {
                    if (date) setExpenseDate(date);
                  }}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
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
        <Button onClick={onSave} size="lg" className="w-full md:w-auto" disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {isSaving ? 'Saving...' : 'Save Record'}
        </Button>
      </div>
    </Card>
  );
}
