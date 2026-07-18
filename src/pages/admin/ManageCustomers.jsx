import { useState, useEffect } from 'react';
import { Search, User, Mail, Phone, Award, Ban, CheckCircle, MessageSquare, Loader2, Sparkles, UserCheck } from 'lucide-react';
import { Button } from '../../components/common/button';
import { Card } from '../../components/common/card';
import { Input } from '../../components/common/input';
import { Label } from '../../components/common/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/common/dialog';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';
import { useTranslation } from 'react-i18next';

export function ManageCustomers() {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [privileges, setPrivileges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // VIP assign Modal states
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);
  const [vipLoading, setVipLoading] = useState(false);
  const [vipForm, setVipForm] = useState({
    is_vip: false,
    privilege_ids: []
  });

  // Privilege manager Modal states
  const [isManagePrivilegesOpen, setIsManagePrivilegesOpen] = useState(false);
  const [privilegeForm, setPrivilegeForm] = useState({
    id: null,
    name: '',
    description: '',
    type: 'custom',
    value: 0
  });
  const [privilegeFormErrors, setPrivilegeFormErrors] = useState({});
  const [privilegeActionLoading, setPrivilegeActionLoading] = useState(false);

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/get_customers.php`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers);
      } else {
        toast.error(data.message || t('Failed to load customers'));
      }
    } catch (err) {
      toast.error(t('Network error while fetching customers'));
    } finally {
      setLoading(false);
    }
  };

  const fetchPrivileges = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/get_vip_privileges.php`);
      const data = await res.json();
      if (data.success) {
        setPrivileges(data.privileges);
      }
    } catch (err) {
      console.error('Error fetching privileges:', err);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchPrivileges();
  }, []);

  const handleToggleStatus = async (customer) => {
    const nextActive = !customer.is_active;
    const actionLabel = nextActive ? t('Enable') : t('Disable');
    
    toast.warning(t('Are you sure you want to {{action}} this customer account?', { action: actionLabel }), {
      action: {
        label: t('Yes'),
        onClick: async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/toggle_customer_status.php`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: customer.id,
                is_active: nextActive ? 1 : 0
              })
            });
            const data = await res.json();
            if (data.success) {
              toast.success(data.message || t('Customer status updated'));
              fetchCustomers();
            } else {
              toast.error(data.message || t('Failed to update status'));
            }
          } catch (err) {
            toast.error(t('Network error'));
          }
        }
      },
      cancel: {
        label: t('Cancel'),
        onClick: () => {}
      }
    });
  };

  const handleOpenVipModal = (customer) => {
    setSelectedCustomer(customer);
    setVipForm({
      is_vip: customer.is_vip,
      privilege_ids: customer.privilege_ids || []
    });
    setIsVipModalOpen(true);
  };

  const handleSaveVip = async () => {
    if (!selectedCustomer) return;
    setVipLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/promote_to_vip.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedCustomer.id,
          is_vip: vipForm.is_vip ? 1 : 0,
          privilege_ids: vipForm.privilege_ids
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || t('VIP Privileges updated successfully!'));
        if (data.email_sent) {
          toast.success(t('Congratulatory email sent to customer.'));
        }
        setIsVipModalOpen(false);
        fetchCustomers();
      } else {
        toast.error(data.message || t('Failed to update VIP privileges'));
      }
    } catch (err) {
      toast.error(t('Network error'));
    } finally {
      setVipLoading(false);
    }
  };

  // Privilege CRUD Handlers
  const handleSavePrivilege = async () => {
    if (!privilegeForm.name.trim()) {
      setPrivilegeFormErrors({ name: t('Name is required') });
      return;
    }

    setPrivilegeActionLoading(true);
    try {
      const isEdit = privilegeForm.id !== null;
      const res = await fetch(`${API_BASE_URL}/manage_vip_privilege.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isEdit ? 'edit' : 'create',
          id: privilegeForm.id,
          name: privilegeForm.name.trim(),
          description: privilegeForm.description.trim(),
          type: privilegeForm.type,
          value: parseInt(privilegeForm.value || 0)
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || (isEdit ? t('Privilege updated') : t('Privilege created')));
        setPrivilegeForm({
          id: null,
          name: '',
          description: '',
          type: 'custom',
          value: 0
        });
        setPrivilegeFormErrors({});
        fetchPrivileges();
        fetchCustomers(); // Refetch customers to ensure their labels and counts are up-to-date
      } else {
        toast.error(data.message || t('Operation failed'));
      }
    } catch (err) {
      toast.error(t('Network error'));
    } finally {
      setPrivilegeActionLoading(false);
    }
  };

  const handleEditPrivilegeClick = (priv) => {
    setPrivilegeForm({
      id: priv.id,
      name: priv.name,
      description: priv.description || '',
      type: priv.type,
      value: priv.value || 0
    });
    setPrivilegeFormErrors({});
  };

  const handleDeletePrivilege = async (id) => {
    toast.warning(t('Are you sure you want to delete this privilege? This will remove it from all assigned VIP customers.'), {
      action: {
        label: t('Delete'),
        onClick: async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/manage_vip_privilege.php`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'delete',
                id: id
              })
            });
            const data = await res.json();
            if (data.success) {
              toast.success(data.message || t('Privilege deleted'));
              fetchPrivileges();
              fetchCustomers();
            } else {
              toast.error(data.message || t('Failed to delete privilege'));
            }
          } catch (err) {
            toast.error(t('Network error'));
          }
        }
      },
      cancel: {
        label: t('Cancel'),
        onClick: () => {}
      }
    });
  };

  const getWhatsAppLink = (phone) => {
    if (!phone) return '#';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('03') && cleaned.length === 11) {
      cleaned = '92' + cleaned.substring(1);
    } else if (cleaned.startsWith('3') && cleaned.length === 10) {
      cleaned = '92' + cleaned;
    }
    return `https://wa.me/${cleaned}`;
  };

  // Filter customers by search term
  const filteredCustomers = customers.filter(customer => {
    const term = searchTerm.toLowerCase();
    return (
      (customer.full_name || '').toLowerCase().includes(term) ||
      (customer.phone || '').toLowerCase().includes(term) ||
      (customer.email || '').toLowerCase().includes(term)
    );
  });

  // Aggregate Stats
  const totalCustomersCount = customers.length;
  const activeCustomersCount = customers.filter(c => c.is_active).length;
  const vipCustomersCount = customers.filter(c => c.is_vip).length;
  const totalSalesAmount = customers.reduce((sum, c) => sum + c.total_spent, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
        <p className="text-muted-foreground">{t('Loading customer database...')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">{t('Manage Customers')}</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">{t('View customer details, configure VIP privileges, and manage account statuses.')}</p>
        </div>
        <Button
          onClick={() => {
            setPrivilegeForm({ id: null, name: '', description: '', type: 'custom', value: 0 });
            setPrivilegeFormErrors({});
            setIsManagePrivilegesOpen(true);
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white font-medium flex items-center justify-center gap-1.5 shadow-sm w-full sm:w-auto sm:self-center"
        >
          <Award className="h-4 w-4 shrink-0" />
          {t('Manage VIP Privileges')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 flex flex-col items-center text-center gap-2 border-l-4 border-blue-500 shadow-sm">
          <div className="p-2 sm:p-3 bg-blue-100 rounded-full text-blue-600">
            <User className="h-4 w-4 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-[11px] sm:text-sm font-medium text-gray-500 leading-tight">{t('Total Customers')}</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{totalCustomersCount}</p>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 flex flex-col items-center text-center gap-2 border-l-4 border-green-500 shadow-sm">
          <div className="p-2 sm:p-3 bg-green-100 rounded-full text-green-600">
            <UserCheck className="h-4 w-4 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-[11px] sm:text-sm font-medium text-gray-500 leading-tight">{t('Active Accounts')}</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{activeCustomersCount}</p>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 flex flex-col items-center text-center gap-2 border-l-4 border-purple-500 shadow-sm">
          <div className="p-2 sm:p-3 bg-purple-100 rounded-full text-purple-600">
            <Award className="h-4 w-4 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-[11px] sm:text-sm font-medium text-gray-500 leading-tight">{t('VIP Customers')}</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{vipCustomersCount}</p>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 flex flex-col items-center text-center gap-2 border-l-4 border-amber-500 shadow-sm">
          <div className="p-2 sm:p-3 bg-amber-100 rounded-full text-amber-600">
            <Sparkles className="h-4 w-4 sm:h-6 sm:w-6" />
          </div>
          <div className="w-full">
            <p className="text-[11px] sm:text-sm font-medium text-gray-500 leading-tight">{t('Total Spent')}</p>
            <p className="text-sm sm:text-2xl font-bold text-gray-900 break-all">Rs. {totalSalesAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</p>
          </div>
        </Card>
      </div>

      {/* Filter & List Card */}
      <Card className="p-3 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="group relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors group-focus-within:text-purple-600" />
            <Input
              placeholder={t('Search by name, email, or phone...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 transition-shadow focus:ring-2 focus:ring-purple-100"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <p className="text-sm text-gray-500">{t('No customers found matching your search.')}</p>
          </div>
        ) : (
          <>
          {/* Mobile: card list (below md) */}
          <div className="md:hidden space-y-3">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="border rounded-lg p-3 bg-card space-y-2.5">
                {/* Top row: name + status badge */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-border">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm break-words">{customer.full_name}</p>
                    <p className="text-[11px] text-gray-500">ID: #{customer.id}</p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    customer.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {customer.is_active ? t('Active') : t('Disabled')}
                  </span>
                </div>

                {/* Contact */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-700">
                    <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="break-all">{customer.phone}</span>
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="break-all">{customer.email}</span>
                    </div>
                  )}
                </div>

                {/* VIP badges */}
                {customer.is_vip && (
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                      <Award className="h-3 w-3 text-purple-600" />
                      {t('VIP')}
                    </span>
                    {customer.privilege_ids && customer.privilege_ids.map(pid => {
                      const privilege = privileges.find(p => p.id === pid);
                      if (!privilege) return null;
                      return (
                        <span key={pid} className="text-[9px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded font-medium">
                          {privilege.name}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Orders + Total Spent */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-center">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">{t('Orders')}</p>
                    <p className="text-sm font-bold text-gray-900">{customer.total_orders}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">{t('Total Spent')}</p>
                    <p className="text-sm font-bold text-gray-900 break-all">Rs. {customer.total_spent.toLocaleString('en-PK')}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-border">
                  <button
                    onClick={() => window.open(getWhatsAppLink(customer.phone), '_blank')}
                    className="py-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors border border-green-200/50 flex items-center justify-center"
                    title={t('Contact via WhatsApp')}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                  {customer.email ? (
                    <button
                      onClick={() => window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${customer.email}`, '_blank')}
                      className="py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-200/50 flex items-center justify-center"
                      title={t('Contact via Gmail')}
                    >
                      <Mail className="h-4 w-4" />
                    </button>
                  ) : (
                    <button disabled className="py-1.5 bg-gray-50 text-gray-300 rounded-lg border border-gray-100 cursor-not-allowed flex items-center justify-center">
                      <Mail className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenVipModal(customer)}
                    className="py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg transition-colors border border-purple-200/50 flex items-center justify-center"
                    title={t('Manage VIP Status')}
                  >
                    <Award className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(customer)}
                    className={`py-1.5 rounded-lg transition-colors border flex items-center justify-center ${
                      customer.is_active
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-200/50'
                        : 'bg-green-50 hover:bg-green-100 text-green-600 border-green-200/50'
                    }`}
                    title={customer.is_active ? t('Disable Account') : t('Enable Account')}
                  >
                    {customer.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table (md and up) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 text-sm font-medium bg-gray-50/50">
                  <th className="p-4">{t('Customer')}</th>
                  <th className="p-4">{t('Contact')}</th>
                  <th className="p-4">{t('Status')}</th>
                  <th className="p-4">{t('VIP Badge')}</th>
                  <th className="p-4 text-center">{t('Orders')}</th>
                  <th className="p-4 text-right">{t('Total Spent')}</th>
                  <th className="p-4 text-center">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-gray-900">{customer.full_name}</div>
                      <div className="text-xs text-gray-500">ID: #{customer.id}</div>
                    </td>
                    <td className="p-4 space-y-1">
                      <div className="flex items-center space-x-1.5 text-gray-700">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        <span>{customer.phone}</span>
                      </div>
                      {customer.email && (
                        <div className="flex items-center space-x-1.5 text-gray-500 text-xs">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          <span>{customer.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        customer.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {customer.is_active ? t('Active') : t('Disabled')}
                      </span>
                    </td>
                    <td className="p-4">
                      {customer.is_vip ? (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                            <Award className="h-3 w-3 text-purple-600" />
                            {t('VIP')}
                          </span>
                          <div className="flex flex-wrap gap-1 mt-0.5 max-w-[150px]">
                            {customer.privilege_ids && customer.privilege_ids.map(pid => {
                              const privilege = privileges.find(p => p.id === pid);
                              if (!privilege) return null;
                              return (
                                <span key={pid} className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-medium shadow-sm">
                                  {privilege.name}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center font-medium text-gray-900">
                      {customer.total_orders}
                    </td>
                    <td className="p-4 text-right font-semibold text-gray-900">
                      Rs. {customer.total_spent.toLocaleString('en-PK')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* WhatsApp Contact */}
                        <button
                          onClick={() => window.open(getWhatsAppLink(customer.phone), '_blank')}
                          className="p-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors border border-green-200/50 shadow-sm"
                          title={t('Contact via WhatsApp')}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>

                        {/* Gmail Contact */}
                        {customer.email ? (
                          <button
                            onClick={() => window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${customer.email}`, '_blank')}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-200/50 shadow-sm"
                            title={t('Contact via Gmail')}
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            disabled
                            className="p-1.5 bg-gray-50 text-gray-300 rounded-lg border border-gray-100 cursor-not-allowed"
                            title={t('No Email Address')}
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                        )}

                        {/* Promote/Manage VIP Button */}
                        <button
                          onClick={() => handleOpenVipModal(customer)}
                          className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg transition-colors border border-purple-200/50 shadow-sm"
                          title={t('Manage VIP Status')}
                        >
                          <Award className="h-4 w-4" />
                        </button>

                        {/* Disable/Enable Toggle */}
                        <button
                          onClick={() => handleToggleStatus(customer)}
                          className={`p-1.5 rounded-lg transition-colors border shadow-sm ${
                            customer.is_active
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-200/50'
                              : 'bg-green-50 hover:bg-green-100 text-green-600 border-green-200/50'
                          }`}
                          title={customer.is_active ? t('Disable Account') : t('Enable Account')}
                        >
                          {customer.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>

      {/* VIP Config Dialog */}
      <Dialog open={isVipModalOpen} onOpenChange={setIsVipModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-900">
              <Award className="h-5 w-5 text-purple-600" />
              {t('Configure VIP Status')}
            </DialogTitle>
            <DialogDescription>
              {t('Manage VIP privileges for')} <strong className="text-gray-900">{selectedCustomer?.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold text-purple-900">{t('Promote to VIP Member')}</Label>
                <p className="text-xs text-purple-700">{t('Enable VIP badges and special benefits.')}</p>
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
                    privilege_ids: val ? vipForm.privilege_ids : []
                  });
                }}
                className="w-5 h-5 accent-purple-600 cursor-pointer rounded"
              />
            </div>

            <div className={`space-y-3 p-3 border rounded-lg transition-all ${
              vipForm.is_vip ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50/50 opacity-60 pointer-events-none'
            }`}>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('Active Privileges')}</h4>
              
              {privileges.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">{t('No privileges defined. Create some first.')}</p>
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
                            nextIds = nextIds.filter(id => id !== priv.id);
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
            <Button
              variant="outline"
              onClick={() => setIsVipModalOpen(false)}
              disabled={vipLoading}
            >
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

      {/* Manage Privileges Dialog */}
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
                <Label htmlFor="priv-name" className="text-xs font-semibold text-gray-700">{t('Privilege Name')}</Label>
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
                <Label htmlFor="priv-desc" className="text-xs font-semibold text-gray-700">{t('Description')}</Label>
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
                  <Label htmlFor="priv-type" className="text-xs font-semibold text-gray-700">{t('Type')}</Label>
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
                  <Label htmlFor="priv-val" className="text-xs font-semibold text-gray-700">{t('Value (if applicable)')}</Label>
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
                  onClick={() => setPrivilegeForm({ id: null, name: '', description: '', type: 'custom', value: 0 })}
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
                {privilegeActionLoading ? t('Saving...') : privilegeForm.id ? t('Update') : t('Create')}
              </Button>
            </div>
          </div>

          {/* Privilege List */}
          <div className="space-y-2 mt-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('Existing Privileges')}</h4>
            <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto pr-1">
              {privileges.length === 0 ? (
                <p className="text-sm text-gray-500 py-3 text-center">{t('No privileges defined yet.')}</p>
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
    </div>
  );
}

// Named export mapping
export default ManageCustomers;
