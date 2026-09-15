import React from 'react';
import { Card, CardContent } from '../../../common/card';
import { CalendarClock, Weight, Timer, Zap } from 'lucide-react';

export const TomorrowsHeaderStats = ({
  ordersCount = 0,
  totalWeight = '0',
  totalProcessingTime = 0,
  capacity = null,
  t = (s) => s,
}) => {
  return (
    <div className="space-y-4">
      {ordersCount > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-3 gap-2 sm:gap-4">
          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
            <CardContent className="py-3 sm:py-4 px-2 sm:px-6 text-center">
              <CalendarClock className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 mx-auto mb-1" />
              <p className="text-lg sm:text-2xl font-bold text-orange-800">{ordersCount}</p>
              <p className="text-[10px] sm:text-xs text-orange-600 font-medium leading-tight">
                Scheduled<span className="hidden sm:inline"> Orders</span>
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="py-3 sm:py-4 px-2 sm:px-6 text-center">
              <Weight className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mx-auto mb-1" />
              <p className="text-lg sm:text-2xl font-bold text-blue-800">{totalWeight} kg</p>
              <p className="text-[10px] sm:text-xs text-blue-600 font-medium leading-tight">Total Weight</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
            <CardContent className="py-3 sm:py-4 px-2 sm:px-6 text-center">
              <Timer className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 mx-auto mb-1" />
              <p className="text-lg sm:text-2xl font-bold text-emerald-800">
                {totalProcessingTime}
                <span className="text-xs sm:text-base"> mins</span>
              </p>
              <p className="text-[10px] sm:text-xs text-emerald-600 font-medium leading-tight">
                Est. <span className="hidden sm:inline">Processing </span>Time
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {capacity && (
        <Card className="border-orange-200" style={{ background: '#ffffff' }}>
          <CardContent className="py-3 sm:py-4 px-3 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 shrink-0" />
                <span className="font-semibold text-orange-900 text-sm sm:text-base">
                  {t("Tomorrow's Capacity")}
                </span>
              </div>
              <div className="text-[11px] sm:text-sm text-orange-700">
                <span className="font-bold">{Math.round(capacity.booked_minutes)}</span> /{' '}
                {Math.round(capacity.total_minutes)} mins booked
                <span className="mx-1.5 sm:mx-2">•</span>
                <span className="font-bold text-green-700">
                  {Math.round(capacity.remaining_minutes)} mins
                </span>{' '}
                available
              </div>
            </div>
            <div className="w-full bg-orange-200 rounded-full h-2.5 sm:h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  capacity.percentage_used > 90
                    ? 'bg-red-500'
                    : capacity.percentage_used > 70
                    ? 'bg-orange-500'
                    : 'bg-orange-400'
                }`}
                style={{ width: `${Math.min(capacity.percentage_used, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] sm:text-xs text-orange-600 gap-1">
              <span className="truncate">
                {capacity.opening_time} <span className="hidden sm:inline">(Open)</span>
              </span>
              <span className="font-semibold text-center shrink-0">
                {capacity.percentage_used}% <span className="hidden sm:inline">pre-</span>booked
              </span>
              <span className="truncate text-right">
                {capacity.closing_time} <span className="hidden sm:inline">(Close)</span>
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TomorrowsHeaderStats;
