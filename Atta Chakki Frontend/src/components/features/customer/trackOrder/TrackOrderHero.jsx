import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../common/card';
import { Button } from '../../../common/button';
import { Input } from '../../../common/input';
import { Search, ArrowLeft, Loader2, XCircle } from 'lucide-react';
import {
  CAROUSEL_SLIDES,
  glassCard,
  backBtnBase,
  avatarCircle,
} from './trackOrderConstants';

export function TrackOrderHero({
  currentSlide,
  orderId,
  setOrderId,
  loading,
  notFound,
  onSearch,
}) {
  const { t } = useTranslation();

  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Absolute background carousel */}
      {CAROUSEL_SLIDES.map((slide, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${slide})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: i === currentSlide ? 1 : 0,
            transition: 'opacity 1.5s ease-in-out',
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.42) 100%)',
        }}
      />

      {/* Back button */}
      <div style={{ position: 'relative', zIndex: 1, flexShrink: 0, padding: '0.875rem 1rem' }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <button
            style={backBtnBase}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
          >
            <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
            {t('Back to Home')}
          </button>
        </Link>
      </div>

      {/* Centered: avatar + title + search */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem 1rem 4rem',
          textAlign: 'center',
        }}
      >
        <div style={avatarCircle}>
          <Search style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} />
        </div>
        <h1
          style={{
            color: 'white',
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            fontWeight: 800,
            marginBottom: '0.5rem',
            textShadow: '0 2px 8px rgba(0,0,0,0.35)',
            letterSpacing: '-0.02em',
          }}
        >
          {t('Track Your Order')}
        </h1>
        <p
          style={{
            color: 'rgba(255,255,255,0.82)',
            fontSize: '1.05rem',
            maxWidth: '480px',
            margin: '0 auto 1.75rem',
          }}
        >
          {t('Enter your order ID or phone number to check the status in real-time')}
        </p>

        {/* Search card */}
        <div style={{ width: '100%', maxWidth: '560px' }}>
          <Card style={glassCard}>
            <div style={{ padding: '0.625rem' }}>
              <div className="flex md:flex-row flex-col gap-3">
                <div className="relative flex-1">
                  <Search
                    style={{
                      position: 'absolute',
                      left: '0.875rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--muted-foreground)',
                      width: '1rem',
                      height: '1rem',
                      pointerEvents: 'none',
                    }}
                  />
                  <Input
                    placeholder={t('Order ID (e.g. 1042) or Phone Number')}
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && onSearch()}
                    className="focus-visible:ring-0 border-0"
                    style={{
                      paddingLeft: '2.5rem',
                      height: '2.875rem',
                      background: 'transparent',
                      fontSize: '0.95rem',
                      fontWeight: 500,
                    }}
                  />
                </div>
                <Button
                  onClick={() => onSearch()}
                  disabled={loading || !orderId.trim()}
                  className="font-bold rounded-lg"
                  style={{
                    height: '2.875rem',
                    paddingLeft: '1.75rem',
                    paddingRight: '1.75rem',
                    flexShrink: 0,
                  }}
                >
                  {loading ? (
                    <Loader2 style={{ width: '1.1rem', height: '1.1rem' }} className="animate-spin" />
                  ) : (
                    t('Track')
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Not found — shown inline in hero */}
        {notFound && (
          <div style={{ width: '100%', maxWidth: '460px', marginTop: '1.5rem' }}>
            <Card style={glassCard}>
              <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                <div
                  style={{
                    width: '3.5rem',
                    height: '3.5rem',
                    background: 'rgba(239,68,68,0.12)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.75rem',
                  }}
                >
                  <XCircle style={{ width: '1.75rem', height: '1.75rem', color: '#ef4444' }} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.375rem' }}>
                  {t('Order Not Found')}
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  {t("We couldn't find any orders matching")}{' '}
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      background: '#f1f5f9',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '0.25rem',
                      color: '#1e293b',
                    }}
                  >
                    {orderId}
                  </span>
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
}
