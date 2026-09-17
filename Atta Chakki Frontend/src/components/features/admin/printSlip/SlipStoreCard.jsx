import React from 'react';
import { LogoSVG } from './printSlipUtils';

export default function SlipStoreCard({ storeSettings }) {
  return (
    <div className="text-center pb-3 border-b-2 border-dashed border-border">
      <div className="flex justify-center mb-2">
        {storeSettings.logo ? (
          <img
            src={storeSettings.logo}
            alt=""
            className="rounded-full object-cover shrink-0 shadow-sm"
            style={{ width: 52, height: 52 }}
          />
        ) : (
          <LogoSVG size={52} />
        )}
      </div>
      <h2 className="text-sm font-black tracking-widest uppercase">{storeSettings.name}</h2>
      <p className="text-[9px] text-muted-foreground tracking-wider mt-0.5 uppercase">
        {storeSettings.tagline}
      </p>
      <p className="text-[9px] text-muted-foreground">
        📞 {storeSettings.phone} &nbsp;|&nbsp; 📍 {storeSettings.address}
      </p>
    </div>
  );
}
