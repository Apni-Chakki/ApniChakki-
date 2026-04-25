import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { format } from "date-fns";
import { Phone, MapPin, User } from "lucide-react";

export function OrdersTable({ orders, actions }) {
  
  // Safety check: If orders is null/undefined, show empty state
  if (!orders || orders.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No orders found.</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              {/* Order ID & Date */}
              <TableCell>
                <div className="font-medium">#{order.id}</div>
                <div className="text-xs text-muted-foreground">
                  {/* Safely format date */}
                  {order.createdAt ? format(new Date(order.createdAt), "MMM d, h:mm a") : "Date N/A"}
                </div>
              </TableCell>

              {/* Customer Details */}
              <TableCell>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 font-medium">
                    <User className="h-3 w-3 text-muted-foreground" />
                    {/* Handle both flat 'customerName' and nested 'customer.name' */}
                    {order.customerName || order.customer?.name || "Unknown"}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {order.phone || order.customer?.phone || "N/A"}
                  </div>
                  {order.deliveryAddress && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate max-w-[150px]" title={order.deliveryAddress}>
                        {order.deliveryAddress}
                      </span>
                    </div>
                  )}
                </div>
              </TableCell>

              {/* Order Items */}
              <TableCell>
                <div className="flex flex-col gap-1">
                  {order.items && order.items.map((item, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium">{item.quantity}x</span>{" "}
                      {/* Safety Check: Check service.name, or item.name, or fallback */}
                      {item.service?.name || item.name || "Unknown Item"}
                    </div>
                  ))}
                </div>
              </TableCell>

              {/* Total Amount */}
              <TableCell>
                <div className="font-bold text-primary">
                  Rs. {parseFloat(order.total || 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                  {order.paymentMethod || "COD"}
                </div>
              </TableCell>

              {/* Status Badge */}
              <TableCell>
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

              {/* Action Buttons */}
              <TableCell className="text-right">
                {actions ? actions(order) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}