import React from 'react';
import { Loader2 } from 'lucide-react';
import { useManageDelivery } from '../../components/features/admin/delivery/useManageDelivery';
import { ManageDeliveryHeader } from '../../components/features/admin/delivery/ManageDeliveryHeader';
import { DeliveryPersonnelList } from '../../components/features/admin/delivery/DeliveryPersonnelList';
import { PersonnelFormDialog } from '../../components/features/admin/delivery/PersonnelFormDialog';

export function ManageDelivery() {
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
  } = useManageDelivery();

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="animate-spin h-8 w-8 mx-auto" />
      </div>
    );
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
    </div>
  );
}
