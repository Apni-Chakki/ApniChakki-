import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../common/dialog';
import { Button } from '../../../common/button';
import { Input } from '../../../common/input';
import { Label } from '../../../common/label';
import { Badge } from '../../../common/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../common/table';
import { User, Phone, CheckCircle, History, Loader2 } from 'lucide-react';

export const CustomerLedgerModal = ({
  selectedCustomer,
  setSelectedCustomer,
  customerPayAmount,
  setCustomerPayAmount,
  showCustomerPayDialog,
  setShowCustomerPayDialog,
  isProcessingCustomerPay,
  handleReceiveCustomerPayment,
  t = (s) => s,
}) => {
  return (
    <>
      <Dialog open={!!selectedCustomer} onOpenChange={(open) => { 
        if(!open) {
          setSelectedCustomer(null);
          setCustomerPayAmount('');
        }
      }}>
        <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-lg md:max-w-xl w-full flex flex-col p-4 sm:p-6" style={{ maxHeight: '90vh', overflow: 'hidden' }}>
          <DialogHeader className="flex-shrink-0 border-b pb-3 text-left">
            <div className="flex items-start justify-between gap-2 pr-10 sm:pr-12">
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground truncate">
                  {selectedCustomer?.name}
                </DialogTitle>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Phone className="h-3 w-3 shrink-0" /> {selectedCustomer?.phone}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">{t("Total Due")}</p>
                <p className="text-base sm:text-lg font-extrabold text-red-600 dark:text-red-400">
                  Rs. {parseFloat(selectedCustomer?.totalDebt || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
            {/* Payment Action */}
            <div className="bg-muted/40 p-3 sm:p-4 rounded-xl border border-border space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="payAmount" className="text-xs sm:text-sm font-semibold">{t("Receive Customer Payment")}</Label>
                <button 
                  type="button"
                  onClick={() => setCustomerPayAmount(String(selectedCustomer?.totalDebt || ''))}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  {t("Pay Full Due")}
                </button>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input
                  id="payAmount"
                  type="number"
                  placeholder={t("Enter amount...")}
                  value={customerPayAmount}
                  onChange={(e) => setCustomerPayAmount(e.target.value)}
                  className="w-full text-sm"
                  disabled={isProcessingCustomerPay}
                />
                <Button
                  onClick={() => setShowCustomerPayDialog(true)}
                  disabled={!customerPayAmount || parseFloat(customerPayAmount) <= 0 || isProcessingCustomerPay}
                  className="bg-green-600 hover:bg-green-700 text-white shrink-0 font-medium w-full sm:w-auto"
                >
                  <CheckCircle className="h-4 w-4 mr-1.5 text-white" />
                  {t("Settle Payment")}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t("This will automatically pay off oldest manual orders first (FIFO).")}
              </p>
            </div>

            {/* Order History */}
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center justify-between text-xs sm:text-sm">
                <span className="flex items-center gap-1.5">
                  <History className="h-4 w-4 text-primary" /> {t("Outstanding Orders History")}
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  {selectedCustomer?.orders?.length || 0} {t("Orders")}
                </span>
              </h4>

              {/* Mobile View: Order Cards */}
              <div className="sm:hidden space-y-2.5">
                {selectedCustomer?.orders?.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">{t("No outstanding orders found.")}</p>
                ) : (
                  selectedCustomer?.orders?.map(order => (
                    <div key={order.order_id} className="p-3 rounded-lg border border-border bg-card space-y-2 shadow-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-muted px-2 py-0.5 rounded">
                            #{order.order_id}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <Badge
                          variant={order.payment_status === 'pending' ? 'destructive' : 'secondary'}
                          className="capitalize text-[10px] px-2 py-0.5"
                        >
                          {order.payment_status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 py-1.5 px-2 bg-muted/40 rounded-md text-center text-xs">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase">{t("Total")}</p>
                          <p className="font-semibold text-foreground">Rs. {order.total?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase">{t("Paid")}</p>
                          <p className="font-semibold text-emerald-600">Rs. {(order.amount_paid || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase">{t("Due")}</p>
                          <p className="font-bold text-red-600">Rs. {(order.outstanding || order.total)?.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden sm:block border rounded-md overflow-x-auto" style={{ maxHeight: 'calc(85vh - 300px)', overflowY: 'auto' }}>
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background border-b">
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="px-3 py-2 text-xs">{t("Date")}</TableHead>
                      <TableHead className="px-3 py-2 text-xs">{t("#ID")}</TableHead>
                      <TableHead className="px-3 py-2 text-xs">{t("Total")}</TableHead>
                      <TableHead className="px-3 py-2 text-xs">{t("Paid")}</TableHead>
                      <TableHead className="px-3 py-2 text-xs">{t("Due")}</TableHead>
                      <TableHead className="px-3 py-2 text-xs">{t("Status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCustomer?.orders?.map(order => (
                      <TableRow key={order.order_id}>
                        <TableCell className="px-3 py-2 text-xs">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="px-3 py-2 font-mono text-xs">#{order.order_id}</TableCell>
                        <TableCell className="px-3 py-2 text-xs">Rs. {order.total?.toLocaleString()}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-green-600">Rs. {(order.amount_paid || 0).toLocaleString()}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-red-600 font-bold">Rs. {(order.outstanding || order.total)?.toLocaleString()}</TableCell>
                        <TableCell className="px-3 py-2">
                          <Badge
                            variant={order.payment_status === 'pending' ? 'destructive' : 'secondary'}
                            className="capitalize text-xs px-2 py-0.5"
                          >
                            {order.payment_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)} className="w-full sm:w-auto">{t("Close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Customer Payment Dialog */}
      <Dialog open={showCustomerPayDialog} onOpenChange={setShowCustomerPayDialog}>
        <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-md w-full p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{t("Confirm Customer Payment")}</DialogTitle>
            <DialogDescription className="pt-2">
              {t("Are you sure you want to receive")} <strong>Rs. {parseFloat(customerPayAmount || 0).toLocaleString()}</strong> {t("from")} <strong>{selectedCustomer?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowCustomerPayDialog(false)} disabled={isProcessingCustomerPay} className="w-full sm:w-auto">{t("Cancel")}</Button>
            <Button onClick={handleReceiveCustomerPayment} className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto" disabled={isProcessingCustomerPay}>
              {isProcessingCustomerPay ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {isProcessingCustomerPay ? t("Processing...") : t("Confirm & Update Ledger")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
    </>
  );
};

export default CustomerLedgerModal;

