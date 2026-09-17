import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Clock,
  AlertCircle,
  Phone,
  User,
  MessageSquare,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/common/select';
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge';
import { sendWhatsAppMessage } from '@/utils/whatsappHelper';

export default function CustomMixCard({
  request,
  isExpanded,
  onToggleExpand,
  onStatusUpdate,
  onOpenConvertModal,
  getStatusColor
}) {
  return (
    <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
      <div
        className="p-3 sm:p-4 flex items-center justify-between gap-2 cursor-pointer bg-white hover:bg-slate-50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <div
            className={`p-2 rounded-full flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 shrink-0 ${getStatusColor(
              request.status
            ).replace('border-', '')}`}
          >
            {request.status === 'pending' ? (
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : request.status === 'completed' ? (
              <Check className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-sm sm:text-lg text-slate-800 flex flex-wrap items-baseline gap-x-1 break-words">
              <span className="break-words">{request.customer_name}</span>
              <span className="text-[11px] sm:text-sm font-normal text-slate-500 break-all">
                ({request.customer_phone})
              </span>
            </h3>
            <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[11px] sm:text-sm text-slate-600 mt-0.5 sm:mt-1">
              <span className="font-semibold text-primary break-words">{request.product_name}</span>
              <span className="hidden sm:inline">•</span>
              <span className="break-words">{new Date(request.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-4 shrink-0">
          <OrderStatusBadge status={request.status} />
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t bg-slate-50/50"
          >
            <div className="p-4 grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-700 flex items-center gap-2 border-b pb-2">
                  <MessageSquare className="w-4 h-4 text-primary" /> Request Details
                </h4>

                {request.custom_items && (
                  <div className="bg-white p-3 rounded-lg border shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Customer Message</p>
                    <p className="text-slate-800 text-sm whitespace-pre-wrap">{request.custom_items}</p>
                  </div>
                )}

                {request.selected_items && request.selected_items.length > 0 && (
                  <div className="bg-white p-3 rounded-lg border shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Base Ingredients Selected</p>
                    <div className="space-y-2">
                      {request.selected_items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between text-sm border-b border-slate-100 last:border-0 pb-1 last:pb-0"
                        >
                          <span className="font-medium text-slate-700">{item.item_name}</span>
                          <span className="text-slate-500">
                            Ratio: <span className="font-bold text-primary">{item.ratio}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-slate-700 flex items-center gap-2 border-b pb-2">
                  <User className="w-4 h-4 text-primary" /> Contact Actions
                </h4>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                    onClick={() => sendWhatsAppMessage(request.customer_phone)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                    onClick={() => window.open(`tel:${request.customer_phone}`, '_self')}
                  >
                    <Phone className="w-4 h-4 mr-2" /> Call
                  </Button>
                </div>

                <div className="bg-white p-4 rounded-lg border shadow-sm space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase">Update Status</p>
                  <Select value={request.status} onValueChange={(val) => onStatusUpdate(request.id, val)}>
                    <SelectTrigger className="w-full font-semibold">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending" className="font-semibold text-yellow-600">
                        Pending
                      </SelectItem>
                      <SelectItem value="contacted" className="font-semibold text-blue-600">
                        Contacted
                      </SelectItem>
                      <SelectItem value="completed" className="font-semibold text-green-600">
                        Completed
                      </SelectItem>
                      <SelectItem value="cancelled" className="font-semibold text-red-600">
                        Cancelled
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="pt-2 border-t border-slate-100">
                    <Button
                      className="w-full bg-primary hover:bg-primary/95 text-white font-extrabold h-9 shadow-md flex items-center justify-center gap-1.5 rounded-lg text-xs"
                      onClick={() => onOpenConvertModal(request)}
                    >
                      <Check className="w-4.5 h-4.5" /> Convert to Active Order
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
