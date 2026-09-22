import React from 'react';
import { Card } from '../../common/card';
import { Badge } from '../../common/badge';
import { Phone, MapPin, Navigation, Radio, CheckCircle, MessageCircle, Truck, Store, Package, Loader2 } from 'lucide-react';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';

export const DeliveryOrderCard = React.memo(({
  order,
  activeTracking = {},
  actionLoading = {},
  openMaps,
  handleCompleteDelivery,
  handleComingForPickup,
  generateWhatsAppLink,
  handleArrivedAtShopForPickup,
  handleStartDelivery,
  handleImComing,
  t = (s) => s,
}) => {
              const isStorePickup = order.orderType === 'pickup';
              const isPickupRequest = ['pickup_assigned', 'coming_for_pickup', 'arrived_at_shop'].includes(order.status) || order.total === 0;
              const isActionable = ['ready', 'delivery_assigned', 'out-for-delivery', 'pickup_assigned', 'coming_for_pickup'].includes(order.status);
              const isTracking = !!activeTracking[order.id];
              
              return (
                <Card 
                  key={order.id} 
                  className={`p-6 relative overflow-hidden transition-all duration-300 border border-slate-100 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-md hover:-translate-y-0.5 flex flex-col gap-4 ${
                    !isActionable
                      ? 'opacity-70 bg-gray-50'
                      : 'bg-white'
                  }`}
                >
                  {/* Left accent color strip */}
                  {isActionable && (
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${
                        isStorePickup
                          ? 'from-green-500 to-green-600'   // green = store pickup
                          : isPickupRequest
                            ? 'from-amber-400 to-orange-500' // orange = driver pickup
                            : 'from-blue-500 to-indigo-600'  // blue = delivery
                      }`}
                    />
                  )}

                  <div className="flex flex-col gap-4">
                    {/* Order Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-bold px-2.5 py-0.5 rounded-md border bg-slate-100 text-slate-600 border-slate-200">
                            #{order.id}
                          </span>
                          <DeliveryStatusBadge status={order.status} t={t} />
                          {isTracking && (
                            <Badge className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-bold tracking-wider animate-pulse border-none bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                              <Radio className="h-3 w-3 text-white" />
                              LIVE
                            </Badge>
                          )}
                        </div>

                        {/* Customer Avatar, Name & Mobile Number */}
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="rounded-full flex items-center justify-center font-bold text-sm shrink-0 border w-10 h-10 min-w-10 min-h-10 bg-gradient-to-br from-slate-50 to-slate-200 border-slate-300 text-slate-600">
                            {order.customerName ? order.customerName.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div className="flex flex-col">
                            <h3 className="font-bold text-base leading-tight m-0 text-slate-800">
                              {order.customerName}
                            </h3>
                            {order.phone ? (
                              <a
                                href={`tel:${order.phone}`}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline mt-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70 w-fit transition-colors"
                                title={t('Call Customer')}
                              >
                                <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                                <span className="font-mono tracking-wide">{order.phone}</span>
                              </a>
                            ) : (
                              <p className="text-[11px] font-bold leading-none mt-1 uppercase tracking-wider text-slate-400">
                                {t('Customer')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1.5">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] uppercase font-bold tracking-wider leading-none mb-1 text-slate-400">
                            {isPickupRequest ? t('Pickup Request') : t('Total Amount')}
                          </span>
                          <p className="text-xl font-extrabold leading-none m-0 text-slate-900 whitespace-nowrap">
                            {isPickupRequest ? (
                              parseFloat(order.delivery_fee || order.deliveryFee || 0) > 0 ? (
                                <>
                                  <span className="text-xs font-normal text-muted-foreground mr-1">TBD +</span>
                                  Rs. {parseFloat(order.delivery_fee || order.deliveryFee || 0).toLocaleString()}
                                </>
                              ) : (
                                'TBD'
                              )
                            ) : (
                              `Rs. ${(order.total || order.total_amount || 0).toLocaleString()}`
                            )}
                          </p>
                          {isPickupRequest && parseFloat(order.delivery_fee || order.deliveryFee || 0) > 0 && (
                            <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                              {t('Delivery Fee')}
                            </span>
                          )}
                        </div>
                        {(() => {
                          const deliveryFee = parseFloat(order.delivery_fee || order.deliveryFee || 0);
                          if (isPickupRequest) {
                            if (deliveryFee > 0) {
                              const isPaid = (order.paymentStatus === 'paid' || order.payment_status === 'paid');
                              if (isPaid) {
                                return (
                                  <Badge
                                    variant="outline"
                                    className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700 whitespace-nowrap"
                                  >
                                    {t('Fee Paid Online')}
                                  </Badge>
                                );
                              }
                              return (
                                <Badge
                                  variant="outline"
                                  className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-700 whitespace-nowrap"
                                >
                                  {t('Collect Delivery Fee')}: Rs. {deliveryFee.toLocaleString()}
                                </Badge>
                              );
                            }
                            return (
                              <Badge
                                variant="outline"
                                className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-slate-50 border-slate-200 text-slate-600"
                              >
                                {t('Free Pickup / TBD')}
                              </Badge>
                            );
                          }
                          const totalAmt = parseFloat(order.total || order.total_amount || 0);
                          const advPaid = parseFloat(order.advancePayment || order.amount_paid || 0);
                          const remDue = Math.max(0, totalAmt - advPaid);
                          const isPaid = (order.paymentStatus === 'paid' || order.payment_status === 'paid' || (totalAmt > 0 && advPaid >= totalAmt));

                          if (isPaid) {
                            return (
                              <Badge
                                variant="outline"
                                className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700"
                              >
                                {t('Paid Online')}
                              </Badge>
                            );
                          }

                          if (advPaid > 0 && remDue > 0) {
                            return (
                              <Badge
                                variant="outline"
                                className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-700"
                              >
                                {t('Collect')}: Rs. {remDue.toLocaleString()} ({t('Adv')}: Rs. {advPaid.toLocaleString()})
                              </Badge>
                            );
                          }

                          return (
                            <Badge
                              variant="outline"
                              className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-700"
                            >
                              {t('Collect Cash')}: Rs. {remDue > 0 ? remDue.toLocaleString() : totalAmt.toLocaleString()}
                            </Badge>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Address Block */}
                    <div className="flex p-4 rounded-xl border items-center justify-between gap-3 bg-stone-50 border-stone-200">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="rounded-full border flex items-center justify-center shrink-0 w-10 h-10 min-w-10 min-h-10 bg-red-100 border-red-300">
                          <MapPin className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-400">
                            {t('Delivery Address')}
                          </span>
                          <p className="text-sm font-semibold leading-snug break-words m-0 text-slate-700">
                            {order.deliveryAddress || t('No address provided')}
                          </p>
                        </div>
                      </div>

                      {isActionable && (
                        <div className="flex items-center gap-2 shrink-0 ml-1">
                          <button
                            className="rounded-full bg-white border flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer w-9 h-9 min-w-9 min-h-9 border-slate-200 text-blue-600 p-0"
                            onClick={() => openMaps(order.deliveryAddress || '')}
                            title={t('Navigate')}
                          >
                            <Navigation className="h-4.5 w-4.5 text-blue-600" />
                          </button>
                          {order.phone && (
                            <button
                              className="rounded-full bg-white border flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer w-9 h-9 min-w-9 min-h-9 border-slate-200 text-slate-600 p-0"
                              onClick={() => window.open(`tel:${order.phone}`, '_self')}
                              title={t('Call Customer')}
                            >
                              <Phone className="h-4.5 w-4.5 text-slate-600" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {isActionable && (
                      <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">

                        {/* STORE PICKUP: Customer comes to shop — only Complete button */}
                        {isStorePickup ? (
                          <>
                            <div className="w-full text-center text-xs font-semibold rounded-xl py-2 border flex items-center justify-center gap-2 bg-green-50 border-green-200 text-green-700">
                              <Package className="h-4 w-4 text-green-700" />
                              {t('Customer will collect from store')}
                            </div>
                            {order.status === 'ready' && (
                              <button
                                className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-base font-bold text-white transition-all duration-200 cursor-pointer active:scale-[0.98] shadow-sm hover:shadow-md bg-gradient-to-br from-green-500 to-green-700 border-none px-6"
                                onClick={() => handleCompleteDelivery(order)}
                              >
                                <CheckCircle className="h-5 w-5 animate-pulse text-white" />
                                {t('Mark as Collected')}
                              </button>
                            )}
                          </>

                        ) : isPickupRequest ? (
                          <>
                            {/* Status: pickup_assigned — I'm Coming button */}
                            {order.status === 'pickup_assigned' && (
                              <button
                                className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-white transition-all duration-200 cursor-pointer active:scale-[0.98] shadow-sm hover:shadow-md bg-gradient-to-br from-blue-500 to-blue-700 border-none px-6 disabled:opacity-60 disabled:cursor-not-allowed"
                                onClick={() => handleComingForPickup(order)}
                                disabled={Boolean(actionLoading[order.id])}
                              >
                                {actionLoading[order.id] === 'coming' ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                                ) : (
                                  <Navigation className="h-4 w-4 text-white" />
                                )}
                                {t("I'm coming")}
                              </button>
                            )}

                            {/* Status: coming_for_pickup — WhatsApp Share + Mark as Arrived */}
                            {order.status === 'coming_for_pickup' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {/* WhatsApp Share button */}
                                {order.phone && (
                                  <button
                                    className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold border transition-all duration-200 cursor-pointer active:scale-[0.98] border-emerald-500 text-emerald-700 bg-emerald-50 px-4"
                                    onClick={() => {
                                      const url = generateWhatsAppLink(order);
                                      window.open(url, '_blank');
                                    }}
                                  >
                                    <MessageCircle className="h-4 w-4 text-emerald-700" />
                                    {t('WhatsApp Update')}
                                  </button>
                                )}

                                {/* Mark as Arrived at Shop */}
                                <button
                                  className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all duration-200 cursor-pointer active:scale-[0.98] shadow-sm hover:shadow-md col-span-1 sm:col-span-1 bg-gradient-to-br from-teal-600 to-teal-700 border-none px-4 disabled:opacity-60 disabled:cursor-not-allowed"
                                  onClick={() => handleArrivedAtShopForPickup(order)}
                                  disabled={Boolean(actionLoading[order.id])}
                                >
                                  {actionLoading[order.id] === 'arrived' ? (
                                    <Loader2 className="h-4.5 w-4.5 animate-spin text-white" />
                                  ) : (
                                    <CheckCircle className="h-4.5 w-4.5 text-white" />
                                  )}
                                  {t('Mark as Arrived')}
                                </button>
                              </div>
                            )}

                            {/* Status: arrived_at_shop — info block */}
                            {order.status === 'arrived_at_shop' && (
                              <div className="w-full text-center text-sm font-semibold rounded-xl py-3 border shadow-2xs flex items-center justify-center gap-2 bg-teal-50 border-teal-100 text-teal-700">
                                <CheckCircle className="h-4.5 w-4.5 animate-bounce text-teal-700" />
                                {t('Arrived at Shop — Admin processing')}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {order.status !== 'out-for-delivery' ? (
                              <button
                                className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-white transition-all duration-200 cursor-pointer active:scale-[0.98] shadow-sm hover:shadow-md bg-gradient-to-br from-blue-500 to-blue-700 border-none px-6 disabled:opacity-60 disabled:cursor-not-allowed"
                                onClick={() => handleStartDelivery(order)}
                                disabled={Boolean(actionLoading[order.id])}
                              >
                                {actionLoading[order.id] === 'start' ? (
                                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                                ) : (
                                  <Truck className="h-5 w-5 text-white" />
                                )}
                                {t('Start Delivery')}
                              </button>
                            ) : (
                              <div className="flex flex-col gap-2">
                                <div className="grid grid-cols-2 gap-2">
                                  {order.phone && (
                                    <button
                                      className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold border transition-all duration-200 cursor-pointer active:scale-[0.98] border-emerald-500 text-emerald-700 bg-emerald-50 px-2"
                                      onClick={() => {
                                        const url = generateWhatsAppLink(order);
                                        window.open(url, '_blank');
                                      }}
                                    >
                                      <MessageCircle className="h-4 w-4 text-emerald-700" />
                                      {t('WhatsApp Update')}
                                    </button>
                                  )}
                                  <button
                                    className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-200 cursor-pointer active:scale-[0.98] bg-slate-100 text-slate-700 border-none px-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                    onClick={() => handleImComing(order)}
                                    disabled={Boolean(actionLoading[order.id])}
                                  >
                                    {actionLoading[order.id] === 'coming' ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
                                    ) : (
                                      <Navigation className="h-4 w-4 text-slate-600" />
                                    )}
                                    {t("I'm coming")}
                                  </button>
                                </div>
                                <button
                                  className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-base font-bold text-white transition-all duration-200 cursor-pointer active:scale-[0.98] shadow-sm hover:shadow-md mt-1 bg-gradient-to-br from-emerald-500 to-emerald-600 border-none px-6 disabled:opacity-60 disabled:cursor-not-allowed"
                                  onClick={() => handleCompleteDelivery(order)}
                                  disabled={Boolean(actionLoading[order.id])}
                                >
                                  {actionLoading[order.id] === 'complete' ? (
                                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                                  ) : (
                                    <CheckCircle className="h-5 w-5 animate-pulse text-white" />
                                  )}
                                  {t('Mark as Delivered')}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
  );
});

export default DeliveryOrderCard;

