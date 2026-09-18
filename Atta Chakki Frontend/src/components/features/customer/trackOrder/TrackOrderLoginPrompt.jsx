import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../common/card';
import { Button } from '../../../common/button';
import { User, ArrowLeft } from 'lucide-react';
import {
  CAROUSEL_SLIDES,
  glassCard,
  backBtnBase,
  avatarCircle,
} from './trackOrderConstants';

export function TrackOrderLoginPrompt({ currentSlide }) {
  const { t } = useTranslation();

  return (
    <section className="track-hero-section">
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
      <div className="track-hero-gradient" />
      <div className="track-hero-nav">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <button className="track-back-btn">
            <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
            {t('Back to Home')}
          </button>
        </Link>
      </div>
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem 4rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <Card className="track-card-glass">
            <CardHeader className="space-y-1 text-center" style={{ paddingBottom: '0.75rem' }}>
              <div className="track-icon-badge mx-auto">
                <User style={{ width: '1.6rem', height: '1.6rem', color: 'white' }} />
              </div>
              <CardTitle className="text-2xl">{t('Login Required')}</CardTitle>
              <CardDescription>{t('You must be logged in to track your specific orders.')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/customer-login">
                <Button className="w-full">{t('Sign In to Track Order')}</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
