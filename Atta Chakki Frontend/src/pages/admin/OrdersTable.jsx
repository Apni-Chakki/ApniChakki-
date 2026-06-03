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
    <div className="rounded-xl border shadow-sm overflow-hidden" style={{ background: '#ffffff' }}>
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
  );
}
