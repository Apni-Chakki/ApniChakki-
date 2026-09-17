import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../common/select';
import { Popover, PopoverContent, PopoverTrigger } from '../../../common/popover';
import { Button } from '../../../common/button';
import { Calendar } from '../../../common/calendar';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '../../../common/utils';
import { Calendar as CalendarIcon } from 'lucide-react';

export function ExpenseFilterBar({ dateRange, setDateRange }) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
      <Select
        onValueChange={(value) => {
          const now = new Date();
          if (value === 'current') {
            setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
          } else if (value === 'last') {
            const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            setDateRange({ from: startOfMonth(d), to: endOfMonth(d) });
          } else if (value === 'all') {
            setDateRange(undefined);
          }
        }}
      >
        <SelectTrigger className="w-full sm:w-[140px] h-9">
          <SelectValue placeholder="Quick Filter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current">This Month</SelectItem>
          <SelectItem value="last">Last Month</SelectItem>
          <SelectItem value="all">All Time</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            size="sm"
            className={cn(
              'w-full sm:w-[240px] justify-start text-left font-normal h-9',
              !dateRange && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                  </>
                ) : (
                  format(dateRange.from, 'LLL dd, y')
                )
              ) : (
                'Pick a date range'
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="end"
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
        <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)} className="h-9">
          Clear
        </Button>
      )}
    </div>
  );
}
