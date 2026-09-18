import React from 'react';
import { MessageCircle, Printer } from 'lucide-react';
import { Button } from '@/components/common/button';

export default function SlipActionButtons({
  onWhatsAppShare,
  onPrint,
  onClose,
  language = 'en'
}) {
  const isUrdu = language === 'ur';

  return (
    <div className="flex flex-col sm:flex-row gap-2 px-5 py-4 border-t border-border/50 bg-background">
      <Button
        onClick={onWhatsAppShare}
        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm h-9 font-medium"
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        {isUrdu ? 'واٹس ایپ' : 'WhatsApp'}
      </Button>
      <Button
        onClick={onPrint}
        className="flex-1 bg-primary hover:bg-primary/90 text-sm h-9 font-semibold"
      >
        <Printer className="h-4 w-4 mr-2" />
        {isUrdu ? 'بل پرنٹ کریں' : 'Print Slip'}
      </Button>
      <Button
        onClick={onClose}
        variant="outline"
        className="flex-1 text-sm h-9"
      >
        {isUrdu ? 'بند کریں' : 'Close'}
      </Button>
    </div>
  );
}
