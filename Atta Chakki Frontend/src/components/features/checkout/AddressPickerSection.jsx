import React from 'react';
import { MapPin, AlertCircle, Navigation, Loader2, Crosshair, Building2, CheckCircle2 } from 'lucide-react';
import { Card } from '../../common/card';
import { Button } from '../../common/button';
import { Input } from '../../common/input';
import { Label } from '../../common/label';
import { MapboxPicker } from '../../common/MapboxPicker';
import { FALLBACK_CENTER } from '../../../utils/checkoutHelpers';

export function AddressPickerSection({
  orderType,
  isOutOfLahore,
  deliveryArea,
  setDeliveryArea,
  houseDetails,
  setHouseDetails,
  locationStatus,
  addressSuggestion,
  setAddressSuggestion,
  gpsCoords,
  distanceKm,
  searchTypedAddress,
  handleMarkerDrag,
  handleGetLocation,
  handleHouseDetailsBlur,
  t
}) {
  return (
    <Card className={`p-6 mb-6 transition-all duration-300 ${orderType !== 'delivery' ? 'opacity-50 pointer-events-none hidden' : ''}`}>
      <h3 className="mb-4 text-foreground flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        {t('Delivery Address')}
      </h3>
      
      {isOutOfLahore && (
        <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">{t('Delivery Not Available')}</p>
            <p className="text-xs text-red-700 mt-1">
              {t('Currently, Suchi Chakki only delivers within Lahore. Please change your order type to "Pickup" or update your area.')}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {/* MAP SECTION */}
        <div className="border-2 border-primary/20 rounded-xl overflow-hidden bg-primary/5">
          <div className="px-4 py-3 border-b border-primary/10 bg-primary/5">
            <p className="text-sm font-bold text-primary flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              {t('1. Select your location on the map')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('Search, use GPS, or tap on the map to pin your delivery location')}</p>
          </div>

          {/* Search bar + GPS button above map */}
          <div className="px-3 py-2.5 bg-white/80 border-b border-primary/10 flex gap-2">
            <div className="relative flex-1">
              <Input
                id="deliveryArea"
                value={deliveryArea}
                onChange={(e) => setDeliveryArea(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchTypedAddress(); } }}
                placeholder={t('Search area (e.g. Rasheed Pura, DHA Phase 5)')}
                className="pr-3 bg-white text-sm h-9"
              />
            </div>
            <Button 
              type="button" 
              size="sm"
              onClick={() => searchTypedAddress()}
              disabled={!deliveryArea || deliveryArea.length < 3 || locationStatus?.includes('Verifying')}
              className="h-9 px-3 shrink-0"
            >
              {locationStatus?.includes('Verifying') ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Search')}
            </Button>
            <button
              type="button"
              title={t('Use My GPS Location')}
              aria-label={t('Use My GPS Location')}
              onClick={handleGetLocation}
              disabled={locationStatus?.includes('Refining') || locationStatus?.includes('Getting') || locationStatus?.includes('Verifying')}
              className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg bg-primary hover:bg-primary/90 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-white"
            >
              {locationStatus?.includes('Getting') ? (
                <Loader2 size={18} className="animate-spin text-white" style={{ width: '18px', height: '18px', color: '#ffffff' }} />
              ) : (
                <Crosshair size={20} color="#ffffff" strokeWidth={2.5} className="text-white shrink-0" style={{ width: '20px', height: '20px', color: '#ffffff', stroke: '#ffffff' }} />
              )}
            </button>
          </div>

          {/* Status message */}
          {locationStatus && (
            <div className={`px-4 py-2 text-xs font-medium border-b border-primary/10 ${
              locationStatus.includes('✅') || locationStatus.includes('updated') ? 'bg-green-50 text-green-700' :
              locationStatus.includes('⚠️') || locationStatus.includes('Approximate') || locationStatus.includes('refine') ? 'bg-amber-50 text-amber-700' :
              locationStatus.includes('📡') || locationStatus.includes('🔍') ? 'bg-blue-50 text-blue-600' :
              locationStatus.includes('denied') || locationStatus.includes('error') || locationStatus.includes('❌') ? 'bg-red-50 text-red-600' :
              'bg-secondary/50 text-muted-foreground'
            }`}>
              {locationStatus}
            </div>
          )}

          {/* Address Suggestion Banner */}
          {addressSuggestion && (
            <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <span className="text-amber-500 text-base shrink-0 mt-0.5">💡</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-amber-800">{t('Did you mean?')}</p>
                  <p className="text-xs text-amber-700 truncate">{addressSuggestion.corrected}</p>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryArea(addressSuggestion.corrected);
                    setHouseDetails(addressSuggestion.corrected);
                    setAddressSuggestion(null);
                    searchTypedAddress(addressSuggestion.corrected);
                  }}
                  className="text-[11px] font-semibold px-2.5 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                >
                  ✓ {t('Use This')}
                </button>
                <button
                  type="button"
                  onClick={() => setAddressSuggestion(null)}
                  className="text-[11px] px-2 py-1 bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Map */}
          <div className="relative">
            <MapboxPicker
              position={gpsCoords ? { lat: gpsCoords.lat, lng: gpsCoords.lng } : FALLBACK_CENTER}
              onPositionChange={handleMarkerDrag}
              onAddressChange={(addr) => {
                if (addr) {
                  setDeliveryArea(addr);
                  setAddressSuggestion(null);
                  setHouseDetails(prev => (!prev || prev.trim() === '' || prev.toLowerCase().includes('lahore, punjab') ? addr : prev));
                }
              }}
              height="280px"
              showSearch={false}
            />
          </div>

          {/* Selected area confirmation chip */}
          {gpsCoords && deliveryArea && !isOutOfLahore && (
            <div className="px-4 py-2.5 bg-green-50 border-t border-green-200 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <p className="text-xs text-green-800 font-medium truncate flex-1">{deliveryArea}</p>
              {distanceKm > 0 && (
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold shrink-0">
                  {distanceKm.toFixed(1)} km
                </span>
              )}
            </div>
          )}
        </div>

        {/* HOUSE DETAILS SECTION */}
        <div className="p-4 border-2 border-primary/20 rounded-xl bg-primary/5">
          <Label htmlFor="houseDetails" className="text-primary font-bold flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {t('2. House, Street & Building Details')} <span className="text-xs font-normal text-muted-foreground">({t('Optional if location selected')})</span>
          </Label>
          <p className="text-xs text-muted-foreground mb-2 mt-0.5">{t('Provide exact details for the delivery rider')}</p>
          <textarea
            id="houseDetails"
            value={houseDetails}
            onChange={(e) => setHouseDetails(e.target.value)}
            onBlur={handleHouseDetailsBlur}
            placeholder={t('e.g. House # 85, Street # 20, Mohalla Javed Colony')}
            className="w-full min-h-[80px] rounded-lg border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            rows={3}
          />
        </div>
      </div>
    </Card>
  );
}
