import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '../../../common/button';
import { API_BASE_URL } from '../../../../config';

export function useManageDelivery() {
  const { t } = useTranslation();
  const [personnelList, setPersonnelList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    cnic: '',
    address: '',
  });

  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const fetchPersonnel = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/manage_delivery.php`);
      const data = await response.json();
      if (data.success) {
        setPersonnelList(data.personnel);
      }
    } catch (error) {
      console.error('Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPersonnel();
  }, [fetchPersonnel]);

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', password: '', cnic: '', address: '' });
    setShowAddPassword(false);
    setShowEditPassword(false);
  };

  const validatePassword = (password, isOptional = false) => {
    if (isOptional && !password) return true;
    if (/\s/.test(password)) {
      toast.error(t('Password must not contain spaces.'));
      return false;
    }
    if (password.length < 8) {
      toast.error(t('Password must be at least 8 characters.'));
      return false;
    }
    if (password.length > 50) {
      toast.error(t('Password must not exceed 50 characters.'));
      return false;
    }
    if (!/^[A-Z]/.test(password)) {
      toast.error(t('Password must start with a capital letter.'));
      return false;
    }
    if (!/[0-9]/.test(password)) {
      toast.error(t('Password must contain at least one number.'));
      return false;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      toast.error(t('Password must contain at least one special character.'));
      return false;
    }
    return true;
  };

  const handleAddPersonnel = async (e) => {
    e.preventDefault();
    if (!validatePassword(formData.password)) {
      return;
    }
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!/^0\d{10}$/.test(cleanPhone)) {
      toast.error(t('Phone number must start with 0 and be exactly 11 digits.'));
      return;
    }
    const cleanCnic = formData.cnic.replace(/\D/g, '');
    if (!/^\d{13}$/.test(cleanCnic)) {
      toast.error(t('CNIC must be exactly 13 digits.'));
      return;
    }
    setIsProcessing(true);

    try {
      const response = await fetch(`${API_BASE_URL}/manage_delivery.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...formData })
      });

      const rawText = await response.text();
      try {
        const result = JSON.parse(rawText);
        if (result.success) {
          toast.success('Delivery personnel added successfully');
          fetchPersonnel();
          setIsAddDialogOpen(false);
          resetForm();
        } else {
          toast.error(result.message || 'Failed to add personnel');
        }
      } catch (parseError) {
        alert('PHP Error Occurred:\n\n' + rawText);
        toast.error('Server returned an invalid response.');
      }
    } catch (error) {
      toast.error('Connection failed completely.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditClick = (personnel) => {
    setEditingPersonnel(personnel);
    setFormData({
      name: personnel.name,
      email: personnel.email || '',
      phone: personnel.phone,
      password: '',
      cnic: personnel.cnic || '',
      address: personnel.address || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdatePersonnel = async (e) => {
    e.preventDefault();
    if (!editingPersonnel) return;
    if (formData.password && !validatePassword(formData.password, true)) {
      return;
    }
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!/^0\d{10}$/.test(cleanPhone)) {
      toast.error(t('Phone number must start with 0 and be exactly 11 digits.'));
      return;
    }
    const cleanCnic = formData.cnic.replace(/\D/g, '');
    if (!/^\d{13}$/.test(cleanCnic)) {
      toast.error(t('CNIC must be exactly 13 digits.'));
      return;
    }
    setIsProcessing(true);

    try {
      const response = await fetch(`${API_BASE_URL}/manage_delivery.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id: editingPersonnel.id, ...formData })
      });

      const rawText = await response.text();
      try {
        const result = JSON.parse(rawText);
        if (result.success) {
          toast.success('Delivery personnel updated successfully');
          fetchPersonnel();
          setIsEditDialogOpen(false);
          setEditingPersonnel(null);
          resetForm();
        } else {
          toast.error(result.message || 'Update failed');
        }
      } catch (e) {
        alert('PHP Error:\n' + rawText);
      }
    } catch (error) {
      toast.error('Network Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleActive = async (personnel) => {
    try {
      const response = await fetch(`${API_BASE_URL}/manage_delivery.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id: personnel.id, isActive: personnel.isActive ? 0 : 1 })
      });
      const result = await response.json();

      if (result.success) {
        toast.success(personnel.isActive ? 'Personnel deactivated' : 'Personnel activated');
        fetchPersonnel();
      }
    } catch (error) {
      toast.error('Failed to change status');
    }
  };

  const handleDelete = (id) => {
    const deletePersonnel = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/manage_delivery.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id })
        });
        const result = await response.json();

        if (result.success) {
          toast.success('Delivery personnel deleted');
          fetchPersonnel();
        }
      } catch (error) {
        toast.error('Failed to delete');
      }
    };

    toast.custom((toastId) => (
      <div className="bg-primary border border-primary-foreground/20 rounded-lg p-4 shadow-xl flex flex-col gap-3 max-w-sm">
        <p className="text-primary-foreground font-medium">Are you sure you want to delete this delivery personnel?</p>
        <div className="flex gap-2 justify-end">
          <Button
            onClick={() => toast.dismiss(toastId)}
            variant="outline"
            size="sm"
            className="bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 border-transparent"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              toast.dismiss(toastId);
              deletePersonnel();
            }}
            size="sm"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent"
          >
            Delete
          </Button>
        </div>
      </div>
    ));
  };

  return {
    personnelList,
    loading,
    isProcessing,
    isAddDialogOpen,
    setIsAddDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    editingPersonnel,
    setEditingPersonnel,
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
  };
}
