import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '../../../common/button';
import { PageHeader } from '../../../shared/PageHeader';

export function ManageDeliveryHeader({ onAddClick }) {
  const { t } = useTranslation();

  return (
    <PageHeader
      title={t('Manage Delivery Personnel')}
      subtitle={t('Add and manage delivery team members')}
      actions={
        <Button onClick={onAddClick} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2 shrink-0" />
          {t('Add Personnel')}
        </Button>
      }
    />
  );
}
