import React from 'react';
import { MapPin, Phone, Navigation, Clock, Truck, Loader2, Shield, Star, Package } from 'lucide-react';

// Time ago helper
function timeAgo(timestamp) {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

// Speed formatting
function formatSpeed(speedMs) {
  if (!speedMs || speedMs < 0.5) return 'Stopped';
  const kmh = (speedMs * 3.6).toFixed(0);
  return `${kmh} km/h`;
}

export function TrackingBottomSheet({ eta, distance, driverLocation, orderInfo, lastUpdateTime, driverOffline }) {
  return (
    <div className="tracking-bottom-sheet">
      {/* ETA Header */}
      <div className="eta-header">
        <div className="eta-pill">
          {eta ? (
            <>
              <Clock className="eta-clock-icon" />
              <span className="eta-time">{eta.text}</span>
            </>
          ) : (
            <>
              <Loader2 className="eta-clock-icon spinning" />
              <span className="eta-time">Calculating...</span>
            </>
          )}
        </div>
        {distance && (
          <span className="distance-text">{distance.text} away</span>
        )}
      </div>

      {/* ETA Card */}
      <div className="eta-card">
        <div className="eta-card-content">
          <div className="eta-main">
            <Navigation className="eta-nav-icon" />
            <div>
              <p className="eta-label">Estimated Arrival</p>
              <p className="eta-value">
                {eta
                  ? `Driver is ${distance?.text || '...'} away — ${eta.text} to arrive`
                  : 'Calculating route...'
                }
              </p>
            </div>
          </div>
          {driverLocation && (
            <div className="eta-speed">
              <Truck className="speed-icon" />
              <span>{formatSpeed(driverLocation.speed)}</span>
            </div>
          )}
        </div>
        {lastUpdateTime && (
          <p className="last-update">Last updated: {timeAgo(lastUpdateTime)}</p>
        )}
      </div>

      {/* Driver Info */}
      {orderInfo && (
        <div className="driver-card">
          <div className="driver-info">
            <div className="driver-avatar">
              <Truck className="avatar-icon" />
            </div>
            <div className="driver-details">
              <p className="driver-name">{orderInfo.driver_name || 'Your Driver'}</p>
              <p className="driver-subtitle">
                <Shield className="verified-icon" />
                Verified Driver • Order #{orderInfo.order_id}
              </p>
            </div>
            <div className="driver-rating">
              <Star className="star-icon" />
              <span>4.9</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="driver-actions">
            {orderInfo.driver_phone && (
              <a href={`tel:${orderInfo.driver_phone}`} className="action-btn call-btn">
                <Phone className="action-icon" />
                <span>Call Driver</span>
              </a>
            )}
            <a
              href={driverLocation
                ? `https://www.google.com/maps?q=${driverLocation.lat},${driverLocation.lng}`
                : '#'
              }
              target="_blank"
              rel="noopener noreferrer"
              className="action-btn maps-btn"
            >
              <Navigation className="action-icon" />
              <span>Open Maps</span>
            </a>
          </div>
        </div>
      )}

      {/* Delivery Details */}
      {orderInfo && (
        <div className="delivery-details-card">
          <div className="detail-row">
            <MapPin className="detail-icon destination-icon" />
            <div>
              <p className="detail-label">Delivering to</p>
              <p className="detail-value">{orderInfo.shipping_address || 'Address not available'}</p>
            </div>
          </div>
          <div className="detail-divider" />
          <div className="detail-row">
            <Package className="detail-icon package-icon" />
            <div>
              <p className="detail-label">Order Total</p>
              <p className="detail-value amount">Rs. {parseFloat(orderInfo.total_amount || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Branding Footer */}
      <div className="tracking-footer">
        <p>🌾 Powered by <strong>Suchi Chakki</strong></p>
      </div>
    </div>
  );
}

export default TrackingBottomSheet;
