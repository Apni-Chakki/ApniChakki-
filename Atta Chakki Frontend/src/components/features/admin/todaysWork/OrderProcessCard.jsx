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
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../common/tooltip';
import {
  Clock,
  Timer,
  Weight,
  Package,
  User,
  Phone,
  MapPin,
  Truck,
  SplitSquareHorizontal,
  History,
  CheckCircle,
  FileDown,
  CalendarClock,
  Printer,
  Trash2,
  Lock,
  Loader2,
  Store,
} from 'lucide-react';

export const OrderProcessCard = ({ order, queueIndex, heavyThreshold = 40, formatETA, getTimeRemaining, markAsReady, markBatchProcessed, sendingBill, openSplitModal, moveToTomorrow, overriding, activePersonnel = [], handleAssignPersonnel, handlePrint, setCancelOrder }) => {
  const isOverdue = order.estimated_completion_time ? new Date(order.estimated_completion_time) < new Date() : false;
  const isSplitBatch = order.is_split_batch === true;
  const allSiblingsReady = order.all_siblings_ready === true;
  // If this is a split batch, Mark as Ready is only allowed when ALL siblings are ready
  const canMarkReady = !isSplitBatch || allSiblingsReady;
  const isHeavy = parseFloat(order.total_weight_kg || 0) > heavyThreshold;
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
    <Card className={`border-l-[6px] shadow-lg hover:shadow-xl transition-all border-t border-r border-b rounded-xl bg-white ${
      isOverdue 
        ? 'border-l-red-600 animate-glow-red relative z-10'
        : isSplitBatch
          ? 'border-l-purple-500'
          : order.is_carried_forward
            ? 'border-l-orange-500'
            : order.is_manually_overridden === '1' || order.is_manually_overridden === 1
              ? 'border-l-amber-500'
              : 'border-l-blue-600'
    }`}>
      <CardHeader className={`pb-2 rounded-t-xl mb-3 sm:mb-4 px-3 sm:px-6 pt-3 sm:pt-6 ${isOverdue ? 'bg-red-50/50' : order.is_carried_forward ? 'bg-orange-50/60' : 'bg-slate-50/50'}`}>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg sm:text-2xl font-bold flex items-center gap-2 flex-wrap">
              {order.parent_order_id ? (
                <>
                  Order #{order.parent_order_id}
                  <span className="text-xs font-normal text-muted-foreground">
                    (Batch {order.batch_index || 1} of {order.total_batches || order.siblings?.length || 2} • #{order.id})
                  </span>
                </>
              ) : (
                `Order #${order.id}`
              )}
              {isPickup ? (
                <Badge variant="outline" className="text-purple-700 bg-purple-50 border-purple-200 text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Store className="h-3 w-3" /> Self Pickup
                </Badge>
              ) : (
                <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Truck className="h-3 w-3" /> Home Delivery
                </Badge>
              )}
              {isSplitBatch && (
                <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px] px-2 py-0.5 font-bold">
                  <SplitSquareHorizontal className="h-3 w-3 mr-1" />
                  BATCH {order.batch_index || 1} OF {order.total_batches || order.siblings?.length || '?'}
                </Badge>
              )}
              {order.is_carried_forward && (
                <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-[10px] px-2 py-0.5 font-bold">
                  <History className="h-3 w-3 mr-1" /> CARRIED FORWARD
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
                {order.items.some(i => i.is_weight_pending == 1 || i.is_weight_pending === '1') && <span className="text-primary text-xs ml-1">(+ TBD)</span>}
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
        {/* ETA & scheduling info card */}
        <div className={`p-3 sm:p-4 rounded-lg border transition-colors ${
          isOverdue
            ? 'bg-red-50 border-red-300'
            : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
        }`}>
          <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:gap-3">
            <div className="flex items-center justify-between sm:flex-col sm:text-center min-w-0">
              <div className={`flex items-center gap-1 sm:justify-center sm:mb-1 ${isOverdue ? 'text-red-600' : 'text-emerald-600'}`}>
                <Timer className="h-4 w-4 shrink-0" />
                <span className="text-xs font-semibold uppercase">ETA</span>
              </div>
              <div className="text-right sm:text-center">
                <p className={`text-base sm:text-lg font-bold break-words ${isOverdue ? 'text-red-700' : 'text-emerald-800'}`}>{formatETA(order.estimated_completion_time)}</p>
                <p className={`text-xs font-bold ${isOverdue ? 'text-red-600' : 'text-emerald-600'}`}>{getTimeRemaining(order.estimated_completion_time)}</p>
              </div>
            </div>
            <div className={`flex items-center justify-between sm:flex-col sm:text-center min-w-0 border-y sm:border-y-0 sm:border-x py-2 sm:py-0 ${isOverdue ? 'border-red-200' : 'border-emerald-200'}`}>
              <div className={`flex items-center gap-1 sm:justify-center sm:mb-1 ${isOverdue ? 'text-red-600' : 'text-emerald-600'}`}>
                <Weight className="h-4 w-4 shrink-0" />
                <span className="text-xs font-semibold uppercase">Weight</span>
              </div>
              <div className="text-right sm:text-center">
                <p className={`text-base sm:text-lg font-bold ${isOverdue ? 'text-red-700' : 'text-emerald-800'}`}>{parseFloat(order.total_weight_kg || 0).toFixed(1)} kg</p>
                <p className={`text-xs ${isOverdue ? 'text-red-600' : 'text-emerald-600'}`}>{order.processing_time_minutes || Math.ceil(parseFloat(order.total_weight_kg || 1) * 2)} mins</p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:flex-col sm:text-center min-w-0">
              <div className={`flex items-center gap-1 sm:justify-center sm:mb-1 ${isOverdue ? 'text-red-600' : 'text-emerald-600'}`}>
                <Package className="h-4 w-4 shrink-0" />
                <span className="text-xs font-semibold uppercase">Queue</span>
              </div>
              <div className="text-right sm:text-center">
                <p className={`text-base sm:text-lg font-bold ${isOverdue ? 'text-red-700' : 'text-emerald-800'}`}>#{queueIndex || order.queue_position || '-'}</p>
                <p className={`text-xs ${isOverdue ? 'text-red-600' : 'text-emerald-600'}`}>Position</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sibling Batch Status (only for split orders) */}
        {isSplitBatch && order.siblings && order.siblings.length > 0 && (
          <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <SplitSquareHorizontal className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-semibold text-purple-800 uppercase">Split Batches Status</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {order.siblings.map((sib) => {
                const isSibReady = ['ready', 'batch_ready', 'completed', 'delivered'].includes(String(sib.status || '').toLowerCase().trim());
                const isCurrent = sib.id === order.id;
                return (
                  <div
                    key={sib.id}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${
                      isCurrent
                        ? 'bg-purple-600 text-white border-purple-700 font-bold shadow-sm'
                        : isSibReady
                          ? 'bg-green-100 text-green-800 border-green-300'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                    }`}
                  >
                    {isSibReady
                      ? <CheckCircle className="h-3 w-3" />
                      : <Clock className="h-3 w-3" />}
                    Batch {sib.batch_index || 1} #{sib.id} {isCurrent ? '(Current)' : ''}
                    <span className="text-[10px] opacity-80">
                      ({parseFloat(sib.total_weight_kg || 0).toFixed(1)}kg)
                    </span>
                    — {sib.assigned_date === new Date().toISOString().slice(0, 10) ? 'Today' : 'Tomorrow'}
                  </div>
                );
              })}
            </div>
            {!allSiblingsReady && (
              <p className="mt-2 text-xs text-purple-700 flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Jab tak <strong>tamam batches ready</strong> nahi hote, Final Bill lock rahega. Ap is batch ko 'Process' kar sakte hain.
              </p>
            )}
          </div>
        )}

        {/* customer info */}
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

        {/* order items */}
        <div>
          <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
            <Package className="h-4 w-4" /> Items to Prepare:
          </h4>
          <ul className="divide-y border rounded-md">
            {order.items.map((item, idx) => (
              <li key={idx} className="p-3 text-sm flex justify-between items-start bg-white hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="font-bold text-slate-800 break-words">{item.name}</p>
                  {/* Dynamic customizations display */}
                  {(item.customizations?.length > 0 || item.is_cleaning || item.is_grinding) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.customizations?.length > 0 ? (
                        item.customizations.map((cust, cIdx) => (
                          <span key={cIdx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            ✓ {cust.option_name}
                          </span>
                        ))
                      ) : (
                        <>
                          {item.is_cleaning == 1 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              ✓ Cleaning
                            </span>
                          )}
                          {item.is_grinding == 1 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              ✓ Grinding
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {(item.is_weight_pending == 1 || item.is_weight_pending === '1') && (
                    <p className="text-[10px] font-black text-primary mt-1 flex items-center gap-1 uppercase tracking-wider">
                      <Timer className="h-3 w-3" /> Weight Pending
                    </p>
                  )}
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

        {/* actions */}
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {canMarkReady ? (
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
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <Button
                    className="w-full shadow-md font-medium text-sm text-white hover:opacity-90"
                    style={{ backgroundColor: '#4f46e5' }}
                    onClick={() => markBatchProcessed(order)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2 shrink-0" /> Mark Batch Processed
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent className="text-xs max-w-[220px]">
                <p>Is batch ko process karen. Final Bill aur Delivery tamam batches complete hone par hogi.</p>
                <p className="mt-1">Remaining: {(order.siblings || []).filter(s => s.status !== 'ready' && s.status !== 'batch_ready').length} batch(es) pending</p>
              </TooltipContent>
            </Tooltip>
          )}

          {(isHeavy || parseFloat(order.total_weight_kg || 0) >= 15) && !isSplitBatch && order.status !== 'split_parent' && (
            <Button
              variant="outline"
              className="w-full border-2 border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 shadow-sm font-medium text-sm animate-pulse"
              onClick={() => openSplitModal(order)}
            >
              <SplitSquareHorizontal className="h-4 w-4 mr-2 shrink-0" />
              Split Order
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full border-2 border-orange-200 text-orange-700 hover:bg-orange-50 shadow-sm font-medium text-sm"
            onClick={() => moveToTomorrow(order)}
            disabled={overriding === order.id}
          >
            {overriding === order.id ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" /> Moving...</>
            ) : (
              <><CalendarClock className="h-4 w-4 mr-2 shrink-0" /> Push to Tomorrow</>
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
};

export default OrderProcessCard;
