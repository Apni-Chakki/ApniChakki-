import React from "react";
import { Card } from "../../../common/card";
import { Badge } from "../../../common/badge";
import { Button } from "../../../common/button";
import { Route, Layers, Zap, X, Trash2, CheckCircle2, ArrowRight } from "lucide-react";

export const RoutePlannerTab = ({
  plannerMapContainerRef,
  plannerResult,
  plannerOrders = [],
  plannerSelected = [],
  setPlannerSelected,
  plannerLoading = false,
  calculateOptimalRoute,
  onClearAll,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full min-w-0">
      <div className="lg:col-span-2 min-w-0">
        <Card className="overflow-hidden gap-0">
          <div className="px-4 py-2.5 border-b flex items-center gap-2 bg-blue-50/50">
            <Route className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold">Multi-Stop Route Optimizer</span>
            {plannerResult && (
              <Badge className="ml-auto bg-blue-600 text-white text-xs">
                {plannerResult.totalDist} km • {plannerResult.totalTime} min total
              </Badge>
            )}
          </div>
          <div
            ref={plannerMapContainerRef}
            className="relative w-full z-0 overflow-hidden"
            style={{
              height: "min(540px, 60vh)",
              minHeight: "340px",
              width: "100%",
              background: "#f8fafc",
            }}
          />
        </Card>
      </div>
      <div className="space-y-3">
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
            <Layers className="h-4 w-4" /> Select Stops (in order)
          </h3>
          <p className="text-[11px] text-muted-foreground mb-3">
            Only home delivery orders shown (Store pickups excluded)
          </p>
          {(() => {
            const deliveryOrders = (plannerOrders || []).filter((order) => {
              if (String(order.order_type || '').toLowerCase().includes('pickup')) return false;
              if (String(order.delivery_type || '').toLowerCase().includes('pickup')) return false;
              if (String(order.shipping_method || '').toLowerCase().includes('pickup')) return false;
              const addr = String(order.shipping_address || '').toLowerCase().trim();
              if (!addr) return false;
              if (
                addr.includes('pickup') ||
                addr.includes('store') ||
                addr.includes('shop') ||
                addr.includes('collect') ||
                addr.includes('self')
              ) {
                return false;
              }
              return true;
            });

            if (deliveryOrders.length === 0) {
              return (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No home delivery orders ready for routing
                </p>
              );
            }

            return (
              <div className="space-y-2 max-h-64 overflow-y-auto custom-modal-scrollbar pr-1.5">
                {deliveryOrders.map((order) => {
                  const sel = plannerSelected.find((s) => s.id === order.id);
                  const idx = plannerSelected.findIndex((s) => s.id === order.id);
                  return (
                    <div
                      key={order.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer hover:bg-muted/30 transition-all ${
                        sel ? "border-blue-400 bg-blue-50/60" : ""
                      }`}
                      onClick={() => {
                        if (sel) setPlannerSelected((p) => p.filter((s) => s.id !== order.id));
                        else setPlannerSelected((p) => [...p, order]);
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                        style={{
                          background: sel ? "#2563eb" : "#e2e8f0",
                          color: sel ? "white" : "#64748b",
                        }}
                      >
                        {sel ? idx + 1 : "+"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">
                          Order #{order.id} — {order.customer_name}
                        </p>
                        <p className="text-muted-foreground truncate">
                          {order.shipping_address?.substring(0, 50)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[9px] shrink-0">
                        {order.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <div className="mt-3 space-y-2">
            {plannerSelected.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-2 text-xs">
                <p className="font-semibold mb-1">{plannerSelected.length} stops selected:</p>
                <div className="max-h-36 overflow-y-auto custom-modal-scrollbar pr-1 space-y-1">
                  {plannerSelected.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-1 text-[11px] py-0.5">
                      <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                        {i + 1}
                      </span>
                      <span className="truncate">
                        Order #{s.id} — {s.customer_name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPlannerSelected((p) => p.filter((x) => x.id !== s.id))}
                        className="ml-auto text-red-400 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Button
              className="w-full gap-2"
              disabled={plannerSelected.length < 2 || plannerLoading}
              onClick={calculateOptimalRoute}
            >
              {plannerLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" /> Optimize Route ({plannerSelected.length} stops)
                </>
              )}
            </Button>
            {plannerSelected.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={onClearAll}
              >
                <Trash2 className="h-3 w-3 mr-1" /> Clear All
              </Button>
            )}
          </div>
        </Card>
        {plannerResult && (
          <Card className="p-4 bg-blue-50/50 border-blue-200">
            <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Optimized Route
            </h4>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-white rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Total Distance</p>
                <p className="font-bold text-blue-700">{plannerResult.totalDist} km</p>
              </div>
              <div className="bg-white rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Total Time</p>
                <p className="font-bold text-blue-700">{plannerResult.totalTime} min</p>
              </div>
            </div>
            <div className="space-y-1">
              {plannerResult.legs?.map((leg, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                    {i + 1}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{leg.end_address?.substring(0, 35)}</span>
                  <span className="text-muted-foreground shrink-0">{leg.duration?.text}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RoutePlannerTab;
