import React from 'react';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import './TrackingStatusScreens.css';

export function TrackingLoading() {
  return (
    <div className="live-tracking-loading">
      <div className="loading-spinner">
        <Loader2 className="loading-icon" />
        <h2>Loading Tracking...</h2>
        <p>Connecting to delivery server</p>
      </div>
    </div>
  );
}

export function TrackingError({ message }) {
  return (
    <div className="live-tracking-error">
      <div className="error-card">
        <AlertTriangle className="error-icon" />
        <h2>Tracking Unavailable</h2>
        <p>{message}</p>
      </div>
    </div>
  );
}

export function TrackingDelivered({ orderInfo }) {
  return (
    <div className="live-tracking-delivered">
      <div className="delivered-card">
        <div className="delivered-checkmark">
          <CheckCircle2 className="delivered-icon" />
        </div>
        <h2>Order Delivered! 🎉</h2>
        <p>Your order #{orderInfo?.order_id} has been delivered successfully.</p>
        {orderInfo?.driver_name && (
          <p className="delivered-driver">Delivered by <strong>{orderInfo.driver_name}</strong></p>
        )}
        <p className="delivered-thanks">Thank you for choosing Suchi Chakki! ⭐</p>
      </div>
    </div>
  );
}
