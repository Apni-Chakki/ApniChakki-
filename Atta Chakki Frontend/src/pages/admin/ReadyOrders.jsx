import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { OrdersTable } from './OrdersTable';
import { Button } from '../../components/common/button';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';
import { sendWhatsAppMessage } from '../../utils/whatsappHelper';
import { CheckCircle2, Loader2, PackageCheck, Truck, User, Phone, MapPin, MessageCircle, AlertCircle } from 'lucide-react';
import { Pagination } from '../../components/common/Pagination';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/common/dialog';

export function ReadyOrders() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [activePersonnel, setActivePersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Driver Assignment Modal State
  const [assignModalOrder, setAssignModalOrder] = useState(null);
  const [selectedDriverName, setSelectedDriverName] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchPersonnel = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/manage_delivery.php`);
      const data = await response.json();
      if (data.success && Array.isArray(data.personnel)) {
        setActivePersonnel(data.personnel.filter(person => person.isActive));
      }
    } catch (error) {
      console.error("Error loading delivery personnel:", error);
    }
  };

  // Fetch orders and strictly filter for 'ready' status
  const loadOrders = async () => {
    try {
      const params = new URLSearchParams({ status: 'ready', page: String(page), limit: String(pageSize) });
      const response = await fetch(`${API_BASE_URL}/admin_orders.php?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setTotalItems(data.total || 0);
        const activeOrders = data.orders || [];

        // Map Database Columns to React Props
        const mappedOrders = activeOrders.map(order => ({
          ...order,
          id: order.id,
          customerName: order.customer_name, 
          phone: order.customer_phone,
          total: parseFloat(order.total_amount),
          createdAt: order.created_at,
          paymentMethod: order.payment_method,
          type: (order.order_type === 'pickup' || (order.shipping_address && (
            order.shipping_address.toLowerCase().includes('pickup') || 
            order.shipping_address.toLowerCase().includes('store') || 
            order.shipping_address.toLowerCase().includes('collect') || 
            order.shipping_address.toLowerCase().includes('self') || 
            order.shipping_address.toLowerCase().includes('shop')
          ))) ? 'pickup' : 'delivery',
          deliveryAddress: order.shipping_address,
          deliveryPersonnel: order.driver_name || null,
          driverPhone: order.driver_phone || null
        }));
        setOrders(mappedOrders);
      }
    } catch (error) {
      console.error("Error loading ready orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    fetchPersonnel();
    loadOrders();
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadOrders();
      }
    }, 20000); // Auto-refresh every 20 seconds
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  // Update Status to Completed (for in-store customer pickup "HOC")
  const updateToCompleted = async (orderId) => {
    setOrders(currentOrders => currentOrders.filter(o => o.id !== orderId));

    try {
      const response = await fetch(`${API_BASE_URL}/update_order_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, status: 'completed' })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(t("Order marked as Handed to Customer & Completed!"));
        loadOrders(); 
      } else {
        toast.error("Failed to complete order");
        loadOrders();
      }
    } catch (error) {
      toast.error("Network error");
      loadOrders();
    }
  };

  // Open Assign Driver Modal
  const openAssignDriverModal = (order) => {
    setAssignModalOrder(order);
    setSelectedDriverName(order.deliveryPersonnel || (activePersonnel[0]?.name || ''));
    setSendWhatsApp(true);
  };

  // Submit Driver Assignment
  const handleAssignDriverSubmit = async () => {
    if (!assignModalOrder) return;
    if (!selectedDriverName) {
      toast.error("Please select a delivery driver.");
      return;
    }

    const driverObj = activePersonnel.find(p => p.name === selectedDriverName);
    const driverPhone = driverObj?.phone || '';

    setIsAssigning(true);
    try {
      const response = await fetch(`${API_BASE_URL}/assign_driver.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: assignModalOrder.id,
          driver_name: selectedDriverName,
          driver_phone: driverPhone,
          status: 'delivery_assigned'
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Assigned to driver ${selectedDriverName}! Order dispatched to delivery portal.`);

        // Optional: Open WhatsApp message to rider
        if (sendWhatsApp && driverPhone) {
          const message = `Assalam-o-Alaikum *${selectedDriverName}*! 👋\n\nApko Suchi Chakki ki taraf se Ready Delivery Order assign hua hai:\n📦 *Order #${assignModalOrder.id}*\n👤 Customer: ${assignModalOrder.customerName || 'Customer'}\n📞 Phone: ${assignModalOrder.phone || 'N/A'}\n📍 Address: ${assignModalOrder.deliveryAddress || 'N/A'}\n💰 Total Amount: Rs. ${assignModalOrder.total}\n\nDelivery Panel me check karein aur delivery complete karein.\nShukriya!`;
          sendWhatsAppMessage(driverPhone, message);
        }

        setAssignModalOrder(null);
        loadOrders();
      } else {
        toast.error(result.message || "Failed to assign driver");
      }
    } catch (error) {
      toast.error("Network error while assigning driver");
    } finally {
      setIsAssigning(false);
    }
  };

  if (loading && orders.length === 0) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></div>;
  }

  return (
    <div>
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <PackageCheck className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 shrink-0" />
            <span className="truncate">{t("Ready Orders")}</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{totalItems} {t("orders waiting for pickup or delivery")}</p>
        </div>
      </div>

      {totalItems === 0 && !loading ? (
        <div className="p-8 sm:p-12 text-center border-2 border-dashed rounded-xl bg-white">
            <PackageCheck className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-base sm:text-lg font-medium text-foreground">No ready orders right now.</p>
            <p className="text-sm text-muted-foreground">When you mark an order as 'Ready' in Today's Work, it will appear here.</p>
        </div>
      ) : (
        <>
        <OrdersTable
          orders={orders}
          actions={(order) => {
            const isDelivery = order.type === 'delivery';

            if (isDelivery) {
              // Delivery Order: Must Assign Driver (ROD)
              const hasDriver = !!order.deliveryPersonnel;
              return (
                <Button
                  size="sm"
                  title={hasDriver ? `Assigned to ${order.deliveryPersonnel}. Tap to change driver.` : "Assign Delivery Driver (ROD)"}
                  className={`${
                    hasDriver
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-[#8b6f47] hover:bg-[#725936]'
                  } text-white shadow-sm font-bold text-xs px-2.5 py-1.5 transition-all flex items-center gap-1.5 max-w-[140px] sm:max-w-[160px] shrink-0`}
                  onClick={() => openAssignDriverModal(order)}
                >
                  <Truck className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate font-semibold">
                    {hasDriver ? `ROD • ${order.deliveryPersonnel}` : 'ROD'}
                  </span>
                </Button>
              );
            }

            // Pickup Order: Customer Picked up in person (HOC) -> Complete
            return (
              <Button
                size="sm"
                title={`${t('Handed to Customer')} (HOC)`}
                className="bg-green-600 hover:bg-green-700 text-white shadow-sm font-bold text-xs sm:text-sm px-3 py-1.5 whitespace-nowrap transition-all flex items-center gap-1.5"
                onClick={() => updateToCompleted(order.id)}
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="hidden 2xl:inline">{t('Handed to Customer')}</span>
                <span className="2xl:hidden font-black tracking-wider">HOC</span>
              </Button>
            );
          }}
        />
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

      {/* Assign Delivery Driver Dialog */}
      <Dialog open={!!assignModalOrder} onOpenChange={(open) => !open && setAssignModalOrder(null)}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-5 sm:p-6">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-800 shrink-0">
                <Truck className="h-5 w-5" />
              </div>
              <span>Assign Delivery Driver (ROD)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Select a driver to dispatch Order #{assignModalOrder?.id}. The driver will receive and complete the delivery.
            </DialogDescription>
          </DialogHeader>

          {assignModalOrder && (
            <div className="space-y-4 py-2">
              {/* Order Info Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Order #{assignModalOrder.id}</span>
                  <span className="text-primary font-black">Rs. {assignModalOrder.total?.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-600">
                  <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{assignModalOrder.customerName || 'Customer'}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-600">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{assignModalOrder.phone || 'N/A'}</span>
                </div>
                <div className="flex items-start gap-1 text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="break-words">{assignModalOrder.deliveryAddress || 'No address'}</span>
                </div>
              </div>

              {/* Driver Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Select Delivery Rider:
                </label>
                {activePersonnel.length === 0 ? (
                  <div className="p-3 border border-amber-200 bg-amber-50 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>No active delivery drivers found. Please add riders in "Manage Delivery".</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {activePersonnel.map((person) => {
                      const isSelected = selectedDriverName === person.name;
                      return (
                        <div
                          key={person.id || person.name}
                          onClick={() => setSelectedDriverName(person.name)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-amber-600 bg-amber-600' : 'border-slate-300'}`}>
                              {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                            <div>
                              <p className="font-bold text-xs text-slate-800">{person.name}</p>
                              <p className="text-[10px] text-slate-500">{person.phone || 'No phone'}</p>
                            </div>
                          </div>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                            {person.vehicleType || 'Bike'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* WhatsApp alert option */}
              <label className="flex items-center gap-2 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl cursor-pointer text-xs font-semibold text-emerald-800">
                <input
                  type="checkbox"
                  checked={sendWhatsApp}
                  onChange={(e) => setSendWhatsApp(e.target.checked)}
                  className="rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <MessageCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Send WhatsApp alert with order details to driver</span>
              </label>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between flex-col sm:flex-row pt-2 border-t border-border">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setAssignModalOrder(null)}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto bg-[#8b6f47] hover:bg-[#725936] text-white font-bold"
              onClick={handleAssignDriverSubmit}
              disabled={isAssigning || !selectedDriverName || activePersonnel.length === 0}
            >
              {isAssigning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Truck className="h-4 w-4 mr-2" />
                  Assign & Send to Driver
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}




