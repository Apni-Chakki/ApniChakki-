import React from "react";
import { Button } from "../../../common/button";
import { Radio, Bell, RefreshCw } from "lucide-react";

export const LiveTrackingHeader = ({
  driversCount = 0,
  completedCount = 0,
  notifRef,
  notifOpen,
  setNotifOpen,
  unreadCount = 0,
  setUnreadCount,
  notifications = [],
  setNotifications,
  NOTIF_TYPES = {},
  socketConnected = false,
  fetchDriverLocations,
  TABS = [],
  activeTab,
  setActiveTab,
}) => {
  return (
    <>
      {/* Header + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2 truncate">
            <Radio className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 animate-pulse shrink-0" />
            <span className="truncate">Live Delivery Tracking</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {driversCount} active • {completedCount} completed today
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <Button
              variant="outline"
              size="sm"
              className="relative gap-1.5 h-8 px-2.5"
              onClick={() => {
                setNotifOpen((o) => !o);
                setUnreadCount(0);
              }}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
            {notifOpen && (
              <div className="absolute right-0 top-10 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-white border rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-2 border-b">
                  <p className="text-sm font-bold">Notifications</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setNotifications([])}
                  >
                    Clear all
                  </Button>
                </div>
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-2 px-3 py-2 border-b hover:bg-muted/30 text-xs ${
                        NOTIF_TYPES[n.type]?.color || ""
                      }`}
                    >
                      <span className="text-base shrink-0">{NOTIF_TYPES[n.type]?.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{NOTIF_TYPES[n.type]?.label}</p>
                        <p className="truncate">
                          {n.driverName} • Order #{n.orderId} {n.extra}
                        </p>
                        <p className="opacity-60">{n.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <span
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full h-8 ${
              socketConnected ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                socketConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500"
              }`}
            />
            {socketConnected ? "Real-time" : "Polling"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDriverLocations}
            className="gap-1 h-8 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Tab Bar - Horizontally scrollable on mobile */}
      <div className="w-full overflow-x-auto no-scrollbar pb-1">
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-max min-w-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-white shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon} {tab.label}
              {tab.id === "live" && driversCount > 0 && (
                <span className="w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {driversCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default LiveTrackingHeader;
