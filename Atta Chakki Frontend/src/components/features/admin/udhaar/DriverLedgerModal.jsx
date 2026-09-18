import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../common/dialog';
import { Button } from '../../../common/button';
import { Input } from '../../../common/input';
import { Badge } from '../../../common/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../common/table';
import { Truck, Phone, CheckCircle, Clock, PackageCheck, AlertCircle, Loader2, MapPin, DollarSign } from 'lucide-react';

export const DriverLedgerModal = ({
  selectedDriver,
  setSelectedDriver,
  driverPayAmount,
  setDriverPayAmount,
  showDriverPayConfirm,
  setShowDriverPayConfirm,
  selectedOrderForSettle,
  setSelectedOrderForSettle,
  isProcessingDriverPay,
  handleSettleDriverPayment,
  t = (s) => s,
}) => {
  return (
    <>
      <Dialog open={!!selectedDriver} onOpenChange={(open) => { 
        if(!open) {
          setSelectedDriver(null);
          setDriverPayAmount('');
          setSelectedOrderForSettle(null);
        }
      }}>
        <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl w-full p-4 sm:p-6 modal-sheet-dialog">
          <DialogHeader className="flex-shrink-0 border-b pb-3 text-left">
            <div className="flex items-start justify-between gap-2 pr-10 sm:pr-12">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-600 font-bold shrink-0">
                  <Truck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base sm:text-lg font-bold truncate">{selectedDriver?.driver_name}</DialogTitle>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" /> {selectedDriver?.driver_phone || 'No phone'}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">{t("Cash Due to Admin")}</p>
                <p className="text-base sm:text-lg font-extrabold text-amber-600 dark:text-amber-400">
                  Rs. {parseFloat(selectedDriver?.total_cash_due || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
            {/* Quick Settle All Card */}
            {selectedDriver?.total_cash_due > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 sm:p-4 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-amber-900 dark:text-amber-200">
                      {t("Receive Cash Handover from Rider")}
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      {t("Admin records COD collected by driver and marks orders as paid.")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs shrink-0 font-semibold w-full sm:w-auto shadow-xs"
                    onClick={() => {
                      setSelectedOrderForSettle(null);
                      setDriverPayAmount(String(selectedDriver.total_cash_due));
                      setShowDriverPayConfirm(true);
                    }}
                  >
                    {t("Settle Full Due (Rs. ")}{parseFloat(selectedDriver.total_cash_due || 0).toLocaleString()})
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-amber-500/20">
                  <Input
                    type="number"
                    placeholder={t("Or enter custom partial amount...")}
                    value={driverPayAmount}
                    onChange={(e) => setDriverPayAmount(e.target.value)}
                    className="h-9 text-xs flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 text-xs shrink-0 border-amber-500/40 text-amber-700 dark:text-amber-300 w-full sm:w-auto"
                    disabled={!driverPayAmount || parseFloat(driverPayAmount) <= 0}
                    onClick={() => {
                      setSelectedOrderForSettle(null);
                      setShowDriverPayConfirm(true);
                    }}
                  >
                    {t("Receive Custom Amount")}
                  </Button>
                </div>
              </div>
            )}

            {/* Assigned Orders List */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs sm:text-sm flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <PackageCheck className="h-4 w-4 text-primary" /> {t("Assigned Orders Breakdown")}
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  {selectedDriver?.orders?.length || 0} {t("Orders")}
                </span>
              </h4>

              {/* Mobile View: Order Cards */}
              <div className="sm:hidden space-y-2.5">
                {selectedDriver?.orders?.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">{t("No orders assigned to this driver yet.")}</p>
                ) : (
                  selectedDriver?.orders?.map((ord) => {
                    const isPaid = ord.payment_status === 'paid' || ord.cash_due <= 0;
                    return (
                      <div 
                        key={ord.order_id} 
                        className={`p-3 rounded-lg border border-border space-y-2.5 ${
                          isPaid ? 'bg-muted/20 opacity-75' : 'bg-card shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-xs font-bold bg-muted px-2 py-0.5 rounded">
                              #{ord.order_id}
                            </span>
                            <span className="text-[11px] text-muted-foreground ml-2">
                              {new Date(ord.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] px-1.5 py-0 capitalize ${
                                ord.status === 'completed' 
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                  : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                              }`}
                            >
                              {ord.status}
                            </Badge>
                            <Badge 
                              className={`text-[10px] px-1.5 py-0 capitalize ${
                                isPaid ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                              }`}
                            >
                              {isPaid ? t("Paid") : t("Unpaid COD")}
                            </Badge>
                          </div>
                        </div>

                        <div className="text-xs space-y-0.5">
                          <p className="font-semibold text-foreground">{ord.customer_name}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Phone className="h-2.5 w-2.5 shrink-0" /> {ord.customer_phone}
                          </p>
                          {ord.shipping_address && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5 shrink-0" /> {ord.shipping_address}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-border text-xs">
                          <div>
                            <span className="text-[10px] text-muted-foreground">{t("Total")}: </span>
                            <span className="font-medium">Rs. {ord.total_amount?.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground">{t("COD Due")}: </span>
                            <span className={`font-bold ${ord.cash_due > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
                              Rs. {ord.cash_due?.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {ord.cash_due > 0 ? (
                          <Button
                            size="sm"
                            className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                            onClick={() => {
                              setSelectedOrderForSettle(ord);
                              setDriverPayAmount(String(ord.cash_due));
                              setShowDriverPayConfirm(true);
                            }}
                          >
                            {t("Collect Cash (Rs. ")}{ord.cash_due?.toLocaleString()})
                          </Button>
                        ) : (
                          <div className="text-center text-xs text-emerald-600 font-semibold py-1 flex items-center justify-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5" /> {t("Settled & Cleared")}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden sm:block border border-border rounded-lg bg-card table-scroll-viewport">
                <Table className="min-w-[650px] w-full">
                  <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b">
                    <TableRow>
                      <TableHead className="text-xs px-3 py-2.5 whitespace-nowrap w-[90px]">{t("Order #")}</TableHead>
                      <TableHead className="text-xs px-3 py-2.5 min-w-[150px]">{t("Customer")}</TableHead>
                      <TableHead className="text-xs px-3 py-2.5 whitespace-nowrap w-[130px]">{t("Status")}</TableHead>
                      <TableHead className="text-xs px-3 py-2.5 whitespace-nowrap w-[90px]">{t("Total")}</TableHead>
                      <TableHead className="text-xs px-3 py-2.5 whitespace-nowrap w-[100px]">{t("COD Due")}</TableHead>
                      <TableHead className="text-xs px-4 py-2.5 text-right whitespace-nowrap min-w-[120px] pr-5">{t("Action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDriver?.orders?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">
                          {t("No orders assigned to this driver yet.")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedDriver?.orders?.map((ord) => {
                        const isPaid = ord.payment_status === 'paid' || ord.cash_due <= 0;
                        return (
                          <TableRow key={ord.order_id} className={isPaid ? 'opacity-70 bg-muted/20' : ''}>
                            <TableCell className="px-3 py-2 font-mono text-xs font-bold whitespace-nowrap">
                              #{ord.order_id}
                              <p className="text-[10px] text-muted-foreground font-normal">
                                {new Date(ord.created_at).toLocaleDateString()}
                              </p>
                            </TableCell>
                            <TableCell className="px-3 py-2 text-xs">
                              <p className="font-semibold truncate max-w-[160px]">{ord.customer_name}</p>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5 shrink-0" /> {ord.customer_phone}
                              </p>
                              {ord.shipping_address && (
                                <p className="text-[10px] text-muted-foreground truncate max-w-[180px] flex items-center gap-1" title={ord.shipping_address}>
                                  <MapPin className="h-2.5 w-2.5 shrink-0" /> {ord.shipping_address}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="px-3 py-2 whitespace-nowrap">
                              <div className="space-y-1">
                                <Badge 
                                  variant="outline" 
                                  className={`text-[10px] px-1.5 py-0 capitalize ${
                                    ord.status === 'completed' 
                                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                      : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                  }`}
                                >
                                  {ord.status}
                                </Badge>
                                <div>
                                  <Badge 
                                    className={`text-[10px] px-1.5 py-0 capitalize ${
                                      isPaid 
                                        ? 'bg-emerald-600 text-white' 
                                        : 'bg-amber-600 text-white'
                                    }`}
                                  >
                                    {isPaid ? t("Paid") : t("Unpaid COD")}
                                  </Badge>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-3 py-2 text-xs font-medium whitespace-nowrap">
                              Rs. {ord.total_amount?.toLocaleString()}
                            </TableCell>
                            <TableCell className="px-3 py-2 text-xs font-bold whitespace-nowrap">
                              {ord.cash_due > 0 ? (
                                <span className="text-amber-600 dark:text-amber-400">Rs. {ord.cash_due?.toLocaleString()}</span>
                              ) : (
                                <span className="text-emerald-600 font-normal">Rs. 0</span>
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-2 text-right whitespace-nowrap pr-5">
                              {ord.cash_due > 0 ? (
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 whitespace-nowrap shrink-0 shadow-xs"
                                  onClick={() => {
                                    setSelectedOrderForSettle(ord);
                                    setDriverPayAmount(String(ord.cash_due));
                                    setShowDriverPayConfirm(true);
                                  }}
                                >
                                  {t("Collect Cash")}
                                </Button>
                              ) : (
                                <span className="text-xs text-emerald-600 font-semibold flex items-center justify-end gap-1 whitespace-nowrap">
                                  <CheckCircle className="h-3.5 w-3.5 shrink-0" /> {t("Settled")}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => setSelectedDriver(null)} className="w-full sm:w-auto">{t("Close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Driver Cash Settlement Dialog */}
      <Dialog open={showDriverPayConfirm} onOpenChange={setShowDriverPayConfirm}>
        <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-md w-full p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-600" />
              {t("Confirm Driver Cash Handover")}
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              {selectedOrderForSettle ? (
                <div>
                  <p>{t("Record cash collected from rider")} <strong>{selectedDriver?.driver_name}</strong> {t("for order")} <strong>#{selectedOrderForSettle.order_id}</strong>:</p>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    Rs. {parseFloat(driverPayAmount || selectedOrderForSettle.cash_due || 0).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div>
                  <p>{t("Record lump-sum cash handover from rider")} <strong>{selectedDriver?.driver_name}</strong> {t("to clear pending COD orders")}:</p>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    Rs. {parseFloat(driverPayAmount || selectedDriver?.total_cash_due || 0).toLocaleString()}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDriverPayConfirm(false)} disabled={isProcessingDriverPay} className="w-full sm:w-auto">{t("Cancel")}</Button>
            <Button onClick={handleSettleDriverPayment} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto" disabled={isProcessingDriverPay}>
              {isProcessingDriverPay ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {isProcessingDriverPay ? t("Recording...") : t("Confirm & Update System")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
};

export default DriverLedgerModal;
