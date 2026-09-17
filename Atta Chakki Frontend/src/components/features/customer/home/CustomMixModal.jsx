import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../common/dialog';
import { Input } from '../../../common/input';
import { Label } from '../../../common/label';
import { Textarea } from '../../../common/textarea';
import { Button } from '../../../common/button';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../../../config';

export function CustomMixModal({ open, onOpenChange, t }) {
  const [mixFormData, setMixFormData] = useState({ name: '', phone: '', details: '' });
  const [isSubmittingMix, setIsSubmittingMix] = useState(false);

  const handleCustomMixSubmit = async (e) => {
    e.preventDefault();
    if (!mixFormData.name || !mixFormData.phone || !mixFormData.details) {
      toast.error(t('Please fill all fields'));
      return;
    }
    setIsSubmittingMix(true);
    try {
      const response = await fetch(`${API_BASE_URL}/submit_custom_mix_request.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: mixFormData.name,
          customer_phone: mixFormData.phone,
          customer_email: 'custom.mix@apnichakki.com',
          product_name: 'General Custom Mix Request',
          custom_items: mixFormData.details,
          total_quantity: 5,
          estimated_price: 0
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('Custom Mix request sent! We will call you soon.'));
        onOpenChange(false);
        setMixFormData({ name: '', phone: '', details: '' });
      } else {
        toast.error(data.message || t('Failed to send request'));
      }
    } catch (error) {
      toast.error(t('Network error. Please try again.'));
    } finally {
      setIsSubmittingMix(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{t('Design Your Custom Mix')}</DialogTitle>
          <DialogDescription>
            {t('Tell us exactly what you need. E.g., 5kg Wheat + 1kg Barley + 500g Oats.')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCustomMixSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="mixName">{t('Your Name')}</Label>
            <Input
              id="mixName"
              placeholder={t('Enter your full name')}
              value={mixFormData.name}
              onChange={e => setMixFormData({ ...mixFormData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mixPhone">{t('Phone Number')}</Label>
            <Input
              id="mixPhone"
              type="tel"
              placeholder="03xx xxxxxxx"
              value={mixFormData.phone}
              onChange={e => setMixFormData({ ...mixFormData, phone: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mixDetails">{t('Mix Details (Ingredients & Quantities)')}</Label>
            <Textarea
              id="mixDetails"
              placeholder={t('E.g. 5kg Wheat flour, 2kg Multigrain...')}
              rows={4}
              value={mixFormData.details}
              onChange={e => setMixFormData({ ...mixFormData, details: e.target.value })}
              required
            />
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={isSubmittingMix} className="min-w-[120px]">
              {isSubmittingMix ? t('Sending...') : t('Submit Request')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CustomMixModal;
