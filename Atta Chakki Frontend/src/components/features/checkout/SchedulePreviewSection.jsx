import React from 'react';
import { Sunrise, Calendar, Clock, Loader2 } from 'lucide-react';
import { Card } from '../../common/card';

export function SchedulePreviewSection({
  schedulePreview,
  scheduleLoading,
  hasTripItem,
  t
}) {
  if (hasTripItem) return null;

  return (
    <>
      {schedulePreview && (
        <Card
          className={`p-4 mb-6 border-l-4 ${
            schedulePreview.is_today
              ? 'border-l-green-500 bg-green-50'
              : 'border-l-orange-500 bg-orange-50'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${schedulePreview.is_today ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
              {schedulePreview.is_today ? <Sunrise className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-foreground">
                  {schedulePreview.is_today ? t('Scheduled for Today') : t('Scheduled for Tomorrow')}
                </h4>
                <span className="text-xs font-mono bg-white/50 px-2 py-0.5 rounded border border-border">
                  {schedulePreview.is_today ? t('Today') : t('Tomorrow')}
                </span>
              </div>
              
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{t('Expected')}: <strong>{schedulePreview.estimated_completion_display}</strong></span>
                </div>
                {!schedulePreview.is_today && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(schedulePreview.assigned_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</span>
                  </div>
                )}
              </div>

              <p className="mt-2 text-[11px] text-amber-900/90 bg-amber-100/60 px-2 py-1 rounded border border-amber-300/40 font-medium">
                ℹ️ {t('Expected processing completion time only. Delivery time may vary.')}
              </p>

              {!schedulePreview.is_today && schedulePreview.reason_code !== 'today' && (
                <p className="mt-2 text-xs text-amber-700 bg-amber-100/50 p-2 rounded border border-amber-200/50 italic">
                  {schedulePreview.reason_code === 'time_cutoff' && t('Shop closing soon, new orders moved to tomorrow.')}
                  {schedulePreview.reason_code === 'capacity_full' && t("Today's slots are full. Scheduled for tomorrow.")}
                  {schedulePreview.reason_code === 'no_time_left' && t('Not enough time to process today. Scheduled for tomorrow.')}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {scheduleLoading && (
        <div className="flex items-center justify-center p-4 mb-6 bg-secondary/20 rounded-lg animate-pulse">
          <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">{t('Checking schedule...')}</span>
        </div>
      )}
    </>
  );
}
