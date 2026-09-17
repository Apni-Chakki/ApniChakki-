import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/common/card';
import { Skeleton } from '@/components/common/skeleton';

export default function AllTimeStatsGrid({ isLoading, allTimeCards }) {
  const { t } = useTranslation();

  return (
    <div className="pt-2">
      <div className="flex items-center gap-3 mb-7">
        <div className="h-7 w-1.5 rounded-full" style={{ backgroundColor: '#8b6f47' }} />
        <h2 className="text-xl font-bold text-gray-900 mt-3 mb-3 tracking-tight">
          {t('All-Time Statistics')}
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {allTimeCards.map((stat, index) => {
          const isFeatured = stat.featured;
          return (
            <Card
              key={index}
              className={`relative overflow-hidden transition-all duration-200 rounded-xl ${
                isFeatured ? 'border-0 text-white' : 'border border-gray-100 bg-white hover:shadow-md'
              }`}
              style={
                isFeatured
                  ? { background: 'linear-gradient(135deg, #6f5535, #8b6f47)' }
                  : { backgroundColor: '#ffffff' }
              }
            >
              {isLoading ? (
                <div className="p-6">
                  <Skeleton className={`h-16 w-full ${isFeatured ? 'bg-white/20' : ''}`} />
                </div>
              ) : (
                <div className="p-6">
                  <p
                    className={`text-[11px] font-bold uppercase tracking-[0.08em] mb-5 ${
                      isFeatured ? 'text-white/80' : 'text-gray-500'
                    }`}
                  >
                    {t(stat.title)}
                  </p>
                  <h2
                    className={`text-3xl font-black tracking-tight leading-none mb-3 ${
                      isFeatured ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {stat.value}
                  </h2>
                  <p
                    className={`text-xs ${
                      stat.subtitleClass ||
                      (isFeatured ? 'text-white/70 font-medium' : 'text-gray-400 font-medium')
                    }`}
                  >
                    {t(stat.subtitle)}
                  </p>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
