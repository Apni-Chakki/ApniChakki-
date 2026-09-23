import React from 'react';
import { useTranslation } from 'react-i18next';
import { XCircle, CheckCircle, Clock, Package, Truck, Wheat } from 'lucide-react';
import { STATUS_STEPS } from './trackOrderConstants';

const COMBINED_STATUS_STEPS = [
  { id: 'prep_and_collect', label: 'Prep Goods', icon: Clock },
  { id: 'delivering_and_pickup', label: 'Deliver & Pickup', icon: Truck },
  { id: 'grain_received', label: 'Grain at Chakki', icon: Wheat },
  { id: 'grinding', label: 'Grinding Flour', icon: Package },
  { id: 'final_delivery', label: 'Flour Delivery', icon: Truck },
  { id: 'completed', label: 'Completed', icon: CheckCircle },
];

export function OrderStatusTimeline({ currentStatus, order }) {
  const { t } = useTranslation();

  if (currentStatus === 'cancelled') {
    return (
      <div className="flex items-center justify-center p-6 bg-red-50 rounded-xl border border-red-100">
        <div className="flex flex-col items-center">
          <XCircle className="w-12 h-12 text-red-500 mb-2" />
          <h3 className="text-xl font-bold text-red-700">Order Cancelled</h3>
          <p className="text-red-600 text-sm mt-1 text-center">
            This order has been cancelled and will not be processed.
          </p>
        </div>
      </div>
    );
  }

  const isCombined = order?.is_combined_order === 1 || order?.is_combined_order === '1' || order?.is_combined_order === true;
  const steps = isCombined ? COMBINED_STATUS_STEPS : STATUS_STEPS;

  let activeIndex = 0;
  if (isCombined) {
    const stage = order?.hybrid_stage || 'prep_and_collect';
    const status = currentStatus || order?.status;

    if (status === 'completed' || stage === 'completed') {
      activeIndex = 5;
    } else if (stage === 'final_delivery') {
      activeIndex = 4;
    } else if (stage === 'grinding') {
      activeIndex = 3;
    } else if (stage === 'grain_received' || status === 'arrived_at_shop') {
      activeIndex = 2;
    } else if (stage === 'prep_and_collect') {
      if (status === 'out-for-delivery') {
        activeIndex = 1;
      } else {
        activeIndex = 0;
      }
    } else {
      activeIndex = 0;
    }
  } else {
    const currentStepIndex = STATUS_STEPS.findIndex(s => s.id === currentStatus);
    if (currentStepIndex !== -1) {
      activeIndex = currentStepIndex;
    } else {
      if (['pickup_pending', 'pickup_assigned', 'coming_for_pickup'].includes(currentStatus)) {
        activeIndex = 0;
      } else if (currentStatus === 'arrived_at_shop') {
        activeIndex = 1;
      } else if (currentStatus === 'delivery_assigned') {
        activeIndex = 2; // Ready step
      } else if (currentStatus === 'pending') {
        activeIndex = 0;
      } else {
        activeIndex = STATUS_STEPS.length;
      }
    }
  }

  return (
    <div className="relative pt-8 pb-4">
      <div className="absolute top-12 left-0 w-full h-1 bg-gray-200 rounded-full" style={{ zIndex: 0 }} />
      <div
        className="absolute top-12 left-0 h-1 bg-primary rounded-full transition-all duration-500"
        style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%`, zIndex: 0 }}
      />
      <div className="flex justify-between relative" style={{ zIndex: 1 }}>
        {steps.map((step, index) => {
          const isCompleted = index < activeIndex;
          const isCurrent = index === activeIndex;
          const StepIcon = step.icon;
          return (
            <div key={step.id} className="flex flex-col items-center w-16 sm:w-20">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-4 transition-colors duration-300 ${
                  isCompleted
                    ? 'bg-primary border-primary/20 text-white'
                    : isCurrent
                    ? 'bg-white border-primary text-primary shadow-md'
                    : 'bg-white border-gray-200 text-gray-400'
                }`}
              >
                {isCompleted ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : <StepIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
              </div>
              <div
                className={`mt-2.5 text-[11px] sm:text-xs font-semibold text-center leading-tight ${
                  isCurrent ? 'text-primary/90 font-bold' : isCompleted ? 'text-primary' : 'text-gray-400'
                }`}
              >
                {t(step.label)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
