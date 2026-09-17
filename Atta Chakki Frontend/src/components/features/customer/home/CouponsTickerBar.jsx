import { Tag } from 'lucide-react';

export function CouponsTickerBar({ featuredCoupons, t }) {
  if (!featuredCoupons || featuredCoupons.length === 0) {
    return <div className="min-h-[46px]" />;
  }

  return (
    <div className="min-h-[46px]">
      <div className="bg-primary text-primary-foreground py-2.5 px-4 flex items-center w-full overflow-hidden shadow-sm border-b border-primary-foreground/10 group">
        <div className="flex w-max">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="animate-marquee flex shrink-0 items-center whitespace-nowrap"
              style={{ paddingRight: '4rem' }}
              aria-hidden={i > 0 ? 'true' : 'false'}
            >
              {featuredCoupons.map((coupon, j) => (
                <div
                  key={`${i}-${j}`}
                  className="flex items-center mr-10 bg-black/10 border border-primary-foreground/20 px-4 py-1.5 rounded-full"
                >
                  <Tag className="h-4 w-4 mr-2 text-accent animate-pulse" />
                  <span className="text-sm font-medium tracking-wide">
                    {t('Code')}: <span className="font-bold text-accent tracking-wider px-1">{coupon.code}</span> | {t('Get')}{' '}
                    <span className="font-bold">
                      {coupon.discount_value}
                      {coupon.discount_type === 'percentage' ? '%' : ' Rs.'}
                    </span>{' '}
                    {t('OFF')}
                    {coupon.description && (
                      <span className="opacity-80 ml-2 text-xs">({coupon.description})</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CouponsTickerBar;
