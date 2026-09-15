import React from 'react';
import { Card } from '../../../common/card';
import { Button } from '../../../common/button';
import { Pagination } from '../../../common/Pagination';
import { Package, MapPin, Loader2 } from 'lucide-react';

export const OrdersTab = ({
  orders = [],
  loading = false,
  ordersPage = 1,
  setOrdersPage,
  ordersPageSize = 5,
  setOrdersPageSize,
  getStatusColor,
  formatDate,
  setCancelOrder,
  t = (s) => s,
}) => {
  return (
    <>
            <div className="space-y-4">
              {loading ? (
                 <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>{t('Loading your orders...')}</p>
                 </div>
              ) : orders.length === 0 ? (
                <Card className="p-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="mb-2">{t('No orders yet')}</h3>
                  <p className="text-muted-foreground">{t('When you place an order, it will appear here')}</p>
                </Card>
              ) : (
                orders
                  .slice((ordersPage - 1) * ordersPageSize, ordersPage * ordersPageSize)
                  .map((order) => {
                  if (!order) return null;
                  const items = Array.isArray(order.items) ? order.items : [];
                  const hasPending = items.some(i => i?.isWeightPending);
                  const statusStr = String(order.status || 'pending').toUpperCase();
                  const paymentMethodStr = String(order.paymentMethod || 'cod').toUpperCase();
                  const totalAmount = Number(order.total) || 0;
                  const amountPaid = Number(order.amountPaid) || 0;

                  return (
                  <Card key={order.id} className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-foreground">{t('Order ID')}: {order.id}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                            {statusStr}
                          </span>
                        </div>
                        {order.status === 'cancelled' && order.cancelReason && (
                          <p className="text-sm text-red-600 font-medium mt-1">
                            {t('Reason:')} {order.cancelReason}
                            {order.cancelledBy && ` (${t('by')} ${order.cancelledBy})`}
                          </p>
                        )}
                        {order.paymentStatus === 'unpaid' && order.paymentRejectReason && (
                          <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                            <div className="flex items-start gap-2">
                              <span className="text-red-500 text-base mt-0.5">⚠️</span>
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-red-800 uppercase tracking-wider">
                                  {t('Payment Verification Failed')} / {t('ادائیگی کی تصدیق نامکمل')}
                                </p>
                                <p className="text-sm text-red-700">
                                  <strong>{t('Reason')} / {t('وجہ')}:</strong> {order.paymentRejectReason}
                                </p>
                                {order.paymentRejectDate && new Date(order.paymentRejectDate).toDateString() === new Date().toDateString() && (
                                  <div className="mt-2 inline-flex items-center gap-1.5 bg-red-600 text-white font-semibold text-[10px] px-2 py-0.5 rounded-full animate-bounce">
                                    <span>🔴</span>
                                    <span>PAYMENT REJECTED TODAY / ادائیگی آج ہی مسترد کی گئی ہے!</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground mt-2">{formatDate(order.createdAt)}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-sm text-muted-foreground">{t('Total Amount')}</p>
                        <p className="text-primary font-bold">
                          Rs. {totalAmount.toLocaleString()}
                          {hasPending && <span className="text-xs ml-1">(+ TBD)</span>}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4">
                      <h4 className="mb-3 text-sm font-semibold">{t('Order Items')}</h4>
                      <div className="space-y-2">
                        {items.map((item, index) => {
                          const itemName = item?.service?.name || t('Product Item');
                          const itemPrice = Number(item?.service?.price) || 0;
                          const itemQty = Number(item?.quantity) || 1;
                          return (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {itemName} <span className="text-foreground">x {itemQty}</span>
                              </span>
                              <span className="text-foreground">
                                {item?.isWeightPending ? (
                                  <span className="text-primary font-medium">{t('Pending Wt.')}</span>
                                ) : (
                                  `Rs. ${(itemPrice * itemQty).toLocaleString()}`
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {order.type === 'delivery' && (
                      <div className="border-t border-border pt-4 mt-4">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {order.deliveryAddress}
                        </p>
                      </div>
                    )}

                    <div className="border-t border-border pt-4 mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">{t('Payment')}</p>
                          <p className="text-sm font-medium">{paymentMethodStr}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{t('Status')}</p>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold mt-0.5 ${
                            order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                            order.paymentStatus === 'partial' ? 'bg-blue-100 text-blue-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {order.paymentStatus === 'paid' ? t('Paid') : 
                             order.paymentStatus === 'partial' ? t('Partial') : t('Unpaid')}
                          </span>
                          {amountPaid > 0 && order.paymentStatus !== 'paid' && (
                            <p className="text-xs text-green-600 mt-0.5">
                              {t('Paid:')} Rs. {amountPaid.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      {(order.status === 'pending') && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setCancelOrder(order)}
                        >
                          {t('Cancel Order')}
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
            </div>

            {orders.length > 0 && (
              <Pagination
                currentPage={ordersPage}
                totalItems={orders.length}
                pageSize={ordersPageSize}
                onPageChange={setOrdersPage}
                onPageSizeChange={(size) => {
                  setOrdersPageSize(size);
                  setOrdersPage(1);
                }}
                className="mt-4"
              />
            )}
          
    </>
  );
};

export default OrdersTab;

