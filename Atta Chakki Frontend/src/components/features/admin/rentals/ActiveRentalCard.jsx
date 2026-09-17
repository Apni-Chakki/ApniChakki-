import React from 'react';
import { Card, CardContent } from '../../../common/card';
import { Badge } from '../../../common/badge';
import { Button } from '../../../common/button';
import {
  Calendar,
  CalendarClock,
  Banknote,
  User,
  Phone,
  MapPin,
  ArrowDownCircle,
  Printer,
  MessageCircle,
} from 'lucide-react';
import { getOverdueDays, getDaysRemaining } from './rentalUtils';

export function ActiveRentalCard({
  rental,
  onProcessReturn,
  onPrintSlip,
  onPdfAndWhatsApp,
}) {
  const isOverdue = rental.status === 'overdue';
  const overdueDays = getOverdueDays(rental);
  const daysRemaining = getDaysRemaining(rental);
  const runningPenalty = isOverdue
    ? overdueDays * parseFloat(rental.late_penalty_per_day || 0)
    : 0;

  return (
    <Card
      className={`border-l-[6px] shadow-lg hover:shadow-xl transition-all rounded-xl bg-white ${
        isOverdue ? 'border-l-red-500 animate-pulse' : 'border-l-teal-500'
      }`}
    >
      {/* Header */}
      <div className={`p-5 pb-3 rounded-t-xl ${isOverdue ? 'bg-red-50/50' : 'bg-teal-50/30'}`}>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2 flex-wrap">
              Rental #{rental.id}
              <Badge
                className={`text-[10px] px-2 py-0.5 font-bold uppercase ${
                  isOverdue
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : 'bg-teal-100 text-teal-800 border-teal-300'
                }`}
              >
                {isOverdue ? '⚠️ OVERDUE' : '✅ Active'}
              </Badge>
            </h3>
            <p className="text-sm font-semibold text-slate-700 mt-1">{rental.product_name}</p>
            {rental.quantity > 1 && (
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="text-xs font-semibold text-slate-600">
                  Total Qty: {rental.quantity}
                </span>
                {parseInt(rental.returned_quantity || 0, 10) > 0 && (
                  <Badge variant="outline" className="text-[10px] text-teal-700 bg-teal-50 border-teal-200">
                    {rental.returned_quantity} returned ({rental.quantity - rental.returned_quantity} remaining)
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="text-right">
            {isOverdue ? (
              <div className="bg-red-100 px-3 py-2 rounded-lg border border-red-200">
                <p className="text-xl font-black text-red-700">
                  {overdueDays} day{overdueDays !== 1 ? 's' : ''}
                </p>
                <p className="text-[10px] font-bold text-red-600 uppercase">Overdue</p>
                {runningPenalty > 0 && (
                  <p className="text-xs font-bold text-red-800 mt-1">
                    Penalty: Rs. {parseInt(runningPenalty).toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-teal-50 px-3 py-2 rounded-lg border border-teal-200">
                <p className="text-xl font-black text-teal-700">
                  {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                </p>
                <p className="text-[10px] font-bold text-teal-600 uppercase">Remaining</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <CardContent className="space-y-4 pt-4">
        {/* Rental Details Grid */}
        <div
          className={`p-3 rounded-lg border ${
            isOverdue
              ? 'bg-red-50/50 border-red-200'
              : 'bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200'
          }`}
        >
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div
                className={`flex items-center justify-center gap-1 mb-0.5 ${
                  isOverdue ? 'text-red-600' : 'text-teal-600'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase">Start</span>
              </div>
              <p className="text-sm font-bold text-slate-800">
                {new Date(rental.rental_start_date).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                })}
              </p>
            </div>
            <div className="border-x border-teal-200">
              <div
                className={`flex items-center justify-center gap-1 mb-0.5 ${
                  isOverdue ? 'text-red-600' : 'text-teal-600'
                }`}
              >
                <CalendarClock className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase">Due</span>
              </div>
              <p
                className={`text-sm font-bold ${
                  isOverdue ? 'text-red-700' : 'text-slate-800'
                }`}
              >
                {new Date(rental.rental_end_date).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                })}
              </p>
            </div>
            <div>
              <div
                className={`flex items-center justify-center gap-1 mb-0.5 ${
                  isOverdue ? 'text-red-600' : 'text-teal-600'
                }`}
              >
                <Banknote className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase">Deposit</span>
              </div>
              <p className="text-sm font-bold text-slate-800">
                Rs. {parseInt(rental.security_deposit || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-muted/30 p-3 rounded-md space-y-1.5 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{rental.customer_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{rental.customer_phone}</span>
          </div>
          {rental.customer_address && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate">{rental.customer_address}</span>
            </div>
          )}
        </div>

        {/* Pricing Summary */}
        <div className="text-xs space-y-1 p-2 bg-slate-50 rounded-md">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Rental ({rental.rental_days} days × Rs.{' '}
              {parseInt(rental.rental_price_per_day).toLocaleString()})
            </span>
            <span className="font-bold">
              Rs. {parseInt(rental.total_rental_amount || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Security Deposit</span>
            <span className="font-bold">
              Rs. {parseInt(rental.security_deposit || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount Paid</span>
            <span className="font-bold text-green-700">
              Rs. {parseInt(rental.amount_paid || 0).toLocaleString()}
            </span>
          </div>
          {runningPenalty > 0 && (
            <div className="flex justify-between text-red-600 font-bold border-t pt-1 mt-1">
              <span>
                Running Penalty ({overdueDays} days × Rs.{' '}
                {parseInt(rental.late_penalty_per_day).toLocaleString()})
              </span>
              <span>Rs. {parseInt(runningPenalty).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
          <Button
            className={`font-medium shadow-md ${
              isOverdue
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-teal-600 hover:bg-teal-700'
            }`}
            onClick={() => onProcessReturn(rental)}
          >
            <ArrowDownCircle className="h-4 w-4 mr-2" />
            Process Return
          </Button>
          <Button
            variant="outline"
            className="border-blue-200 text-blue-700 hover:bg-blue-50 font-medium"
            onClick={() => onPrintSlip(rental)}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Slip
          </Button>
          <Button
            variant="outline"
            className="border-green-200 text-green-700 hover:bg-green-50 font-medium"
            onClick={() => onPdfAndWhatsApp(rental)}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            PDF & WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
