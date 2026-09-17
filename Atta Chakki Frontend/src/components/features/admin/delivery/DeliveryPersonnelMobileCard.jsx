import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../../common/badge';
import { Button } from '../../../common/button';
import { UserCheck, UserX, Edit2, Trash2 } from 'lucide-react';

export function DeliveryPersonnelMobileCard({ personnel, onToggleActive, onEdit, onDelete }) {
  const { t } = useTranslation();

  return (
    <div className="border rounded-lg p-3 bg-card space-y-2.5">
      <div className="flex items-start justify-between gap-2 pb-2 border-b border-border">
        <p className="font-semibold text-sm break-words min-w-0 flex-1">{personnel.name}</p>
        {personnel.isActive ? (
          <Badge className="bg-success text-success-foreground shrink-0 text-[10px]">Active</Badge>
        ) : (
          <Badge variant="secondary" className="shrink-0 text-[10px]">Inactive</Badge>
        )}
      </div>
      <div className="text-xs space-y-1">
        <p className="text-muted-foreground break-all">{personnel.email}</p>
        <p className="text-muted-foreground break-all">{personnel.phone}</p>
        <p className="text-muted-foreground break-all">{t('CNIC Number')}: {personnel.cnic}</p>
        {personnel.address && (
          <p className="text-muted-foreground break-all">{t('Delivery Address')}: {personnel.address}</p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className={`w-full ${personnel.isActive ? 'border-orange-300 hover:bg-orange-50' : 'border-green-300 hover:bg-green-50'}`}
          onClick={() => onToggleActive(personnel)}
        >
          {personnel.isActive ? (
            <UserX className="h-4 w-4 text-orange-500" />
          ) : (
            <UserCheck className="h-4 w-4 text-green-600" />
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full border-blue-200 hover:bg-blue-50"
          onClick={() => onEdit(personnel)}
        >
          <Edit2 className="h-4 w-4 text-blue-600" />
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => onDelete(personnel.id)}
        >
          <Trash2 className="h-4 w-4 text-white" />
        </Button>
      </div>
    </div>
  );
}
