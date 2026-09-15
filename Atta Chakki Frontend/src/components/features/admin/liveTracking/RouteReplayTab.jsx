import React from "react";
import { Card } from "../../../common/card";
import { Badge } from "../../../common/badge";
import { Button } from "../../../common/button";
import { History, Play, Pause, RotateCcw, SkipForward } from "lucide-react";

export const RouteReplayTab = ({
  replayMapContainerRef,
  replayTrail = [],
  replayPlaying = false,
  startReplay,
  pauseReplay,
  resetReplay,
  replayIdx = 0,
  replaySpeed = 1,
  setReplaySpeed,
  replayOrderId = "",
  setReplayOrderId,
  fetchReplay,
  replayLoading = false,
  drivers = [],
  completedDeliveries = [],
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full min-w-0">
      <div className="lg:col-span-2 min-w-0">
        <Card className="overflow-hidden gap-0">
          <div className="px-4 py-2.5 border-b flex items-center gap-2 bg-purple-50/50">
            <History className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-semibold">Delivery History Replay</span>
            {replayTrail.length > 0 && (
              <Badge className="ml-auto bg-purple-600 text-white text-xs">
                {replayTrail.length} GPS points
              </Badge>
            )}
          </div>
          <div
            ref={replayMapContainerRef}
            className="relative w-full z-0 overflow-hidden"
            style={{
              height: "min(540px, 60vh)",
              minHeight: "340px",
              width: "100%",
              background: "#f8fafc",
            }}
          />
          {/* Playback progress */}
          {replayTrail.length > 0 && (
            <div className="border-t px-4 py-3 bg-muted/20">
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant={replayPlaying ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={replayPlaying ? pauseReplay : startReplay}
                >
                  {replayPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={resetReplay}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <div className="flex-1 mx-2">
                  <div className="h-2 bg-muted rounded-full relative">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{
                        width: `${
                          replayTrail.length > 0
                            ? (replayIdx / (replayTrail.length - 1)) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {replayIdx + 1} / {replayTrail.length}
                </span>
                <div className="flex items-center gap-1 border rounded-lg px-2 py-1">
                  <SkipForward className="h-3 w-3 text-muted-foreground" />
                  {[1, 2, 5, 10].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`text-xs px-1.5 py-0.5 rounded transition-all ${
                        replaySpeed === s ? "bg-purple-500 text-white" : "hover:bg-muted"
                      }`}
                      onClick={() => setReplaySpeed && setReplaySpeed(s)}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
              {replayTrail[replayIdx] && (
                <p className="text-[10px] text-muted-foreground">
                  📍 {replayTrail[replayIdx].lat.toFixed(5)}, {replayTrail[replayIdx].lng.toFixed(5)}
                  {replayTrail[replayIdx].created_at &&
                    ` • ${new Date(replayTrail[replayIdx].created_at).toLocaleTimeString()}`}
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
      <div className="space-y-3">
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <History className="h-4 w-4" /> Load Delivery
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Order ID
              </label>
              <div className="flex gap-2">
                <input
                  value={replayOrderId}
                  onChange={(e) => setReplayOrderId && setReplayOrderId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchReplay && fetchReplay()}
                  className="flex-1 h-9 px-3 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="e.g. 121"
                />
                <Button
                  size="sm"
                  className="h-9 gap-1"
                  onClick={() => fetchReplay && fetchReplay()}
                  disabled={replayLoading}
                >
                  {replayLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Quick select active drivers */}
            {drivers.length > 0 && (
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1.5 block">
                  Active Orders (Click to Replay):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {drivers.map((d) => (
                    <button
                      key={d.order_id}
                      type="button"
                      onClick={() => {
                        if (setReplayOrderId) setReplayOrderId(String(d.order_id));
                        if (fetchReplay) fetchReplay(d.order_id);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-all flex items-center gap-1.5 ${
                        String(replayOrderId) === String(d.order_id)
                          ? "bg-purple-100 border-purple-400 text-purple-800 font-semibold"
                          : "bg-muted/40 hover:bg-purple-50 hover:border-purple-300"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      #{d.order_id} ({d.driver_name})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick select recently completed deliveries */}
            {completedDeliveries.length > 0 && (
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1.5 block">
                  Recent Deliveries:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {completedDeliveries.slice(0, 5).map((d) => (
                    <button
                      key={d.order_id}
                      type="button"
                      onClick={() => {
                        if (setReplayOrderId) setReplayOrderId(String(d.order_id));
                        if (fetchReplay) fetchReplay(d.order_id);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-all flex items-center gap-1.5 ${
                        String(replayOrderId) === String(d.order_id)
                          ? "bg-purple-100 border-purple-400 text-purple-800 font-semibold"
                          : "bg-muted/40 hover:bg-purple-50 hover:border-purple-300"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      #{d.order_id} ({d.customer_name?.split(" ")[0] || "Order"})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-muted/30 rounded-lg p-3 text-xs space-y-1 text-muted-foreground">
              <p className="font-semibold text-foreground">How to use:</p>
              <p>1. Enter an Order ID above or pick a delivery</p>
              <p>2. Press Play or Enter to load GPS trail</p>
              <p>3. Use playback controls to replay path</p>
              <p>4. Change speed with 1x/2x/5x/10x</p>
            </div>

            {replayTrail.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-1 text-xs">
                <p className="font-semibold text-purple-800">Trail Loaded ✓</p>
                <p>
                  Total points: <strong>{replayTrail.length}</strong>
                </p>
                {replayTrail[0]?.created_at && (
                  <p>
                    Start: <strong>{new Date(replayTrail[0].created_at).toLocaleString()}</strong>
                  </p>
                )}
                {replayTrail[replayTrail.length - 1]?.created_at && (
                  <p>
                    End:{" "}
                    <strong>
                      {new Date(
                        replayTrail[replayTrail.length - 1].created_at
                      ).toLocaleString()}
                    </strong>
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RouteReplayTab;
