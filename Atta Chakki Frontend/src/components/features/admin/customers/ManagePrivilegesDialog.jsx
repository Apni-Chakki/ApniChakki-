import { Award, Ban } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../common/dialog';
import { Button } from '../../../common/button';
import { Input } from '../../../common/input';
import { Label } from '../../../common/label';

/**
 * VIP privileges CRUD modal — create/edit/delete the privileges that can be
 * assigned to VIP customers.
 *
 * Extracted from ManageCustomers.jsx (Phase 3.8c) — behavior preserved exactly.
 */
export function ManagePrivilegesDialog({
  isManagePrivilegesOpen,
  setIsManagePrivilegesOpen,
  privileges,
  privilegeForm,
  setPrivilegeForm,
  privilegeFormErrors,
  privilegeActionLoading,
  handleSavePrivilege,
  handleEditPrivilegeClick,
  handleDeletePrivilege,
  t,
}) {
  return (
    <Dialog open={isManagePrivilegesOpen} onOpenChange={setIsManagePrivilegesOpen}>
      <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-900 text-base sm:text-lg">
            <Award className="h-5 w-5 text-purple-600 shrink-0" />
            {t('Manage VIP Privileges')}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {t('Create, edit, or delete the VIP customer privileges available in the system.')}
          </DialogDescription>
        </DialogHeader>

        {/* Privilege Form */}
        <div className="bg-purple-50/50 p-3 sm:p-4 rounded-xl border border-purple-100 space-y-3 sm:space-y-4">
          <h4 className="text-sm font-bold text-purple-900">
            {privilegeForm.id ? t('Edit Privilege') : t('Create New Privilege')}
          </h4>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="priv-name" className="text-xs font-semibold text-gray-700">
                {t('Privilege Name')}
              </Label>
              <Input
                id="priv-name"
                placeholder={t('e.g., 20% Discount, Priority Support')}
                value={privilegeForm.name}
                onChange={(e) => setPrivilegeForm({ ...privilegeForm, name: e.target.value })}
                className="h-9"
              />
              {privilegeFormErrors.name && (
                <p className="text-[10px] text-red-500">{privilegeFormErrors.name}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="priv-desc" className="text-xs font-semibold text-gray-700">
                {t('Description')}
              </Label>
              <Input
                id="priv-desc"
                placeholder={t('Short description of the benefit')}
                value={privilegeForm.description}
                onChange={(e) => setPrivilegeForm({ ...privilegeForm, description: e.target.value })}
                className="h-9"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="priv-type" className="text-xs font-semibold text-gray-700">
                  {t('Type')}
                </Label>
                <select
                  id="priv-type"
                  value={privilegeForm.type}
                  onChange={(e) => setPrivilegeForm({ ...privilegeForm, type: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                >
                  <option value="discount">{t('Discount')}</option>
                  <option value="free_shipping">{t('Free Shipping')}</option>
                  <option value="custom">{t('Custom / Badge')}</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="priv-val" className="text-xs font-semibold text-gray-700">
                  {t('Value (if applicable)')}
                </Label>
                <Input
                  id="priv-val"
                  type="number"
                  placeholder={t('e.g., 10 for 10%')}
                  value={privilegeForm.value}
                  onChange={(e) => setPrivilegeForm({ ...privilegeForm, value: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            {privilegeForm.id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPrivilegeForm({ id: null, name: '', description: '', type: 'custom', value: 0 })
                }
                className="h-9 w-full sm:w-auto"
              >
                {t('Clear')}
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSavePrivilege}
              disabled={privilegeActionLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white h-9 w-full sm:w-auto"
            >
              {privilegeActionLoading
                ? t('Saving...')
                : privilegeForm.id
                ? t('Update')
                : t('Create')}
            </Button>
          </div>
        </div>

        {/* Privilege List */}
        <div className="space-y-2 mt-4">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {t('Existing Privileges')}
          </h4>
          <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto pr-1">
            {privileges.length === 0 ? (
              <p className="text-sm text-gray-500 py-3 text-center">
                {t('No privileges defined yet.')}
              </p>
            ) : (
              privileges.map((priv) => (
                <div key={priv.id} className="py-2.5 flex items-start justify-between gap-2 group">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="font-semibold text-gray-800 text-sm flex items-center gap-1.5 flex-wrap">
                      <span className="break-words">{priv.name}</span>
                      <span className="text-[9px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded-full uppercase shrink-0">
                        {priv.type}
                      </span>
                    </div>
                    {priv.description && (
                      <p className="text-xs text-gray-500 break-words">{priv.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1.5 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditPrivilegeClick(priv)}
                      className="h-7 w-7 p-0 text-gray-600 hover:text-purple-600"
                      title={t('Edit')}
                    >
                      <Award className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePrivilege(priv.id)}
                      className="h-7 w-7 p-0 text-gray-600 hover:text-red-600"
                      title={t('Delete')}
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-gray-100">
          <Button
            className="bg-gray-950 hover:bg-gray-900 text-white font-medium w-full sm:w-auto"
            onClick={() => setIsManagePrivilegesOpen(false)}
          >
            {t('Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
