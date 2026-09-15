import React from "react";
import { Card, CardContent } from "../../../common/card";
import { Button } from "../../../common/button";
import { Badge } from "../../../common/badge";
import {
  Clock,
  User,
  Phone,
  MapPin,
  Truck,
  Weight,
  Timer,
  AlertTriangle,
  ArrowLeft,
  Trash2,
  Layers,
  SplitSquareHorizontal,
  Store,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../../../common/dropdown-menu";

export const TomorrowProcessingCard = ({
  order,
  overriding,
  moveToToday,
  activePersonnel = [],
  handleAssignPersonnel,
  openSplitModal,
  setCancelOrder,
  t = (s) => s,
}) => {
  const couponDiscount = parseFloat(order.coupon_discount || 0);
  const totalAmount = parseFloat(order.total_amount || 0) - couponDiscount;
  const isSplitBatch = Boolean(order.is_split_batch || order.parent_order_id);
  const isPickup = order.type === "pickup" || order.order_type === "pickup" || (
    order.shipping_address && (
      order.shipping_address.toLowerCase().includes("pickup") ||
      order.shipping_address.toLowerCase().includes("store") ||
      order.shipping_address.toLowerCase().includes("shop") ||
      order.shipping_address.toLowerCase().includes("self") ||
      order.shipping_address.toLowerCase().includes("collect")
    )
  );

  return (
    <Card className="border-l-[6px] shadow-sm hover:shadow-md transition-all border-t border-r border-b rounded-xl bg-white border-l-amber-500 overflow-hidden flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="p-3 sm:p-4 pb-3 bg-amber-50/40 border-b border-amber-100">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 flex-wrap text-slate-800">
                <span>Order #{order.id}</span>
                {isSplitBatch && (
                  <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px] px-1.5 py-0.5 font-bold uppercase flex items-center gap-1">
                    <Layers className="h-3 w-3" /> Batch {order.batch_index || 1}
                  </Badge>
                )}
                {isPickup ? (
                  <Badge variant="outline" className="text-purple-700 bg-purple-50 border-purple-200 text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Store className="h-3 w-3" /> Pickup
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Truck className="h-3 w-3" /> Delivery
                  </Badge>
                )}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span>{order.created_at ? new Date(order.created_at).toLocaleString() : "Recently"}</span>
              </p>
            </div>
            <div className="bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 self-start sm:self-auto sm:text-right">
              <span className="text-base sm:text-lg font-bold text-slate-800">
                Rs. {Math.max(0, parseInt(totalAmount) || 0).toLocaleString()}
              </span>
              {couponDiscount > 0 && (
                <div className="text-[11px] text-emerald-600 font-medium">
                  -Rs. {couponDiscount.toLocaleString()} (Coupon)
                </div>
              )}
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                {order.payment_method || "COD"}
              </p>
            </div>
          </div>
        </div>

        <CardContent className="space-y-3.5 pt-3.5 px-3.5 sm:px-5">
          {/* Customer Info Box */}
          <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg space-y-1.5 text-xs sm:text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-900">{order.customer_name || "Guest Customer"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>{order.customer_phone || "No phone"}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{order.shipping_address || "Store Pickup"}</span>
            </div>
            {order.deliveryPersonnel && (
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 font-medium text-blue-700 text-xs">
                <Truck className="h-3.5 w-3.5 shrink-0" />
                <span>Assigned: {order.deliveryPersonnel}</span>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div>
            <h4 className="font-semibold mb-1 text-xs sm:text-sm text-slate-700">Order Items:</h4>
            <ul className="divide-y border border-slate-200 rounded-lg overflow-hidden bg-white">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, idx) => {
                  const name = item.name || item.product_name || item.prod_name || "Item";
                  const qty = parseFloat(item.quantity || 1);
                  const price = parseFloat(item.price_at_purchase ?? item.price ?? 0);
                  const itemTotal = isNaN(price * qty) ? 0 : price * qty;
                  const unit = item.unit || "kg";
                  
                  const custText = item.customizations && item.customizations.length > 0
                    ? item.customizations.map(c => c.option_name).join(" + ")
                    : (item.is_cleaning == 1 && item.is_grinding == 1 ? "Cleaning + Grinding" :
                       item.is_cleaning == 1 ? "Cleaning" :
                       item.is_grinding == 1 ? "Grinding" : "");

                  return (
                    <li key={idx} className="p-2 flex justify-between items-center text-xs sm:text-sm">
                      <div className="min-w-0 pr-2">
                        <div className="font-medium text-slate-900 truncate">
                          {name} <span className="text-muted-foreground font-normal ml-1">x{qty} {unit}</span>
                        </div>
                        {custText && (
                          <span className="text-[11px] text-amber-700 font-medium block">
                            {custText}
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-slate-800 shrink-0">
                        Rs. {Math.round(itemTotal).toLocaleString()}
                      </span>
                    </li>
                  );
                })
              ) : (
                <li className="p-2 text-xs text-muted-foreground italic">No item details</li>
              )}
            </ul>
          </div>

          {/* Weight & Processing Time Banner */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-amber-50/70 p-2 rounded-lg border border-amber-200">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Weight className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Weight: <strong className="text-slate-900">{parseFloat(order.total_weight_kg || 0).toFixed(1)} kg</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
              <Timer className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Est. Time: <strong className="text-slate-900">{order.processing_time_minutes || 0} mins</strong></span>
            </div>
          </div>

          {/* Schedule Note if any */}
          {order.schedule_note && (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
              <span>{order.schedule_note}</span>
            </div>
          )}
        </CardContent>
      </div>

      {/* Action Buttons */}
      <div className="p-3.5 sm:px-5 pt-2 pb-4 border-t border-slate-100 bg-slate-50/50 space-y-2 mt-2">
        <Button
          size="sm"
          onClick={() => moveToToday && moveToToday(order)}
          disabled={overriding === order.id}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm h-9 text-xs sm:text-sm"
        >
          {overriding === order.id ? (
            "Moving..."
          ) : (
            <>
              <ArrowLeft className="h-4 w-4 mr-2 shrink-0" /> Move to Today
            </>
          )}
        </Button>

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {!isPickup ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className={`w-full text-xs h-8 border-blue-200 text-blue-700 hover:bg-blue-50 font-medium px-1.5 truncate ${
                    order.deliveryPersonnel ? "bg-blue-50" : ""
                  }`}
                >
                  <Truck className="h-3.5 w-3.5 mr-1 shrink-0" />
                  <span className="truncate">{order.deliveryPersonnel ? order.deliveryPersonnel : "Driver"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel className="text-xs">Assign Driver</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {activePersonnel.length > 0 ? (
                  activePersonnel.map((person) => (
                    <DropdownMenuItem
                      key={person.id}
                      onSelect={() => handleAssignPersonnel && handleAssignPersonnel(order.id, person.name, person.phone)}
                      className="cursor-pointer text-xs"
                    >
                      <span>{person.name}</span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled className="text-xs">
                    No active drivers
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => handleAssignPersonnel && handleAssignPersonnel(order.id, "")}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer text-xs"
                >
                  Clear Driver
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled
              className="w-full text-xs h-8 opacity-60 border-purple-200 bg-purple-50/50 text-purple-700 px-1.5 truncate font-medium"
            >
              <Store className="h-3.5 w-3.5 mr-1 shrink-0" />
              <span className="truncate">Pickup</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs h-8 border-purple-200 text-purple-700 hover:bg-purple-50 font-medium px-1.5 truncate shadow-sm"
            onClick={() => openSplitModal && openSplitModal(order)}
          >
            <SplitSquareHorizontal className="h-3.5 w-3.5 mr-1 shrink-0" />
            <span className="truncate">Split</span>
          </Button>

          <Button
            size="sm"
            variant="destructive"
            className="w-full text-xs h-8 font-medium px-1.5 truncate shadow-sm"
            onClick={() => setCancelOrder && setCancelOrder(order)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1 shrink-0" />
            <span className="truncate">Cancel</span>
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TomorrowProcessingCard;
