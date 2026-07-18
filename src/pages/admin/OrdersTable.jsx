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

      {/* Desktop: original table (sm and above) */}
      <div className="hidden sm:block rounded-xl border shadow-sm overflow-hidden" style={{ background: '#ffffff' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6 py-4">Order ID</TableHead>
              <TableHead className="px-6 py-4">Customer</TableHead>
              <TableHead className="px-6 py-4">Items</TableHead>
              <TableHead className="px-6 py-4">Total</TableHead>
              <TableHead className="px-6 py-4">Status</TableHead>
              <TableHead className="px-6 py-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="px-6 py-4">
                  <div className="font-medium">#{order.id}</div>
                  <div className="text-xs text-muted-foreground">
                    {order.createdAt ? format(new Date(order.createdAt), "MMM d, h:mm a") : "Date N/A"}
                  </div>
                </TableCell>

                <TableCell className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 font-medium">
                      <User className="h-3 w-3 text-muted-foreground" />
                      {order.customerName || order.customer?.name || "Unknown"}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {order.phone || order.customer?.phone || "N/A"}
                    </div>
                    {order.deliveryAddress && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[200px]" title={order.deliveryAddress}>
                          {order.deliveryAddress}
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    {order.items && order.items.map((item, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium">{item.quantity}x</span>{" "}
                        {item.service?.name || item.name || "Unknown Item"}
                      </div>
                    ))}
                  </div>
                </TableCell>

                <TableCell className="px-6 py-4">
                  <div className="font-bold text-primary">
                    Rs. {parseFloat(order.total || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {order.paymentMethod || "COD"}
                  </div>
                </TableCell>

                <TableCell className="px-6 py-4">
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
                </TableCell>

                <TableCell className="px-6 py-4 text-right">
                  {actions ? actions(order) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
