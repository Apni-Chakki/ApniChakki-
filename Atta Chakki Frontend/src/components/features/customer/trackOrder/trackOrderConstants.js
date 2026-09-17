import { Clock, Package, CheckCircle, Truck } from 'lucide-react';

export const STATUS_STEPS = [
  { id: 'pending', label: 'Order Received', icon: Clock },
  { id: 'processing', label: 'Processing', icon: Package },
  { id: 'ready', label: 'Ready', icon: CheckCircle },
  { id: 'out-for-delivery', label: 'Out for Delivery', icon: Truck },
  { id: 'completed', label: 'Completed', icon: CheckCircle },
];

export const CAROUSEL_SLIDES = [
  'https://images.unsplash.com/photo-1731082300550-8093311708ef?w=1400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1565607052745-35f8c6ba59b1?w=1400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1623066798929-946425dbe1b0?w=1400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=1400&auto=format&fit=crop&q=80',
];

export const glassCard = {
  background: 'rgba(255,255,255,0.93)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.4)',
  boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
  borderRadius: '1rem',
};

export const backBtnBase = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.375rem',
  color: 'white',
  background: 'rgba(255,255,255,0.15)',
  border: '1px solid rgba(255,255,255,0.3)',
  borderRadius: '0.5rem',
  padding: '0.45rem 0.875rem',
  fontSize: '0.875rem',
  fontWeight: 500,
  cursor: 'pointer',
  backdropFilter: 'blur(6px)',
  transition: 'background 0.2s',
};

export const avatarCircle = {
  margin: '0 auto 0.75rem',
  height: '3.25rem',
  width: '3.25rem',
  borderRadius: '50%',
  background: 'var(--primary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
  flexShrink: 0,
};

export const getStatusInfo = (status) => {
  switch (status) {
    case 'pending':
    case 'pickup_pending':
      return { color: 'text-orange-600', bg: 'bg-orange-100', dot: 'bg-orange-500' };
    case 'pickup_assigned':
    case 'coming_for_pickup':
      return { color: 'text-amber-600', bg: 'bg-amber-100', dot: 'bg-amber-500' };
    case 'arrived_at_shop':
    case 'processing':
      return { color: 'text-blue-600', bg: 'bg-blue-100', dot: 'bg-blue-500' };
    case 'ready':
    case 'delivery_assigned':
      return { color: 'text-indigo-600', bg: 'bg-indigo-100', dot: 'bg-indigo-500' };
    case 'out-for-delivery':
      return { color: 'text-purple-600', bg: 'bg-purple-100', dot: 'bg-purple-500' };
    case 'completed':
      return { color: 'text-primary', bg: 'bg-primary/10', dot: 'bg-primary' };
    case 'cancelled':
      return { color: 'text-red-600', bg: 'bg-red-100', dot: 'bg-red-500' };
    default:
      return { color: 'text-gray-600', bg: 'bg-gray-100', dot: 'bg-gray-500' };
  }
};
