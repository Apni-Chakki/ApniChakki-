import { useTranslation } from 'react-i18next';

export function ServicePricingBlock({
  service,
  isRental,
  hasDiscount,
  effectivePrice,
  baseForDiscount,
  currentPrice,
  isDualUnit,
  displayUnit,
  t,
  tDynamic,
}) {
  const { i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';

  // Use pre-translated Urdu description from DB when available, otherwise fall back to tDynamic API translation
  const displayDescription = isUrdu && service.description_ur
    ? service.description_ur
    : tDynamic(service.description);

  return (
    <div className="flex-1">
      <h3 className="text-foreground mb-1 font-bold">{tDynamic(service.name)}</h3>
      {service.description && (
        <p className="text-muted-foreground text-sm mb-2">{displayDescription}</p>
      )}

      {isRental ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-teal-700 font-extrabold text-xl leading-none">
              Rs. {Math.round(parseFloat(service.rental_price_per_day) || 0)}
            </p>
            <span className="text-muted-foreground text-sm font-semibold">
              / {t('day')}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            <span className="inline-flex items-center text-[10px] text-teal-800 font-bold bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
              🛡️ {t('Deposit')}: Rs. {Math.round(parseFloat(service.security_deposit) || 0)}
            </span>
            <span className="inline-flex items-center text-[10px] text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
              ⚠️ {t('Penalty')}: Rs. {Math.round(parseFloat(service.late_penalty_per_day) || 0)}/{t('day')}
            </span>
          </div>
        </div>
      ) : hasDiscount ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-rose-700 font-extrabold text-xl leading-none">
              Rs. {Math.round(effectivePrice)}
            </p>
            <span className="text-muted-foreground text-sm font-medium">
              / {tDynamic(isDualUnit ? 'kg' : displayUnit)}
            </span>
            <p
              className="text-muted-foreground text-sm ml-1.5 font-medium"
              style={{
                textDecoration: 'line-through',
                textDecorationColor: '#ef4444',
                textDecorationThickness: '2px',
              }}
            >
              Rs. {Math.round(baseForDiscount)}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-baseline gap-1 flex-wrap">
          <p className="text-primary font-bold text-xl leading-none">
            Rs. {Math.round(currentPrice)}
          </p>
          <span className="text-muted-foreground text-sm font-medium">
            / {tDynamic(isDualUnit ? 'kg' : displayUnit)}
          </span>
        </div>
      )}
    </div>
  );
}

export default ServicePricingBlock;
