import React from 'react';
import { useTranslation } from 'react-i18next';
import { XCircle, CheckCircle } from 'lucide-react';
import { STATUS_STEPS } from './trackOrderConstants';

export function OrderStatusTimeline({ currentStatus }) {
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

  let activeIndex = 0;
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

  return (
    <div className="relative pt-8 pb-4">
      <div className="absolute top-12 left-0 w-full h-1 bg-gray-200 rounded-full" style={{ zIndex: 0 }} />
      <div
        className="absolute top-12 left-0 h-1 bg-primary rounded-full transition-all duration-500"
        style={{ width: `${(activeIndex / (STATUS_STEPS.length - 1)) * 100}%`, zIndex: 0 }}
      />
      <div className="flex justify-between relative" style={{ zIndex: 1 }}>
        {STATUS_STEPS.map((step, index) => {
          const isCompleted = index < activeIndex;
          const isCurrent = index === activeIndex;
          const StepIcon = step.icon;
          return (
            <div key={step.id} className="flex flex-col items-center w-20">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-colors duration-300 ${
                  isCompleted
                    ? 'bg-primary border-primary/20 text-white'
                    : isCurrent
                    ? 'bg-white border-primary text-primary shadow-md'
                    : 'bg-white border-gray-200 text-gray-400'
                }`}
              >
                {isCompleted ? <CheckCircle className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
              </div>
              <div
                className={`mt-3 text-xs font-semibold text-center ${
                  isCurrent ? 'text-primary/90' : isCompleted ? 'text-primary' : 'text-gray-400'
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
