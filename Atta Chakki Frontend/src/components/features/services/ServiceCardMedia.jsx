import { ImageWithFallback } from '../../common/ImageWithFallback';

export function ServiceCardMedia({
  service,
  isRental,
  badgeText,
  hasDiscount,
  discountType,
  discountValue,
  isOutOfStock,
  t,
  tDynamic,
}) {
  const imageUrl = service.image_url || service.imageUrl;

  return (
    <div className="relative w-full h-48 sm:h-52 md:h-56 overflow-hidden bg-muted">
      {imageUrl ? (
        <ImageWithFallback
          src={imageUrl}
          alt={service.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <svg
              className="w-12 h-12 mx-auto mb-2 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16"
              />
            </svg>
            <p className="text-xs">{t('No image')} </p>
          </div>
        </div>
      )}

      {/* Custom Badge / Rental Badge (top-left) */}
      {isRental ? (
        <span
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            zIndex: 10,
            background: 'linear-gradient(135deg, #2c251e 0%, #4a3f35 100%)',
            color: '#f5ede3',
            padding: '5px 12px',
            borderRadius: '8px',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid rgba(212,165,116,0.3)',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '11px' }}>🔄</span> {t('FOR RENT')}
        </span>
      ) : badgeText ? (
        <span
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            zIndex: 10,
            background: 'linear-gradient(135deg, #ba2d2d 0%, #991b1b 100%)',
            color: '#fff',
            padding: '5px 12px',
            borderRadius: '8px',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid rgba(255,255,255,0.2)',
            whiteSpace: 'nowrap',
          }}
        >
          {tDynamic(badgeText)}
        </span>
      ) : null}

      {/* Discount Badge (top-right) */}
      {hasDiscount && (
        <span
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 10,
            background: 'linear-gradient(135deg, #8b6f47 0%, #a0845c 100%)',
            color: '#fff',
            padding: '5px 12px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.03em',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid rgba(255,255,255,0.2)',
            whiteSpace: 'nowrap',
          }}
        >
          {discountType === 'percentage'
            ? `-${Math.min(discountValue, 100)}%`
            : `-Rs.${discountValue}`}
        </span>
      )}

      {/* Out of Stock Overlay */}
      {isOutOfStock && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none">
          <span className="bg-red-600 text-white font-bold text-xs uppercase px-3 py-1.5 rounded-full shadow-md tracking-wider">
            {t('Out of Stock')}
          </span>
        </div>
      )}
    </div>
  );
}

export default ServiceCardMedia;
