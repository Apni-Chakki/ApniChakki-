import React from 'react';
import { MessageCircle, Printer } from 'lucide-react';
import { Button } from '@/components/common/button';

export default function SlipActionButtons({
  onWhatsAppShare,
  onPrint,
  onClose
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 px-5 py-4 border-t border-border/50 bg-background">
      <Button
        onClick={onWhatsAppShare}
        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm h-9"
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        WhatsApp
      </Button>
      <Button
        onClick={onPrint}
        className="flex-1 bg-primary hover:bg-primary/90 text-sm h-9"
      >
        <Printer className="h-4 w-4 mr-2" />
        Print Slip
      </Button>
      <Button
        onClick={onClose}
        variant="outline"
        className="flex-1 text-sm h-9"
      >
        Close
      </Button>
    </div>
  );
}
