import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Copy, Calendar, Percent, DollarSign, Check, X, Tag } from 'lucide-react';
import { Button } from '../../components/common/button';
import { Card } from '../../components/common/card';
import { Input } from '../../components/common/input';
import { Label } from '../../components/common/label';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';
import { useTranslation } from 'react-i18next';

export function ManageCoupons() {
  const { t } = useTranslation();
  const [coupons, setCoupons] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    min_order_amount: '',
    usage_limit: '',
    expiry_date: '',
    is_active: true,
    is_featured: false
  });

  const fetchCoupons = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/coupons/get_coupons.php`);
      const data = await res.json();
      if (data.success) setCoupons(data.coupons);
    } catch (err) {
      toast.error(t('Failed to load coupons'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_amount: '',
      usage_limit: '',
      expiry_date: '',
      is_active: true,
      is_featured: false
    });
    setEditingId(null);
    setIsAdding(false);
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_amount: '',
      usage_limit: '',
      expiry_date: '',
      is_active: true,
      is_featured: false
    });
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEdit = (coupon) => {
    setEditingId(coupon.id);
    setIsAdding(true);
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount,
      usage_limit: coupon.usage_limit || '',
      expiry_date: coupon.expiry_date ? coupon.expiry_date.slice(0, 16) : '',
      is_active: coupon.is_active === 1,
      is_featured: coupon.is_featured === 1
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/coupons/delete_coupon.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t('Coupon deleted'));
        fetchCoupons();
      } else {
        toast.error(data.message || t('Failed to delete coupon'));
      }
    } catch (err) {
      toast.error(t('Network error'));
    }
  };

  const handleDelete = (id) => {
    toast.warning(t('Are you sure you want to delete this coupon?'), {
      duration: 8000,
      action: {
        label: t('Yes, Delete'),
        onClick: () => confirmDelete(id),
      },
      cancel: {
        label: t('Cancel'),
        onClick: () => {},
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.discount_value) {
      toast.error(t('Code and discount value are required'));
      return;
    }

    const payload = { ...formData };
    if (!payload.usage_limit) payload.usage_limit = null;
    if (!payload.expiry_date) payload.expiry_date = null;

    try {
      const url = editingId
        ? `${API_BASE_URL}/coupons/update_coupon.php`
        : `${API_BASE_URL}/coupons/create_coupon.php`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingId ? t('Coupon updated') : t('Coupon created'));
        resetForm();
        fetchCoupons();
      } else {
        toast.error(data.message || t('Failed to save coupon'));
      }
    } catch (err) {
      toast.error(t('Network error'));
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success(t('Code copied to clipboard'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('Manage Coupons')}</h1>
        <Button onClick={handleAdd} disabled={isAdding || editingId !== null}>
          <Plus className="h-4 w-4 mr-2" />
          {t('Add Coupon')}
        </Button>
      </div>

      {isAdding && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? t('Edit Coupon') : t('Add New Coupon')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">{t('Coupon Code')}</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE20"
                  required
                />
              </div>
              <div>
                <Label htmlFor="discount_type">{t('Discount Type')}</Label>
                <select
                  id="discount_type"
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="percentage">{t('Percentage (%)')}</option>
                  <option value="fixed">{t('Fixed Amount (Rs.)')}</option>
                </select>
              </div>
              <div>
                <Label htmlFor="discount_value">
                  {formData.discount_type === 'percentage' ? t('Discount Percentage') : t('Discount Amount (Rs.)')}
                </Label>
                <Input
                  id="discount_value"
                  type="number"
                  min="0"
                  max={formData.discount_type === 'percentage' ? 100 : undefined}
                  step="0.01"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  placeholder={formData.discount_type === 'percentage' ? '20' : '200'}
                  required
                />
              </div>
              <div>
                <Label htmlFor="min_order_amount">{t('Minimum Order Amount (Rs.)')}</Label>
                <Input
                  id="min_order_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="usage_limit">{t('Usage Limit (Optional)')}</Label>
                <Input
                  id="usage_limit"
                  type="number"
                  min="1"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                  placeholder={t('Unlimited')}
                />
              </div>
              <div>
                <Label htmlFor="expiry_date">{t('Expiry Date & Time (Optional)')}</Label>
                <Input
                  id="expiry_date"
                  type="datetime-local"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">{t('Description (Optional)')}</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('Special offer for new customers')}
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>{t('Active')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>{t('Featured (Show on Homepage)')}</span>
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? t('Update Coupon') : t('Create Coupon')}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                {t('Cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map((coupon) => (
          <Card key={coupon.id} className="p-4 relative">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                <span className="font-mono font-bold text-lg">{coupon.code}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 px-0 py-0"
                  onClick={() => copyCode(coupon.code)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="h-8 w-8 flex items-center justify-center rounded shadow-sm disabled:opacity-50 text-white px-0 py-0"
                  style={{ backgroundColor: '#8b6f47' }}
                  onClick={() => handleEdit(coupon)}
                  disabled={isAdding || editingId !== null}
                >
                  <Pencil className="h-4 w-4 text-white" strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  className="h-8 w-8 flex items-center justify-center rounded shadow-sm disabled:opacity-50 text-white px-0 py-0"
                  style={{ backgroundColor: '#dc2626' }}
                  onClick={() => handleDelete(coupon.id)}
                  disabled={isAdding || editingId !== null}
                >
                  <Trash2 className="h-4 w-4 text-white" strokeWidth={2.5} />
                </button>
              </div>
            </div>
            {coupon.description && (
              <p className="text-sm text-muted-foreground mb-3">{coupon.description}</p>
            )}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {coupon.discount_type === 'percentage' ? (
                  <Percent className="h-4 w-4 text-primary" />
                ) : (
                  <DollarSign className="h-4 w-4 text-primary" />
                )}
                <span className="font-medium">
                  {coupon.discount_type === 'percentage'
                    ? `${coupon.discount_value}% OFF`
                    : `Rs. ${coupon.discount_value} OFF`}
                </span>
              </div>
              {coupon.min_order_amount > 0 && (
                <div className="text-muted-foreground">
                  {t('Min order')}: Rs. {coupon.min_order_amount}
                </div>
              )}
              {coupon.usage_limit && (
                <div className="text-muted-foreground">
                  {t('Usage')}: {coupon.used_count}/{coupon.usage_limit}
                </div>
              )}
              {coupon.expiry_date && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(coupon.expiry_date).toLocaleDateString()}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 mt-4 pt-3 border-t">
              <div className="flex items-center gap-1 text-sm">
                {coupon.is_active ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <X className="h-4 w-4 text-red-600" />
                )}
                <span>{coupon.is_active ? t('Active') : t('Inactive')}</span>
              </div>
              {coupon.is_featured && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {t('Featured')}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {coupons.length === 0 && !isAdding && (
        <div className="text-center py-12 text-muted-foreground">
          <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t('No coupons yet. Create your first coupon!')}</p>
        </div>
      )}
    </div>
  );
}
