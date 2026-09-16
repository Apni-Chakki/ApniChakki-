import { Award, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../common/dialog';
import { Button } from '../../../common/button';
import { Label } from '../../../common/label';

/**
 * VIP-status configuration modal on Manage Customers.
 * Toggles a customer's `is_vip` flag and their selected privilege IDs.
 *
 * Extracted from ManageCustomers.jsx (Phase 3.8b) — behavior preserved exactly.
 */
export function VipConfigDialog({
  isVipModalOpen,
  setIsVipModalOpen,
  selectedCustomer,
  vipForm,
  setVipForm,
  vipLoading,
  handleSaveVip,
  privileges,
  t,
}) {
  return (
    <Dialog open={isVipModalOpen} onOpenChange={setIsVipModalOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-900">
            <Award className="h-5 w-5 text-purple-600" />
            {t('Configure VIP Status')}
          </DialogTitle>
          <DialogDescription>
            {t('Manage VIP privileges for')}{' '}
            <strong className="text-gray-900">{selectedCustomer?.full_name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold text-purple-900">
                {t('Promote to VIP Member')}
              </Label>
              <p className="text-xs text-purple-700">
                {t('Enable VIP badges and special benefits.')}
              </p>
            </div>
            <input
              type="checkbox"
              checked={vipForm.is_vip}
              onChange={(e) => {
                const val = e.target.checked;
                setVipForm({
                  ...vipForm,
                  is_vip: val,
                  // Clear selected privileges if not VIP
                  privilege_ids: val ? vipForm.privilege_ids : [],
                });
              }}
              className="w-5 h-5 accent-purple-600 cursor-pointer rounded"
            />
          </div>

          <div
            className={`space-y-3 p-3 border rounded-lg transition-all ${
              vipForm.is_vip
                ? 'border-gray-200 bg-white'
                : 'border-gray-100 bg-gray-50/50 opacity-60 pointer-events-none'
            }`}
          >
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {t('Active Privileges')}
            </h4>

            {privileges.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                {t('No privileges defined. Create some first.')}
              </p>
            ) : (
              privileges.map((priv, idx) => (
                <div key={priv.id}>
                  {idx > 0 && <hr className="border-gray-100 my-2" />}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold text-gray-800">{priv.name}</Label>
                      {priv.description && (
                        <p className="text-xs text-gray-500">{priv.description}</p>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      disabled={!vipForm.is_vip}
                      checked={vipForm.privilege_ids.includes(priv.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        let nextIds = [...vipForm.privilege_ids];
                        if (checked) {
                          if (!nextIds.includes(priv.id)) nextIds.push(priv.id);
                        } else {
                          nextIds = nextIds.filter((id) => id !== priv.id);
                        }
                        setVipForm({ ...vipForm, privilege_ids: nextIds });
                      }}
                      className="w-4 h-4 accent-purple-600 cursor-pointer rounded"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsVipModalOpen(false)} disabled={vipLoading}>
            {t('Cancel')}
          </Button>
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium"
            onClick={handleSaveVip}
            disabled={vipLoading}
          >
            {vipLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('Saving...')}
              </>
            ) : (
              t('Save Changes')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
