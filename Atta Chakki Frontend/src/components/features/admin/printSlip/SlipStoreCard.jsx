import React from 'react';
import { LogoSVG } from './printSlipUtils';

export default function SlipStoreCard({ storeSettings, language = 'en' }) {
  const isUrdu = language === 'ur';
  return (
    <div className="text-center pb-3 border-b-2 border-dashed border-border">
      <div className="flex justify-center mb-2">
        {storeSettings.logo ? (
          <img
            src={storeSettings.logo}
            alt=""
            className="store-logo-slip shadow-sm"
          />
        ) : (
          <LogoSVG size={52} />
        )}
      </div>
      <h2 className={`text-sm font-black uppercase ${isUrdu ? 'tracking-normal font-bold' : 'tracking-widest'}`}>
        {storeSettings.name}
      </h2>
      <p className={`text-[9px] text-muted-foreground mt-0.5 ${isUrdu ? 'tracking-normal' : 'tracking-wider uppercase'}`}>
        {storeSettings.tagline}
      </p>
      <p className="text-[9px] text-muted-foreground mt-1" dir={isUrdu ? 'rtl' : 'ltr'}>
        📞 {storeSettings.phone} &nbsp;|&nbsp; 📍 {storeSettings.address}
      </p>
    </div>
  );
}
