import React from 'react';
import { Card } from '../../../common/card';
import { Button } from '../../../common/button';
import { Input } from '../../../common/input';
import { Popover, PopoverContent, PopoverTrigger } from '../../../common/popover';
import { Calendar } from '../../../common/calendar';
import { Checkbox } from '../../../common/checkbox';
import { Label } from '../../../common/label';
import { format } from 'date-fns';
import { Search, CalendarDays, Download, FileText, Loader2 } from 'lucide-react';

export function OrdersRecordFilters({
  searchTerm,
  setSearchTerm,
  sourceFilter,
  setSourceFilter,
  dateRange,
  setDateRange,
  statusFilter,
  setStatusFilter,
  showAdvanceOnly,
  setShowAdvanceOnly,
  showUnpaidOnly,
  setShowUnpaidOnly,
  totalItems,
  isPreparingExport,
  onExportCSV,
  onPrintList
}) {
  return (
    <Card className="p-3 sm:p-4 mb-4">
      <div className="space-y-3">
        {/* Search & Source */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative group flex-1 min-w-0">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground transition-colors group-focus-within:text-green-600" />
            <Input
              placeholder="Search by name, phone, or order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 sm:pl-14 text-sm sm:text-base h-10 sm:h-12 w-full rounded-full border-gray-200 bg-gray-50 hover:bg-white focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-green-500 focus-visible:border-green-500 shadow-sm transition-all duration-200"
            />
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-10 sm:h-12 w-full sm:w-[150px] flex-shrink-0 items-center cursor-pointer justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="all">All Sources</option>
            <option value="manual">Manual Orders</option>
            <option value="online">Online Orders</option>
          </select>
        </div>

        {/* Date Range & Status Filters */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 py-1"
              >
                <CalendarDays className="mr-1.5 h-3 w-3" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
                    </>
                  ) : (
                    format(dateRange.from, "MMM dd")
                  )
                ) : (
                  <span>Date Range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 min-w-[280px]"
              align="start"
              side="bottom"
              sideOffset={6}
              collisionPadding={{ top: 80, bottom: 16, left: 8, right: 8 }}
            >
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={1}
              />
            </PopoverContent>
          </Popover>
          {dateRange && (
            <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)} className="text-xs h-8 py-1">
              Clear
            </Button>
          )}

          {/* Status Filters */}
          <div className="flex gap-1 flex-wrap">
            {['all', 'pending', 'processing', 'completed'].map(status => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                onClick={() => setStatusFilter(status)}
                size="sm"
                className="text-xs py-1 h-8"
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Checkboxes & Actions */}
        <div className="flex flex-wrap gap-2 items-center">
          <div 
            onClick={() => {
              const next = !showAdvanceOnly;
              setShowAdvanceOnly(next);
              if (next) setShowUnpaidOnly(false);
            }}
            className="flex items-center space-x-2 px-4 py-1.5 rounded bg-gray-50 h-8 cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <Checkbox 
              id="advance-filter" 
              checked={showAdvanceOnly} 
              onCheckedChange={() => {
                const next = !showAdvanceOnly;
                setShowAdvanceOnly(next);
                if (next) setShowUnpaidOnly(false);
              }} 
            />
            <Label htmlFor="advance-filter" className="text-xs cursor-pointer">Advance Only</Label>
          </div>

          <div 
            onClick={() => {
              const next = !showUnpaidOnly;
              setShowUnpaidOnly(next);
              if (next) setShowAdvanceOnly(false);
            }}
            className="flex items-center space-x-2 px-4 py-1.5 rounded bg-red-50 h-8 cursor-pointer hover:bg-red-100 transition-colors"
          >
            <Checkbox 
              id="unpaid-filter" 
              checked={showUnpaidOnly} 
              onCheckedChange={() => {
                const next = !showUnpaidOnly;
                setShowUnpaidOnly(next);
                if (next) setShowAdvanceOnly(false);
              }} 
            />
            <Label htmlFor="unpaid-filter" className="text-xs cursor-pointer text-red-700">Unpaid/Due</Label>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 text-green-700 border-green-200 hover:bg-green-50 px-4"
            disabled={totalItems === 0 || isPreparingExport}
            onClick={onExportCSV}
          >
            {isPreparingExport ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
            Export
          </Button>

          <Button
            variant="default"
            size="sm"
            className="text-xs h-8 px-4"
            disabled={totalItems === 0 || isPreparingExport}
            onClick={onPrintList}
          >
            {isPreparingExport ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <FileText className="h-3 w-3 mr-1" />}
            Print
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default OrdersRecordFilters;
