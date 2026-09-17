import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../common/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../../../common/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../../common/tooltip';
import { Truck, UserPlus, CalendarClock, Trash2, SplitSquareHorizontal } from 'lucide-react';

export function NewOrderActions({
  order,
  heavyThreshold,
  activePersonnel,
  onOpenSplitModal,
  onAssignPersonnel,
  onOverrideSchedule,
  onCancelOrder,
}) {
  const navigate = useNavigate();
  const weight = parseFloat(order.total_weight_kg || order.weightKg || 0);
  const isHeavy = weight > heavyThreshold;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Heavy Order Warning + Split Button */}
      {isHeavy && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="border-purple-400 text-purple-700 bg-purple-50 hover:bg-purple-100 text-xs h-8 font-semibold animate-pulse"
              onClick={() => onOpenSplitModal(order)}
            >
              <SplitSquareHorizontal className="h-3 w-3 mr-1" />
              Split Order
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs max-w-[200px]">
            <p>⚠️ Heavy Order ({weight.toFixed(1)}kg &gt; {heavyThreshold}kg)</p>
            <p>Can be split into Today + Tomorrow batches</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Driver Assignment */}
      {order.type === 'delivery' ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className={`text-xs h-8 ${order.deliveryPersonnel ? 'border-blue-500 text-blue-600 bg-blue-50 hover:bg-blue-100' : ''}`}
            >
              <Truck className="h-3 w-3 mr-1" />
              {order.deliveryPersonnel ? `${order.deliveryPersonnel.slice(0, 10)}` : 'Driver'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs">Assign Driver</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {activePersonnel.length > 0 ? (
              activePersonnel.map(person => (
                <DropdownMenuItem
                  key={person.id}
                  onSelect={() => onAssignPersonnel(order.id, person.name, person.phone)}
                  className="cursor-pointer text-xs"
                >
                  <span>{person.name}</span>
                </DropdownMenuItem>
              ))
            ) : (
              <>
                <DropdownMenuItem disabled className="text-xs">No active staff</DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => navigate('/admin/delivery')}
                  className="text-primary cursor-pointer font-medium text-xs"
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Add Staff
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onAssignPersonnel(order.id, '')}
              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer text-xs"
            >
              Clear
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-block">
              <Button size="sm" variant="outline" disabled className="opacity-50 text-xs h-8">
                <Truck className="h-3 w-3 mr-1" />
                Pickup
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent className="text-xs">
            <p>Cannot assign to pickup</p>
          </TooltipContent>
        </Tooltip>
      )}

      <Button
        size="sm"
        variant="outline"
        className="border-orange-200 text-orange-600 hover:bg-orange-50 text-xs h-8"
        onClick={() => onOverrideSchedule(order.id, 'tomorrow')}
      >
        <CalendarClock className="h-3 w-3 mr-1" />
        Tomorrow
      </Button>

      <Button
        size="sm"
        variant="destructive"
        className="text-xs h-8 px-4"
        onClick={() => onCancelOrder(order)}
      >
        <Trash2 className="h-3 w-3 mr-1 text-white" />
        Cancel
      </Button>
    </div>
  );
}
