import React from "react";
import { Badge } from "../../common/badge";
import { Clock, Loader2, Package, Truck, CheckCircle, MapPin, Wheat } from "lucide-react";

export const DeliveryStatusBadge = ({ status, t = (s) => s }) => {
  const base = "rounded-full px-2.5 py-0.5 text-xs inline-flex items-center gap-1.5 transition-all shadow-xs";
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className={`${base} font-medium bg-amber-50 border-amber-200 text-amber-800`}>
          <Clock className="h-3.5 w-3.5 shrink-0 text-amber-700" />
          {t("Pending")}
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="outline" className={`${base} font-semibold bg-blue-50 border-blue-200 text-blue-700`}>
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-blue-700" />
          {t("Processing")}
        </Badge>
      );
    case "ready":
      return (
        <Badge variant="outline" className={`${base} font-bold bg-emerald-50 border-emerald-200 text-emerald-700`}>
          <Package className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
          {t("Ready for Pickup")}
        </Badge>
      );
    case "delivery_assigned":
      return (
        <Badge variant="outline" className={`${base} font-bold bg-blue-50 border-blue-200 text-blue-700`}>
          <Truck className="h-3.5 w-3.5 shrink-0 text-blue-700" />
          {t("Ready for Delivery")}
        </Badge>
      );
    case "out-for-delivery":
      return (
        <Badge variant="outline" className={`${base} font-bold animate-pulse bg-indigo-100 border-indigo-200 text-indigo-700`}>
          <Truck className="h-3.5 w-3.5 shrink-0 text-indigo-700" />
          {t("Out for Delivery")}
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="outline" className={`${base} font-semibold bg-teal-50 border-teal-200 text-teal-700`}>
          <CheckCircle className="h-3.5 w-3.5 shrink-0 text-teal-700" />
          {t("Completed")}
        </Badge>
      );
    case "pickup_assigned":
      return (
        <Badge variant="outline" className={`${base} font-bold bg-orange-50 border-orange-100 text-orange-600`}>
          <MapPin className="h-3.5 w-3.5 shrink-0 text-orange-600" />
          {t("Pickup Assigned")}
        </Badge>
      );
    case "coming_for_pickup":
      return (
        <Badge variant="outline" className={`${base} font-bold animate-pulse bg-cyan-50 border-cyan-100 text-cyan-600`}>
          <Truck className="h-3.5 w-3.5 shrink-0 text-cyan-600" />
          {t("Coming for Pickup")}
        </Badge>
      );
    case "arrived_at_shop":
      return (
        <Badge variant="outline" className={`${base} font-bold bg-violet-50 border-violet-200 text-violet-700`}>
          <Wheat className="h-3.5 w-3.5 shrink-0 text-violet-700" />
          {t("Arrived at Shop")}
        </Badge>
      );
    default:
      return <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-medium">{status}</Badge>;
  }
};

export default DeliveryStatusBadge;
