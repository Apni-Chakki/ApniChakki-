import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/common/card';
import { Skeleton } from '@/components/common/skeleton';

export default function TodayPulseGrid({ isLoading, statCards, stats }) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex items-center gap-3 mb-7">
        <div className="h-7 w-1.5 rounded-full" style={{ backgroundColor: '#8b6f47' }} />
        <h2 className="text-xl mt-3 mb-3 font-bold text-gray-900 tracking-tight">
          {t("Today's Pulse")}
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const isPending = stat.id === 'pending';
          const showUrgent = isPending && stats.pendingOrders > 0;
          return (
            <Card
              key={index}
              className={`relative overflow-hidden border transition-all duration-200 rounded-xl ${
                showUrgent
                  ? 'border-rose-200 shadow-sm'
                  : 'border-gray-200/70 bg-white shadow-sm hover:shadow-md'
              }`}
              style={
                showUrgent
                  ? { backgroundColor: '#FBE8E2', boxShadow: '0 1px 3px rgba(190, 18, 60, 0.08)' }
                  : { backgroundColor: '#ffffff' }
              }
            >
              {isLoading ? (
                <div className="p-6">
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <div className="p-6">
                  <p
                    className={`text-[11px] font-bold uppercase tracking-[0.08em] mb-5 ${
                      showUrgent ? 'text-rose-800' : 'text-gray-500'
                    }`}
                  >
                    {t(stat.title)}
                  </p>
                  <div className="flex items-center gap-4">
                    <div
                      className="shrink-0 flex items-center justify-center"
                      style={{
                        width: '48px',
                        height: '48px',
                        backgroundColor: stat.iconBg,
                        borderRadius: '12px',
                        border: '1px solid rgba(0, 0, 0, 0.06)',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)'
                      }}
                    >
                      <Icon style={{ height: '22px', width: '22px', color: stat.iconColor }} strokeWidth={2.25} />
                    </div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none">
                        {stat.value}
                      </h2>
                      {showUrgent && (
                        <span
                          style={{
                            backgroundColor: '#dc2626',
                            color: '#ffffff',
                            fontSize: '10px',
                            fontWeight: 800,
                            letterSpacing: '0.08em',
                            padding: '4px 9px',
                            borderRadius: '9999px',
                            textTransform: 'uppercase',
                            display: 'inline-flex',
                            alignItems: 'center',
                            boxShadow: '0 1px 3px rgba(220, 38, 38, 0.4)',
                            lineHeight: 1
                          }}
                        >
                          {t('Urgent')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
