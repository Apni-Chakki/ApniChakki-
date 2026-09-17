import { Button } from '../../components/common/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/card';
import { ShoppingCart } from 'lucide-react';
import { useManualOrder } from '../../components/features/admin/manualOrder/useManualOrder';
import { CustomerDetailsSection } from '../../components/features/admin/manualOrder/CustomerDetailsSection';
import { OrderSettingsSection } from '../../components/features/admin/manualOrder/OrderSettingsSection';
import { ProductPickerSection } from '../../components/features/admin/manualOrder/ProductPickerSection';
import { ManualOrderCart } from '../../components/features/admin/manualOrder/ManualOrderCart';

export function AddManualOrder() {
  const {
    products,
    loading,
    orderType,
    setOrderType,
    customer,
    setCustomer,
    cart,
    selectedProduct,
    setSelectedProduct,
    qty,
    setQty,
    paymentStatus,
    setPaymentStatus,
    paymentMethod,
    setPaymentMethod,
    amountPaid,
    setAmountPaid,
    selectedOptions,
    setSelectedOptions,
    rentalDays,
    setRentalDays,
    rentalStartDate,
    setRentalStartDate,
    currentProduct,
    currentCustomizations,
    computeProductPrice,
    addToCart,
    removeFromCart,
    handlePhoneChange,
    calculateTotal,
    handleSubmit,
    navigate,
    t,
  } = useManualOrder();

  const total = calculateTotal();

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">{t('Add Manual Order')}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {t('Create order for walk-in or phone customers')}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/admin')}
          className="w-full sm:w-auto"
        >
          {t('Cancel')}
        </Button>
      </div>

      {/* Two-Column Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Customer Details */}
        <CustomerDetailsSection
          customer={customer}
          setCustomer={setCustomer}
          orderType={orderType}
          onPhoneChange={handlePhoneChange}
        />

        {/* Order Settings */}
        <OrderSettingsSection
          orderType={orderType}
          setOrderType={setOrderType}
          customer={customer}
          setCustomer={setCustomer}
          paymentStatus={paymentStatus}
          setPaymentStatus={setPaymentStatus}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          amountPaid={amountPaid}
          setAmountPaid={setAmountPaid}
          orderTotal={total}
        />
      </div>

      {/* Product Selection & Cart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" /> {t('Add Products')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ProductPickerSection
            products={products}
            selectedProduct={selectedProduct}
            setSelectedProduct={setSelectedProduct}
            qty={qty}
            setQty={setQty}
            rentalDays={rentalDays}
            setRentalDays={setRentalDays}
            rentalStartDate={rentalStartDate}
            setRentalStartDate={setRentalStartDate}
            currentProduct={currentProduct}
            currentCustomizations={currentCustomizations}
            selectedOptions={selectedOptions}
            setSelectedOptions={setSelectedOptions}
            computeProductPrice={computeProductPrice}
            onAddToCart={addToCart}
          />

          <ManualOrderCart
            cart={cart}
            onRemoveFromCart={removeFromCart}
            total={total}
            onSubmit={handleSubmit}
            loading={loading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
