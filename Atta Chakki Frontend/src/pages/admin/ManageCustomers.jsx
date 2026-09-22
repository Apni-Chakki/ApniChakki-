import { useState, useEffect } from 'react';
import { CustomerStatsCards } from '../../components/features/admin/customers/CustomerStatsCards';
import { VipConfigDialog } from '../../components/features/admin/customers/VipConfigDialog';
import { ManagePrivilegesDialog } from '../../components/features/admin/customers/ManagePrivilegesDialog';
import { Search, Mail, Phone, Award, Ban, CheckCircle, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '../../components/common/button';
import { Card } from '../../components/common/card';
import { Input } from '../../components/common/input';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';
import { getWhatsAppUrl } from '../../utils/whatsappHelper';
import { useTranslation } from 'react-i18next';
import { Pagination } from '../../components/common/Pagination';
import { PageHeader } from '../../components/shared/PageHeader';
import { Loading } from '../../components/shared/Loading';
import { EmptyState } from '../../components/shared/EmptyState';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';

export function ManageCustomers() {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [privileges, setPrivileges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState({ total: 0, active: 0, vip: 0, total_spent: 0 });
  const [statusConfirmCustomer, setStatusConfirmCustomer] = useState(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [deletePrivilegeId, setDeletePrivilegeId] = useState(null);
  const [isDeletingPrivilege, setIsDeletingPrivilege] = useState(false);
  
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
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`${API_BASE_URL}/get_customers.php?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers);
        setTotalItems(data.total || 0);
        if (data.stats) setStats(data.stats);
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
    fetchPrivileges();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 whenever search or page size changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  // Re-fetch when page, size, or search changes
  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch]);

  const handleToggleStatus = (customer) => {
    setStatusConfirmCustomer(customer);
  };

  const confirmToggleStatus = async () => {
    if (!statusConfirmCustomer) return;
    const nextActive = !statusConfirmCustomer.is_active;
    setIsTogglingStatus(true);
    try {
      const res = await fetch(`${API_BASE_URL}/toggle_customer_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: statusConfirmCustomer.id,
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
    } finally {
      setIsTogglingStatus(false);
      setStatusConfirmCustomer(null);
    }
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
        fetchCustomers(); // customers ki list dobara load karna
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

  const handleDeletePrivilege = (id) => {
    setDeletePrivilegeId(id);
  };

  const confirmDeletePrivilege = async () => {
    if (!deletePrivilegeId) return;
    setIsDeletingPrivilege(true);
    try {
      const res = await fetch(`${API_BASE_URL}/manage_vip_privilege.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          id: deletePrivilegeId
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
    } finally {
      setIsDeletingPrivilege(false);
      setDeletePrivilegeId(null);
    }
  };

  const getWhatsAppLink = (phone) => {
    return getWhatsAppUrl(phone) || '#';
  };

  // Server owns filtering + paging; `customers` is the current page
  const filteredCustomers = customers;
  const totalCustomersCount = stats.total;
  const activeCustomersCount = stats.active;
  const vipCustomersCount = stats.vip;
  const totalSalesAmount = stats.total_spent;

  if (loading) {
    return <Loading label={t('Loading customer database...')} className="h-64" />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title={t('Manage Customers')}
        subtitle={t('View customer details, configure VIP privileges, and manage account statuses.')}
        actions={
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
        }
      />

      {/* Stats Cards */}
      <CustomerStatsCards
        totalCustomersCount={totalCustomersCount}
        activeCustomersCount={activeCustomersCount}
        vipCustomersCount={vipCustomersCount}
        totalSalesAmount={totalSalesAmount}
        t={t}
      />

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
            />
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <EmptyState
            title={t('No customers found')}
            description={t('No customers found matching your search.')}
            className="my-4 border-none bg-transparent"
          />
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
              <tbody className="divide-y divide-gray-200">
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

          {totalItems > 0 && (
            <Pagination
              currentPage={page}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
              className="mt-4"
            />
          )}
          </>
        )}
      </Card>

      <VipConfigDialog
        isVipModalOpen={isVipModalOpen}
        setIsVipModalOpen={setIsVipModalOpen}
        selectedCustomer={selectedCustomer}
        vipForm={vipForm}
        setVipForm={setVipForm}
        vipLoading={vipLoading}
        handleSaveVip={handleSaveVip}
        privileges={privileges}
        t={t}
      />

      <ManagePrivilegesDialog
        isManagePrivilegesOpen={isManagePrivilegesOpen}
        setIsManagePrivilegesOpen={setIsManagePrivilegesOpen}
        privileges={privileges}
        privilegeForm={privilegeForm}
        setPrivilegeForm={setPrivilegeForm}
        privilegeFormErrors={privilegeFormErrors}
        privilegeActionLoading={privilegeActionLoading}
        handleSavePrivilege={handleSavePrivilege}
        handleEditPrivilegeClick={handleEditPrivilegeClick}
        handleDeletePrivilege={handleDeletePrivilege}
        t={t}
      />

      {/* Account status confirm dialog */}
      <ConfirmDialog
        open={statusConfirmCustomer !== null}
        onOpenChange={(open) => { if (!open) setStatusConfirmCustomer(null); }}
        title={statusConfirmCustomer?.is_active ? t('Disable Customer Account?') : t('Enable Customer Account?')}
        description={
          statusConfirmCustomer?.is_active
            ? t('Are you sure you want to disable this customer account? They will not be able to log in or place orders.')
            : t('Are you sure you want to enable this customer account?')
        }
        confirmLabel={statusConfirmCustomer?.is_active ? t('Disable') : t('Enable')}
        cancelLabel={t('Cancel')}
        destructive={Boolean(statusConfirmCustomer?.is_active)}
        loading={isTogglingStatus}
        onConfirm={confirmToggleStatus}
      />

      {/* Delete privilege confirm dialog */}
      <ConfirmDialog
        open={deletePrivilegeId !== null}
        onOpenChange={(open) => { if (!open) setDeletePrivilegeId(null); }}
        title={t('Delete VIP Privilege?')}
        description={t('Are you sure you want to delete this privilege? This will remove it from all assigned VIP customers.')}
        confirmLabel={t('Delete')}
        cancelLabel={t('Cancel')}
        destructive
        loading={isDeletingPrivilege}
        onConfirm={confirmDeletePrivilege}
      />
    </div>
  );
}

// Named export mapping
export default ManageCustomers;
