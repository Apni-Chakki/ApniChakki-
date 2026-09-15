import React from "react";
import { Card } from "../../../common/card";
import { Badge } from "../../../common/badge";
import { Truck, CheckCircle2 } from "lucide-react";
import { ActiveDriverCard } from "./ActiveDriverCard";

export const LiveTrackingSidebar = ({
  drivers = [],
  loading = false,
  completedDeliveries = [],
  driverETAs = {},
  routeProgress = {},
  nearDestination = {},
  liveCountdown = {},
  selectedOrder,
  getDriverColor,
  formatSpeed,
  fmtCountdown,
  focusDriver,
  copyTrackingLink,
}) => {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Truck className="h-4 w-4" /> Active Drivers ({drivers.length})
      </h3>

      {loading ? (
        <Card className="p-8 text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Loading...</p>
        </Card>
      ) : drivers.length === 0 ? (
        <Card className="p-8 text-center">
          <Truck className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm text-muted-foreground">No active deliveries</p>
        </Card>
      ) : (
        drivers.map((driver) => (
          <ActiveDriverCard
            key={driver.order_id}
            driver={driver}
            driverETAs={driverETAs}
            routeProgress={routeProgress}
            nearDestination={nearDestination}
            liveCountdown={liveCountdown}
            selectedOrder={selectedOrder}
            getDriverColor={getDriverColor}
            formatSpeed={formatSpeed}
            fmtCountdown={fmtCountdown}
            focusDriver={focusDriver}
            copyTrackingLink={copyTrackingLink}
          />
        ))
      )}

      {completedDeliveries.length > 0 && (
        <div className="mt-2">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" /> Recently Completed
          </h3>
          {completedDeliveries.map((d, i) => (
            <Card
              key={`${d.order_id}-${i}`}
              className="p-3 mb-2 bg-green-50/50 border-green-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs">
                    ✅
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{d.driver_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      #{d.order_id} • {d.customer_name}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] border-green-300 text-green-700">
                  {d.completed_at}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveTrackingSidebar;
