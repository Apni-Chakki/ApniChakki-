import React from 'react';
import { useTranslation } from 'react-i18next';
import { Truck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '../../../common/dropdown-menu';

export function PickupDriverDropdown({
  order,
  activePersonnel,
  onAssignPersonnel,
  variant = 'desktop'
}) {
  const { t } = useTranslation();

  if (variant === 'mobile') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer truncate ${order.driver_name ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-blue-200 text-blue-700'}`}>
            <Truck className="w-3.5 h-3.5 shrink-0 text-blue-600" />
            <span className="truncate">{order.driver_name || t('Assign Driver')}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel className="text-xs">Assign Driver</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {activePersonnel.length > 0 ? (
            activePersonnel.map(person => (
              <DropdownMenuItem key={person.id} onSelect={() => onAssignPersonnel(order.id, person.name, person.phone)} className="cursor-pointer text-xs">
                {person.name}
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled className="text-xs">No active staff</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onAssignPersonnel(order.id, '')} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer text-xs">
            Clear
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          title={order.driver_name ? `Assigned: ${order.driver_name}` : "Assign Driver"}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer hover:bg-blue-50 max-w-[110px] truncate ${
            order.driver_name
              ? 'bg-blue-50 border-blue-300 text-blue-800'
              : 'bg-white border-blue-200 text-blue-700'
          }`}
        >
          <Truck className="w-3 h-3 shrink-0 text-blue-600" />
          <span className="truncate">{order.driver_name || t('Assign Driver')}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs">Assign Driver</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {activePersonnel.length > 0 ? (
          activePersonnel.map(person => (
            <DropdownMenuItem key={person.id} onSelect={() => onAssignPersonnel(order.id, person.name, person.phone)} className="cursor-pointer text-xs">
              {person.name}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled className="text-xs">No active staff</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onAssignPersonnel(order.id, '')} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer text-xs">
          Clear
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
