import { Search, X } from 'lucide-react';
import { Input } from '../../../common/input';

// search box for today's work, shows match count while typing
export function OrderSearchBar({ value, onChange, matchCount, totalCount, t }) {
  const isSearching = value.trim() !== '';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('Search by order no, customer name, phone or item')}
          className="pl-9 pr-9 h-11 bg-white"
        />
        {isSearching && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {isSearching && (
        <span className="text-xs sm:text-sm font-semibold text-slate-500 whitespace-nowrap">
          {matchCount} / {totalCount} {t('orders')}
        </span>
      )}
    </div>
  );
}
