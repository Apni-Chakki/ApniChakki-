import React from 'react';
import { useTranslation } from 'react-i18next';
import { useManageDelivery } from '../../components/features/admin/delivery/useManageDelivery';
import { ManageDeliveryHeader } from '../../components/features/admin/delivery/ManageDeliveryHeader';
import { DeliveryPersonnelList } from '../../components/features/admin/delivery/DeliveryPersonnelList';
import { PersonnelFormDialog } from '../../components/features/admin/delivery/PersonnelFormDialog';
import { Loading } from '../../components/shared/Loading';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';

export function ManageDelivery() {
  const { t } = useTranslation();
  const {
    personnelList,
    loading,
    isProcessing,
    isAddDialogOpen,
    setIsAddDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    formData,
    setFormData,
    showAddPassword,
    setShowAddPassword,
    showEditPassword,
    setShowEditPassword,
    resetForm,
    handleAddPersonnel,
    handleEditClick,
    handleUpdatePersonnel,
    handleToggleActive,
    handleDelete,
    deleteConfirmId,
    setDeleteConfirmId,
    isDeleting,
    confirmDelete,
  } = useManageDelivery();

  if (loading) {
    return <Loading label={t('Loading delivery personnel...')} className="p-8" />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <ManageDeliveryHeader onAddClick={() => setIsAddDialogOpen(true)} />

      <DeliveryPersonnelList
        personnelList={personnelList}
        onAddClick={() => setIsAddDialogOpen(true)}
        onToggleActive={handleToggleActive}
        onEdit={handleEditClick}
        onDelete={handleDelete}
      />

      {/* Add Personnel Dialog */}
      <PersonnelFormDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        mode="add"
        formData={formData}
        setFormData={setFormData}
        showPassword={showAddPassword}
        setShowPassword={setShowAddPassword}
        onSubmit={handleAddPersonnel}
        isProcessing={isProcessing}
        onCancel={() => {
          setIsAddDialogOpen(false);
          resetForm();
        }}
      />

      {/* Edit Personnel Dialog */}
      <PersonnelFormDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        mode="edit"
        formData={formData}
        setFormData={setFormData}
        showPassword={showEditPassword}
        setShowPassword={setShowEditPassword}
        onSubmit={handleUpdatePersonnel}
        isProcessing={isProcessing}
        onCancel={() => {
          setIsEditDialogOpen(false);
          resetForm();
        }}
      />

      <ConfirmDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}
        title={t('Delete Personnel?')}
        description={t('Are you sure you want to delete this delivery personnel? This action cannot be undone.')}
        confirmLabel={t('Delete')}
        cancelLabel={t('Cancel')}
        destructive
        loading={isDeleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
