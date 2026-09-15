import React from 'react';
import { Card } from '../../../common/card';
import { Pagination } from '../../../common/Pagination';
import { ImageWithFallback } from '../../../common/ImageWithFallback';
import { Package, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

export const RentalsTab = ({
  rentals = [],
  rentalsPage = 1,
  setRentalsPage,
  rentalsPageSize = 5,
  setRentalsPageSize,
  getRentalStatusColor,
  getDepositStatusColor,
  formatSimpleDate,
  t = (s) => s,
}) => {
  return (
    <>
            {/* Stats Overview */}
            {rentals.length > 0 && (
              <div className="flex flex-row w-full gap-4 mb-6">
                <Card className="flex-1 p-4 flex flex-row items-center justify-start gap-4 border-l-4 border-l-blue-500 min-w-0">
                  <div className="p-3 rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
                    <Package className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col items-start text-left min-w-0">
                    <p className="text-sm text-muted-foreground truncate w-full">{t('Total Rentals')}</p>
                    <p className="text-2xl font-bold">{rentals.length}</p>
                  </div>
                </Card>
                <Card className="flex-1 p-4 flex flex-row items-center justify-start gap-4 border-l-4 border-l-orange-500 min-w-0">
                  <div className="p-3 rounded-lg bg-orange-100 text-orange-600 flex-shrink-0">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col items-start text-left min-w-0">
                    <p className="text-sm text-muted-foreground truncate w-full">{t('Active')}</p>
                    <p className="text-2xl font-bold">
                      {rentals.filter(r => r && (r.status === 'active' || r.status === 'overdue')).length}
                    </p>
                  </div>
                </Card>
                <Card className="flex-1 p-4 flex flex-row items-center justify-start gap-4 border-l-4 border-l-green-500 min-w-0">
                  <div className="p-3 rounded-lg bg-green-100 text-green-600 flex-shrink-0">
                    <Coins className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col items-start text-left min-w-0">
                    <p className="text-sm text-muted-foreground truncate w-full">{t('Refunded Amount')}</p>
                    <p className="text-2xl font-bold truncate w-full">
                      Rs. {rentals
                        .filter(r => r && (r.deposit_status === 'refunded' || r.deposit_status === 'partial_refund'))
                        .reduce((sum, r) => sum + (parseFloat(r?.deposit_refund_amount) || 0), 0)
                        .toLocaleString()}
                    </p>
                  </div>
                </Card>
              </div>
            )}

            <div className="space-y-4">
              {loadingRentals ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>{t('Loading your rentals...')}</p>
                </div>
              ) : rentals.length === 0 ? (
                <Card className="p-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="mb-2">{t('No rentals yet')}</h3>
                  <p className="text-muted-foreground">{t('When you rent an item, it will appear here')}</p>
                </Card>
              ) : (
                rentals
                  .slice((rentalsPage - 1) * rentalsPageSize, rentalsPage * rentalsPageSize)
                  .map((rental) => {
                  if (!rental) return null;
                  const rawImg = rental.product_image;
                  const imageSrc = (typeof rawImg === 'string' && rawImg.trim())
                    ? (rawImg.startsWith('http') || rawImg.startsWith('/')
                      ? rawImg
                      : `${API_BASE_URL}/${rawImg}`)
                    : null;

                  const statusStr = String(rental.status || 'active');
                  const displayStatus = statusStr.charAt(0).toUpperCase() + statusStr.slice(1);
                  const depositStatusStr = String(rental.deposit_status || 'held').replace(/_/g, ' ');
                  const displayDepositStatus = depositStatusStr.charAt(0).toUpperCase() + depositStatusStr.slice(1);

                  const dailyPrice = parseFloat(rental.rental_price_per_day) || 0;
                  const rentalDays = rental.rental_days || 1;
                  const totalRentalAmt = parseFloat(rental.total_rental_amount) || 0;
                  const secDeposit = parseFloat(rental.security_deposit) || 0;
                  const latePenaltyTotal = parseFloat(rental.late_penalty_total) || 0;
                  const depositRefundAmt = parseFloat(rental.deposit_refund_amount) || 0;
                  const latePenaltyPerDay = parseFloat(rental.late_penalty_per_day) || 0;

                  return (
                    <Card key={rental.id} className="p-6 overflow-hidden">
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Left Side: Product Image & Badges */}
                        <div className="flex flex-row md:flex-col gap-4 items-center md:items-start min-w-[120px]">
                          <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                            {imageSrc ? (
                              <ImageWithFallback
                                src={imageSrc}
                                alt={rental.product_name || 'Rental item'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex flex-col gap-2 w-full">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold text-center w-fit ${getRentalStatusColor(rental.status)}`}>
                              {t(displayStatus)}
                            </span>
                            <span className="text-xs text-muted-foreground text-center md:text-left">
                              {t('Qty')}: {rental.quantity || 1}
                            </span>
                          </div>
                        </div>

                        {/* Middle Side: Main details */}
                        <div className="flex-1 space-y-4">
                          <div>
                            <h3 className="text-lg font-bold text-foreground mb-1">{rental.product_name || t('Rental Product')}</h3>
                            <p className="text-xs text-muted-foreground">
                              {t('Order ID')}: {rental.order_id || t('Direct Rental')}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                              <span>
                                <strong>{t('Start Date')}:</strong> {formatSimpleDate(rental.rental_start_date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                              <span>
                                <strong>{t('End Date')}:</strong> {formatSimpleDate(rental.rental_end_date)}
                              </span>
                            </div>
                            {rental.actual_return_date && (
                              <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span>
                                  <strong>{t('Return Date')}:</strong> {formatSimpleDate(rental.actual_return_date)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Notes if any */}
                          {rental.condition_notes && (
                            <div className="bg-muted/50 p-3 rounded-lg border border-border text-xs text-muted-foreground">
                              <strong>{t('Condition Notes')}:</strong> {rental.condition_notes}
                            </div>
                          )}

                          {/* Overdue/Late penalty notification */}
                          {rental.status === 'overdue' && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 rounded-lg text-xs border border-red-200 dark:border-red-900/50 text-left">
                              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                              <span>
                                {t('Late Penalty Applied')}: Rs. {latePenaltyPerDay.toLocaleString()}/{t('day')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Right Side: Cost Summary */}
                        <div className="md:border-l border-border md:pl-6 min-w-[200px] flex flex-col justify-between gap-4">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t('Daily Price')}:</span>
                              <span className="font-medium">Rs. {dailyPrice.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t('Days')}:</span>
                              <span className="font-medium">{rentalDays}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-dashed border-border">
                              <span className="text-muted-foreground font-semibold">{t('Total Rental Amount')}:</span>
                              <span className="font-bold text-primary">Rs. {totalRentalAmt.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="bg-muted/30 p-3 rounded-lg space-y-2 text-xs text-left">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground font-semibold">{t('Security Deposit')}:</span>
                              <span className="font-bold">Rs. {secDeposit.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">{t('Deposit Status')}:</span>
                              <span className={`px-2 py-0.5 rounded-full font-semibold ${getDepositStatusColor(rental.deposit_status)}`}>
                                {t(displayDepositStatus)}
                              </span>
                            </div>
                            {latePenaltyTotal > 0 && (
                              <div className="flex justify-between text-red-600 font-semibold pt-1 border-t border-border">
                                <span>{t('Late Penalty')}:</span>
                                <span>Rs. -{latePenaltyTotal.toLocaleString()}</span>
                              </div>
                            )}
                            {(rental.deposit_status === 'refunded' || rental.deposit_status === 'partial_refund') && (
                              <div className="flex justify-between text-green-600 font-semibold pt-1 border-t border-border">
                                <span>{t('Refunded Deposit')}:</span>
                                <span>Rs. {depositRefundAmt.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>

            {rentals.length > 0 && (
              <Pagination
                currentPage={rentalsPage}
                totalItems={rentals.length}
                pageSize={rentalsPageSize}
                onPageChange={setRentalsPage}
                onPageSizeChange={(size) => {
                  setRentalsPageSize(size);
                  setRentalsPage(1);
                }}
                className="mt-4"
              />
            )}
          
    </>
  );
};

export default RentalsTab;
