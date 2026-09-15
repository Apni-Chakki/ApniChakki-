import React from "react";
import { Card } from "../../../common/card";
import { Badge } from "../../../common/badge";
import { Button } from "../../../common/button";
import {
  Zap,
  Radio,
  Clock,
  MapPin,
  Phone,
  Route,
  Link2,
  Navigation,
} from "lucide-react";

export const ActiveDriverCard = ({
  driver,
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
  const orderId = String(driver.order_id);
  const etaInfo = driverETAs[orderId];
  const progress = routeProgress[orderId];
  const isNear = nearDestination[orderId];
  const countdown = liveCountdown[orderId];
  const colorObj = getDriverColor ? getDriverColor(orderId) : { main: "#8b5cf6" };
  const color = colorObj.main;
  const speed = formatSpeed ? formatSpeed(parseFloat(driver.speed || 0)) : null;
  const isSelected = String(selectedOrder) === orderId;

  return (
    <Card
      key={driver.order_id}
      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "ring-2 ring-purple-500 bg-purple-50/50" : "hover:bg-secondary/50"
      }`}
      onClick={() => focusDriver && focusDriver(driver)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: color }}
          >
            {driver.driver_name?.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-sm">{driver.driver_name}</p>
            <p className="text-xs text-muted-foreground">Order #{driver.order_id}</p>
          </div>
        </div>
        <div className="flex gap-1">
          {isNear && (
            <Badge className="bg-green-500 text-white text-[10px] animate-pulse">
              <Zap className="h-2.5 w-2.5 mr-0.5" />
              Near!
            </Badge>
          )}
          <Badge className="bg-red-500 text-white text-[10px] animate-pulse">
            <Radio className="h-2.5 w-2.5 mr-0.5" />
            LIVE
          </Badge>
        </div>
      </div>

      {etaInfo && (
        <div
          className="rounded-xl p-2.5 mb-2"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}
        >
          <div className="flex justify-between text-xs">
            <div>
              <p className="text-muted-foreground">ETA</p>
              <p className="font-bold" style={{ color }}>
                {etaInfo.eta}
              </p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Distance</p>
              <p className="font-bold">{etaInfo.distance}</p>
            </div>
            {countdown !== undefined && (
              <div className="text-right">
                <p className="text-muted-foreground">Left</p>
                <p className="font-mono font-bold text-orange-600">
                  {fmtCountdown ? fmtCountdown(countdown) : countdown}
                </p>
              </div>
            )}
          </div>
          {etaInfo.arrivalTime && (
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color }}>
              <Clock className="h-3 w-3" /> Arrives at <strong>{etaInfo.arrivalTime}</strong>
            </p>
          )}
        </div>
      )}

      {progress && (
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-bold" style={{ color }}>
              {progress.pct}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress.pct}%`, background: color }}
            />
          </div>
        </div>
      )}

      {speed && (
        <p className="text-xs text-amber-600 flex items-center gap-1 mb-2">
          <Zap className="h-3 w-3" />
          {speed}
        </p>
      )}

      <div className="bg-background rounded-lg px-3 py-2 border text-xs space-y-0.5 mb-2">
        <p className="flex items-center gap-1.5 truncate">
          <MapPin className="h-3 w-3 text-red-400 shrink-0" />
          {driver.shipping_address?.substring(0, 45) || "N/A"}
        </p>
        {driver.customer_phone && (
          <p className="flex items-center gap-1.5">
            <Phone className="h-3 w-3 text-blue-400" />
            {driver.customer_phone}
          </p>
        )}
        <p className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3 w-3" />
          Last: {new Date(driver.created_at).toLocaleTimeString()}
        </p>
      </div>

      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs h-7 gap-1"
          onClick={(e) => {
            e.stopPropagation();
            if (focusDriver) focusDriver(driver);
          }}
        >
          <Route className="h-3 w-3" />
          Route
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs h-7 gap-1"
          onClick={(e) => {
            e.stopPropagation();
            if (copyTrackingLink) copyTrackingLink(driver.order_id);
          }}
        >
          <Link2 className="h-3 w-3" />
          Link
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7 px-2"
          onClick={(e) => {
            e.stopPropagation();
            window.open(
              `https://www.google.com/maps?q=${driver.latitude},${driver.longitude}`,
              "_blank"
            );
          }}
        >
          <Navigation className="h-3 w-3" />
        </Button>
        {driver.customer_phone && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 px-2"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`tel:${driver.customer_phone}`);
            }}
          >
            <Phone className="h-3 w-3" />
          </Button>
        )}
      </div>
    </Card>
  );
};

export default ActiveDriverCard;
