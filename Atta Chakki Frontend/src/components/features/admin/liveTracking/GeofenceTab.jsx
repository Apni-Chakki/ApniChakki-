import React from "react";
import { Card } from "../../../common/card";
import { Badge } from "../../../common/badge";
import { Shield } from "lucide-react";

export const GeofenceTab = ({
  geofenceMapContainerRef,
  geofenceEnabled,
  setGeofenceEnabled,
  geofenceRadius,
  setGeofenceRadius,
  storeAddress,
  shopCoords,
  drivers = [],
  computeDistanceBetween,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full min-w-0">
      <div className="lg:col-span-2 min-w-0">
        <Card className="overflow-hidden gap-0">
          <div className="px-4 py-2.5 border-b flex items-center gap-2 bg-purple-50/50">
            <Shield className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-semibold">Geofence Manager</span>
            <Badge
              className={`ml-auto text-xs ${
                geofenceEnabled ? "bg-green-500" : "bg-gray-400"
              } text-white`}
            >
              {geofenceEnabled ? "🟢 Active" : "⚫ Disabled"}
            </Badge>
          </div>
          <div
            ref={geofenceMapContainerRef}
            className="relative w-full z-0 overflow-hidden"
            style={{
              height: "min(540px, 60vh)",
              minHeight: "340px",
              width: "100%",
              background: "#f8fafc",
            }}
          />
          <div className="border-t px-4 py-2 bg-muted/20 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-4 h-4 rounded-full border-2 border-purple-500 bg-purple-500/10" />
            Geofence Zone
            <span className="ml-2">•</span>
            <div className="w-3 h-3 rounded-full bg-purple-500" /> Store Location
          </div>
        </Card>
      </div>
      <div className="space-y-3">
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" /> Geofence Settings
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Enable Monitoring</span>
              <button
                type="button"
                onClick={() => setGeofenceEnabled((e) => !e)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  geofenceEnabled ? "bg-purple-500" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    geofenceEnabled ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-xs font-semibold text-muted-foreground">Alert Radius</label>
                <span className="text-xs font-bold text-purple-700">
                  {(geofenceRadius / 1000).toFixed(1)} km
                </span>
              </div>
              <input
                type="range"
                min={500}
                max={20000}
                step={500}
                value={geofenceRadius}
                onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0.5 km</span>
                <span>20 km</span>
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-xs">
              <p className="font-semibold mb-1">Store Location</p>
              <p className="text-muted-foreground">{storeAddress || "Loading..."}</p>
              {shopCoords && (
                <p className="font-mono text-purple-700 mt-1">
                  {shopCoords.lat.toFixed(5)}, {shopCoords.lng.toFixed(5)}
                </p>
              )}
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-xs space-y-2">
              <p className="font-semibold">Active Drivers Status</p>
              {drivers.length === 0 ? (
                <p className="text-muted-foreground">No active drivers</p>
              ) : (
                drivers.map((d) => {
                  const pos = { lat: parseFloat(d.latitude), lng: parseFloat(d.longitude) };
                  const inZone =
                    shopCoords && computeDistanceBetween
                      ? computeDistanceBetween(shopCoords, pos) <= geofenceRadius
                      : true;
                  return (
                    <div key={d.order_id} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${inZone ? "bg-green-500" : "bg-red-500"}`} />
                      <span className="flex-1">
                        {d.driver_name} (#{d.order_id})
                      </span>
                      <span
                        className={
                          inZone ? "text-green-600 font-medium" : "text-red-600 font-medium"
                        }
                      >
                        {inZone ? "In Zone" : "⚠️ Outside!"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs">
              <p className="font-semibold text-yellow-800 mb-1">ℹ️ How Geofencing Works</p>
              <p className="text-yellow-700">
                When enabled, a notification appears if any driver goes outside the set radius from
                your store location. Checked every 15 seconds.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default GeofenceTab;
