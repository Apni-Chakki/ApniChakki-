import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../common/dialog';
import { Button } from '../../../common/button';
import { Input } from '../../../common/input';
import { Label } from '../../../common/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export function PersonnelFormDialog({
  isOpen,
  onOpenChange,
  mode = 'add',
  formData,
  setFormData,
  showPassword,
  setShowPassword,
  onSubmit,
  isProcessing,
  onCancel,
}) {
  const { t } = useTranslation();
  const isEdit = mode === 'edit';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[390px] max-h-[88vh] flex flex-col p-4 sm:p-5 gap-0 overflow-hidden rounded-2xl shadow-2xl">
        <DialogHeader className="pb-3 border-b border-border/40 shrink-0 text-left pr-6">
          <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
            {isEdit ? t('Edit Delivery Personnel') : t('Add Delivery Personnel')}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
            {isEdit
              ? t('Update personnel information. Leave password blank to keep current password.')
              : t("Add a new member to your delivery team. They'll receive login credentials to access the delivery panel.")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="space-y-3 sm:space-y-3.5 py-3 sm:py-4 px-0.5 overflow-y-auto flex-1 custom-modal-scrollbar pr-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${mode}-name`} className="text-sm">Full Name</Label>
              <Input
                id={`${mode}-name`}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${mode}-email`} className="text-sm">Email</Label>
              <Input
                id={`${mode}-email`}
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@gristmill.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${mode}-phone`} className="text-sm">Phone Number</Label>
              <Input
                id={`${mode}-phone`}
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                placeholder="03001234567"
                required
                maxLength={11}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${mode}-cnic`} className="text-sm">{t('CNIC Number')}</Label>
              <Input
                id={`${mode}-cnic`}
                value={formData.cnic}
                onChange={(e) => setFormData({ ...formData, cnic: e.target.value.replace(/\D/g, '') })}
                placeholder="3520112345671"
                required
                maxLength={13}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${mode}-address`} className="text-sm">
                {t('Delivery Address')} <span className="text-muted-foreground font-normal">{t('(Optional)')}</span>
              </Label>
              <Input
                id={`${mode}-address`}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value.replace(/^ /, '').replace(/  +/g, ' ') })}
                placeholder={t('Enter street address')}
                maxLength={150}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${mode}-password`} className="text-sm">
                {isEdit ? t('New Password (Optional)') : t('Password')}
              </Label>
              <div className="relative">
                <Input
                  id={`${mode}-password`}
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value.replace(/\s/g, '') })}
                  placeholder={isEdit ? t('Type to change password') : t('Create a password')}
                  required={!isEdit}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {t('8–50 chars · starts with capital · must include a number & special character')}
              </p>
            </div>
          </div>
          <DialogFooter className="pt-3 mt-1 border-t border-border/40 shrink-0 flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="w-full sm:flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="outline"
              disabled={isProcessing}
              className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-primary-foreground border-primary hover:border-primary"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEdit ? (
                t('Update Personnel')
              ) : (
                t('Add Personnel')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
