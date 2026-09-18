import React from 'react';
import { Card } from '../../../common/card';
import { Badge } from '../../../common/badge';
import { Button } from '../../../common/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../common/table';
import { OrderStatusBadge } from '../../../shared/OrderStatusBadge';
import { 
  Package, 
  Printer, 
  CreditCard, 
  Store, 
  Monitor 
} from 'lucide-react';

export function getPaymentStatusBadge(status) {
  switch(status) {
    case 'paid':
      return <Badge className='bg-green-500 text-white'>Paid</Badge>;
    case 'partial':
      return <Badge className='bg-blue-500 text-white'>Partial</Badge>;
    case 'pending':
    default:
      return <Badge className='bg-orange-500 text-white'>Unpaid</Badge>;
  }
}

export function OrdersRecordList({ orders, totalItems, onPrintOrder, onPayOrder }) {
  if (totalItems === 0) {
    return (
      <Card className="p-8 text-center">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">No orders found matching your filters.</p>
      </Card>
    );
  }

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  return (
    <>
      {/* Mobile card view (below md) */}
      <div className="md:hidden space-y-3">
        {orders.map((order) => {
          const remainingBalance = order.total - (order.advancePayment || 0);
          const isOverdue = (Date.now() - new Date(order.createdAt).getTime() > sevenDaysMs) &&
                            (order.paymentStatus === 'pending' || order.paymentStatus === 'partial') &&
                            order.status !== 'cancelled';

          return (
            <Card key={order.id} className={`p-3 space-y-3 ${isOverdue ? 'bg-red-50 border-red-200' : ''}`}>
              {/* Top row: Order ID + source + date */}
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-border">
                <div className="min-w-0 flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-bold">#{order.id}</span>
                  <Badge 
                    variant="outline" 
                    className={`text-[9px] uppercase font-bold flex items-center gap-1 py-0 px-1.5 h-[18px] ${
                      order.source === 'manual' 
                        ? 'text-amber-700 bg-amber-50 border-amber-200' 
                        : 'text-blue-700 bg-blue-50 border-blue-200'
                    }`}
                  >
                    {order.source === 'manual' ? <Store className="h-2.5 w-2.5" /> : <Monitor className="h-2.5 w-2.5" />}
                    {order.source}
                  </Badge>
                </div>
                <div className="text-right text-[11px] text-muted-foreground shrink-0">
                  <div className="font-medium text-foreground">
                    {new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="text-[10px]">
                    {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Customer */}
              <div className="text-sm">
                <p className="font-semibold break-words">{order.customerName}</p>
                <p className="text-xs text-muted-foreground break-all">{order.phone}</p>
              </div>

              {/* Items */}
              <div className="text-xs space-y-0.5">
                {order.items.slice(0, 2).map((item, idx) => (
                  <p key={idx} className="break-words">
                    <span className="font-medium">{item.service.name}</span> ×{item.quantity}
                  </p>
                ))}
                {order.items.length > 2 && (
                  <p className="text-muted-foreground">+{order.items.length - 2} more</p>
                )}
              </div>

              {/* Amount + Payment + Status */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                <div>
                  <div className="font-bold text-base">
                    Rs. {order.total}
                    {order.items.some(i => i.isWeightPending) && (
                      <span className="text-primary text-[10px] ml-1">(+ TBD)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {getPaymentStatusBadge(order.paymentStatus)}
                    <OrderStatusBadge status={order.status} />
                  </div>
                  {remainingBalance > 0 && (
                    <p className="text-red-600 font-medium text-xs mt-1">Due: Rs. {remainingBalance}</p>
                  )}
                </div>
              </div>

              {order.status === "cancelled" && order.cancelReason && (
                <div className="text-[11px] text-red-600 bg-red-50 p-2 rounded font-medium">
                  <span className="font-bold border-b border-red-200 block mb-0.5 pb-0.5">
                    {order.cancelledBy || "User"} Reason:
                  </span>
                  <span>{order.cancelReason}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs h-8"
                  onClick={() => onPrintOrder(order)}
                >
                  <Printer className="h-3 w-3 mr-1 shrink-0" />
                  Print
                </Button>
                {order.paymentStatus !== 'paid' && order.status !== 'cancelled' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs h-8 bg-green-600 hover:bg-green-700 text-white border-green-700 hover:border-green-800 shadow-sm"
                    onClick={() => onPayOrder(order)}
                  >
                    <CreditCard className="h-3 w-3 mr-1 shrink-0" />
                    Pay
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Desktop table (md and up) */}
      <div className="hidden md:block overflow-x-auto">
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Order ID</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const remainingBalance = order.total - (order.advancePayment || 0);
                const isOverdue = (Date.now() - new Date(order.createdAt).getTime() > sevenDaysMs) && 
                                  (order.paymentStatus === 'pending' || order.paymentStatus === 'partial') && 
                                  order.status !== 'cancelled';

                return (
                  <TableRow key={order.id} className={isOverdue ? "bg-red-50 hover:bg-red-100" : ""}>
                    <TableCell className="font-mono text-xs font-bold">
                      #{order.id}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`text-[9px] uppercase font-bold flex items-center gap-1 py-0 px-1.5 h-[18px] w-fit ${
                          order.source === 'manual' 
                            ? 'text-amber-700 bg-amber-50 border-amber-200' 
                            : 'text-blue-700 bg-blue-50 border-blue-200'
                        }`}
                      >
                        {order.source === 'manual' ? <Store className="h-2.5 w-2.5" /> : <Monitor className="h-2.5 w-2.5" />}
                        {order.source}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        <span className="font-medium text-foreground">
                          {new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <br />
                        <span className="text-[10px]">
                          {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <p className="font-medium">{order.customerName}</p>
                        <p className="text-muted-foreground">{order.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        {order.items.slice(0, 1).map((item, idx) => (
                          <p key={idx}>{item.service.name} ×{item.quantity}</p>
                        ))}
                        {order.items.length > 1 && (
                          <p className="text-muted-foreground">+{order.items.length - 1}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold whitespace-nowrap">
                      Rs. {order.total}
                      {order.items.some(i => i.isWeightPending) && (
                        <span className="text-primary text-[10px] ml-1">(+ TBD)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        {getPaymentStatusBadge(order.paymentStatus)}
                        {remainingBalance > 0 && <p className="text-red-600 font-medium text-xs">Due: {remainingBalance}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <OrderStatusBadge status={order.status} />
                        {order.status === "cancelled" && order.cancelReason && (
                          <div 
                            className="text-[11px] text-red-600 bg-red-50 p-1 rounded font-medium max-w-[150px]" 
                            title={`${order.cancelReason} (${order.cancelledBy || "User"})`}
                          >
                            <span className="font-bold border-b border-red-200 block mb-0.5 pb-0.5">
                              {order.cancelledBy || "User"} Reason:
                            </span>
                            <span className="line-clamp-2">{order.cancelReason}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col gap-1.5 items-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 py-0 px-3 w-[72px]"
                          onClick={() => onPrintOrder(order)}
                        >
                          <Printer className="h-3 w-3 mr-1" />
                          Print
                        </Button>

                        {order.paymentStatus !== 'paid' && order.status !== 'cancelled' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 py-0 px-3 w-[72px] bg-green-600 hover:bg-green-700 text-white border-green-700 hover:border-green-800 shadow-sm"
                            onClick={() => onPayOrder(order)}
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
                            Pay
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    </>
  );
}

export default OrdersRecordList;
