import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../common/card';
import { Badge } from '../../../common/badge';
import { Button } from '../../../common/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../common/dropdown-menu';
import { Clock, User, Phone, MapPin, Truck, Package, FileDown, Loader2, Printer, Trash2, Store } from 'lucide-react';

export function PreparedOrderCard({
  order,
  sendingBill,
  markAsReady,
  activePersonnel,
  handleAssignPersonnel,
  handlePrint,
  setCancelOrder,
}) {
  const isPickup = order.type === 'pickup' || order.order_type === 'pickup' || (
    order.shipping_address && (
      order.shipping_address.toLowerCase().includes('pickup') ||
      order.shipping_address.toLowerCase().includes('store') ||
      order.shipping_address.toLowerCase().includes('shop') ||
      order.shipping_address.toLowerCase().includes('self') ||
      order.shipping_address.toLowerCase().includes('collect')
    )
  );

  return (
    <Card className="border-l-[6px] shadow-lg hover:shadow-xl transition-all border-t border-r border-b rounded-xl bg-white border-l-emerald-600">
      <CardHeader className="pb-2 rounded-t-xl mb-3 sm:mb-4 px-3 sm:px-6 pt-3 sm:pt-6 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg sm:text-2xl font-bold flex items-center gap-2 flex-wrap">
              Order #{order.id}
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] px-2 py-0.5 font-bold uppercase">
                Prepared Item
              </Badge>
              {isPickup ? (
                <Badge variant="outline" className="text-purple-700 bg-purple-50 border-purple-200 text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Store className="h-3 w-3" /> Self Pickup
                </Badge>
              ) : (
                <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Truck className="h-3 w-3" /> Home Delivery
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1.5 sm:mt-2 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="break-words">Created: {new Date(order.created_at).toLocaleString()}</span>
            </p>
          </div>
          <div className="sm:text-right bg-blue-50/80 px-3 py-2 rounded-lg self-stretch sm:self-auto shrink-0 min-w-max">
            <div className="flex flex-col items-start sm:items-end">
              <span className="text-base sm:text-xl font-bold text-slate-800 whitespace-nowrap">
                Rs. {parseInt((parseFloat(order.total_amount) - parseFloat(order.coupon_discount || 0))).toLocaleString()}
              </span>
              {parseFloat(order.coupon_discount || 0) > 0 && (
                <div className="text-[11px] sm:text-xs text-emerald-600 font-medium mt-1 whitespace-nowrap">
                  -Rs. {parseFloat(order.coupon_discount).toLocaleString()} (Coupon: {order.coupon_code || 'N/A'})
                </div>
              )}
              <div className="flex items-center gap-1.5 sm:justify-end mt-1 flex-wrap whitespace-nowrap">
                {order.paymentMethod && (
                  <span className="text-[11px] sm:text-xs font-semibold text-blue-600 uppercase">{order.paymentMethod}</span>
                )}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${
                  order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800 border border-green-300' :
                  order.paymentStatus === 'partial' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                  order.paymentStatus === 'unpaid' ? 'bg-red-100 text-red-800 border border-red-300 animate-pulse' :
                  'bg-yellow-100 text-yellow-800 border border-yellow-300'
                }`}>
                  {order.paymentStatus === 'paid' ? 'Paid' :
                   order.paymentStatus === 'partial' ? 'Partial' :
                   order.paymentStatus === 'unpaid' ? 'Unpaid / Rejected' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-5 px-3 sm:px-6">
        <div className="bg-muted/30 p-3 rounded-md space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{order.customer_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{order.customer_phone}</span>
          </div>
          <div className="flex items-center gap-2">
            {isPickup ? (
              <>
                <Store className="h-4 w-4 text-purple-600 shrink-0" />
                <span className="font-semibold text-purple-800">{order.shipping_address || 'Self Pickup (Store)'}</span>
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
                <span>{order.shipping_address || 'Address not provided'}</span>
              </>
            )}
          </div>
          {order.driver_name && (
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-slate-700">Driver: {order.driver_name}</span>
            </div>
          )}
        </div>

        <div>
          <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
            <Package className="h-4 w-4" /> Prepared Items to Deliver:
          </h4>
          <ul className="divide-y border rounded-md">
            {order.items.map((item, idx) => (
              <li key={idx} className="p-3 text-sm flex justify-between items-start bg-white hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="font-bold text-slate-800 break-words">{item.name}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {(item.is_weight_pending == 1 || item.is_weight_pending === '1') ? (
                    <Badge variant="secondary" className="font-bold bg-amber-100 text-amber-700 border border-amber-300">TBD</Badge>
                  ) : (
                    <>
                      <Badge variant="secondary" className="font-bold bg-slate-100 text-slate-700">x {item.quantity}</Badge>
                      {item.unit && <span className="text-[10px] font-semibold text-muted-foreground uppercase">{item.unit}</span>}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            className="w-full bg-green-600 hover:bg-green-700 shadow-md font-medium text-sm disabled:opacity-70"
            onClick={() => markAsReady(order)}
            disabled={sendingBill === order.id}
          >
            {sendingBill === order.id ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" /> Generating Bill...</>
            ) : (
              <><FileDown className="h-4 w-4 mr-2 shrink-0" /> Mark as Ready &amp; Send Bill</>
            )}
          </Button>

          {!isPickup ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className={`w-full border-2 border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm font-medium text-sm ${order.deliveryPersonnel ? 'bg-blue-50' : ''}`}>
                  <Truck className="h-4 w-4 mr-2 shrink-0" />
                  {order.deliveryPersonnel ? `${order.deliveryPersonnel.slice(0, 10)}` : 'Driver'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">Assign Driver</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {activePersonnel.length > 0 ? (
                  activePersonnel.map(person => (
                    <DropdownMenuItem key={person.id} onSelect={() => handleAssignPersonnel(order.id, person.name, person.phone)} className="cursor-pointer text-xs">
                      <span>{person.name}</span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled className="text-xs">No active staff</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => handleAssignPersonnel(order.id, '')} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer text-xs">
                  Clear
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" disabled className="w-full border-2 border-purple-200 bg-purple-50/70 text-purple-700 opacity-90 cursor-default text-sm font-semibold">
              <Store className="h-4 w-4 mr-2 shrink-0 text-purple-600" />
              Self Pickup
            </Button>
          )}

          <Button variant="outline" className="w-full border-2 border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm font-medium text-sm" onClick={() => handlePrint(order)}>
            <Printer className="h-4 w-4 mr-2 shrink-0" /> Print
          </Button>

          <Button variant="destructive" className="w-full shadow-sm font-medium text-sm" onClick={() => setCancelOrder(order)}>
            <Trash2 className="h-4 w-4 mr-2 text-white shrink-0" /> Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}