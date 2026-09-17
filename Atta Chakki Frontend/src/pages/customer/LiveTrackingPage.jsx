import { useParams } from 'react-router-dom';
import { Radio, AlertTriangle } from 'lucide-react';
import '../../styles/LiveTrackingPage.css';

import { useTrackingData } from '../../components/features/customer/liveTracking/useTrackingData';
import { useTrackingMap } from '../../components/features/customer/liveTracking/useTrackingMap';
import { TrackingLoading, TrackingError, TrackingDelivered } from '../../components/features/customer/liveTracking/TrackingStatusScreens';
import { TrackingBottomSheet } from '../../components/features/customer/liveTracking/TrackingBottomSheet';

// customer live tracking page
export function LiveTrackingPage() {
  const { token } = useParams();

  // All data: order info, driver location, ETA, socket, polling, geocoding
  const {
    orderInfo,
    driverLocation,
    eta,
    setEta,
    distance,
    setDistance,
    loading,
    error,
    isDelivered,
    driverOffline,
    lastUpdateTime,
    destinationCoords,
  } = useTrackingData(token);

  // All map logic: initialization, markers, route drawing, resize
  const { mapContainerRef } = useTrackingMap({
    orderInfo,
    driverLocation,
    destinationCoords,
    setEta,
    setDistance,
  });

  // Status screens (early returns)
  if (loading) return <TrackingLoading />;
  if (error) return <TrackingError message={error} />;
  if (isDelivered) return <TrackingDelivered orderInfo={orderInfo} />;

  // Main Tracking UI
  return (
    <div className="live-tracking-page">
      {/* Map Container */}
      <div className="tracking-map-container">
        <div ref={mapContainerRef} className="tracking-map" />

        {/* Live badge overlay */}
        <div className="map-live-badge">
          <Radio className="live-dot" />
          <span>LIVE</span>
        </div>

        {/* Driver offline warning */}
        {driverOffline && (
          <div className="map-offline-badge">
            <AlertTriangle className="offline-icon" />
            <span>Driver signal lost</span>
          </div>
        )}
      </div>

      {/* Bottom Sheet (InDrive-style) */}
      <TrackingBottomSheet
        eta={eta}
        distance={distance}
        driverLocation={driverLocation}
        orderInfo={orderInfo}
        lastUpdateTime={lastUpdateTime}
        driverOffline={driverOffline}
      />
    </div>
  );
}

export default LiveTrackingPage;
