import React from 'react';
import { Search } from 'lucide-react';
import { Card } from '@/components/common/card';
import { Input } from '@/components/common/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/common/select';

export default function InventoryFilterBar({
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  categories = []
}) {
  return (
    <Card className="p-3 sm:p-4 mb-4 sm:mb-6">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center">
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
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}
