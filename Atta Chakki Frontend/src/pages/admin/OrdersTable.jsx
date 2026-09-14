import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/common/table";
import { Badge } from "../../components/common/badge";
import { format } from "date-fns";
import { Phone, MapPin, User } from "lucide-react";

export function OrdersTable({ orders, actions }) {

  if (!orders || orders.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No orders found.</div>;
  }

  return (
    <>
      {/* Mobile: card list (below sm breakpoint) */}
      <div className="sm:hidden space-y-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className="rounded-xl border shadow-sm p-4 space-y-3"
            style={{ background: '#ffffff' }}
          >
            {/* Order ID + Date */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
              <span className="font-bold text-foreground">#{order.id}</span>
              <span className="text-xs text-muted-foreground">
                {order.createdAt ? format(new Date(order.createdAt), "MMM d, h:mm a") : "Date N/A"}
              </span>
            </div>

            {/* Customer */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="break-words">{order.customerName || order.customer?.name || "Unknown"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3 w-3 shrink-0" />
                <span className="break-all">{order.phone || order.customer?.phone || "N/A"}</span>
              </div>
              {order.deliveryAddress && (
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                  <span className="break-words">{order.deliveryAddress}</span>
                </div>
              )}
            </div>

            {/* Items */}
            {order.items && order.items.length > 0 && (
              <div className="border-t border-border pt-2 space-y-0.5">
                {order.items.map((item, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium">{item.quantity}x</span>{" "}
                    {item.service?.name || item.name || "Unknown Item"}
                  </div>
                ))}
              </div>
            )}

            {/* Total + Payment + Status */}
            <div className="border-t border-border pt-2 flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="font-bold text-primary text-base">
                  Rs. {parseFloat(order.total || 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-muted-foreground capitalize">
                  {order.paymentMethod || "COD"}
                </div>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <Badge
                  variant={
                    order.status === "completed" ? "success" :
                    order.status === "cancelled" ? "destructive" :
                    order.status === "processing" ? "default" : "secondary"
                  }
                  className="capitalize"
                >
                  {order.status}
                </Badge>
                {order.deliveryPersonnel && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                    🚚 {order.deliveryPersonnel}
                  </span>
                )}
              </div>
            </div>

            {/* Action */}
            {actions && (
              <div className="pt-1 [&>button]:w-full [&>a]:w-full">
                {actions(order)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: responsive table (sm and above) */}
      <div className="hidden sm:block rounded-xl border shadow-sm overflow-x-auto" style={{ background: '#ffffff' }}>
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="px-3 sm:px-4 md:px-5 py-3.5 whitespace-nowrap">Order ID</TableHead>
              <TableHead className="px-3 sm:px-4 md:px-5 py-3.5 whitespace-nowrap">Customer</TableHead>
              <TableHead className="px-3 sm:px-4 md:px-5 py-3.5">Items</TableHead>
              <TableHead className="px-3 sm:px-4 md:px-5 py-3.5 whitespace-nowrap">Total</TableHead>
              <TableHead className="px-3 sm:px-4 md:px-5 py-3.5 whitespace-nowrap">Status</TableHead>
              <TableHead className="px-3 sm:px-4 md:px-5 py-3.5 text-right whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="px-3 sm:px-4 md:px-5 py-3.5 whitespace-nowrap">
                  <div className="font-medium">#{order.id}</div>
                  <div className="text-xs text-muted-foreground">
                    {order.createdAt ? format(new Date(order.createdAt), "MMM d, h:mm a") : "Date N/A"}
                  </div>
                </TableCell>

                <TableCell className="px-2 sm:px-3 md:px-4 py-3 min-w-[130px] max-w-[180px]">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 font-medium text-xs sm:text-sm">
                      <User className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[130px] sm:max-w-[160px]" title={order.customerName || order.customer?.name}>
                        {order.customerName || order.customer?.name || "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span className="truncate">{order.phone || order.customer?.phone || "N/A"}</span>
                    </div>
                    {order.deliveryAddress && (
                      <div className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[130px] sm:max-w-[160px]" title={order.deliveryAddress}>
                          {order.deliveryAddress}
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell className="px-2 sm:px-3 md:px-4 py-3 min-w-[120px] max-w-[180px]">
                  <div className="flex flex-col gap-0.5">
                    {order.items && order.items.map((item, index) => (
                      <div key={index} className="text-xs sm:text-sm truncate" title={item.service?.name || item.name}>
                        <span className="font-medium">{item.quantity}x</span>{" "}
                        <span className="truncate">{item.service?.name || item.name || "Unknown Item"}</span>
                      </div>
                    ))}
                  </div>
                </TableCell>

                <TableCell className="px-2 sm:px-3 md:px-4 py-3 whitespace-nowrap">
                  <div className="font-bold text-primary text-xs sm:text-sm">
                    Rs. {parseFloat(order.total || 0).toLocaleString()}
                  </div>
                  <div className="text-[11px] sm:text-xs text-muted-foreground capitalize">
                    {order.paymentMethod || "COD"}
                  </div>
                </TableCell>

                <TableCell className="px-2 sm:px-3 md:px-4 py-3">
                  <div className="flex flex-col gap-1 items-start">
                    <Badge
                      variant={
                        order.status === "completed" ? "success" :
                        order.status === "cancelled" ? "destructive" :
                        order.status === "processing" ? "default" : "secondary"
                      }
                      className="capitalize text-[10px] sm:text-xs px-2 py-0.5"
                    >
                      {order.status}
                    </Badge>
                    {order.deliveryPersonnel && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded flex items-center gap-1 truncate max-w-[120px]" title={order.deliveryPersonnel}>
                        <span className="shrink-0">🚚</span>
                        <span className="truncate">{order.deliveryPersonnel}</span>
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="px-2 sm:px-3 md:px-4 py-3 text-right">
                  <div className="flex items-center justify-end">
                    {actions ? actions(order) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
