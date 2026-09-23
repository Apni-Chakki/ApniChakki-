import React from 'react';
import { motion } from 'framer-motion';
import { Pagination } from '@/components/common/Pagination';
import {
  useCustomMixRequests,
  CustomMixHeader,
  CustomMixCard,
  ConvertToOrderModal
} from '@/components/features/admin/customMix';

export function CustomMixRequests() {
  const {
    requests,
    loading,
    expandedId,
    setExpandedId,
    page,
    pageSize,
    totalItems,
    setPage,
    setPageSize,
    updateStatus,
    getStatusColor,
    convertingRequest,
    modalOpen,
    setModalOpen,
    orderQuantity,
    setOrderQuantity,
    orderAddress,
    setOrderAddress,
    paymentStatus,
    setPaymentStatus,
    paymentMethod,
    setPaymentMethod,
    ratios,
    setRatios,
    isSubmittingOrder,
    newIngredientName,
    setNewIngredientName,
    newIngredientPrice,
    setNewIngredientPrice,
    showAddForm,
    setShowAddForm,
    handleOpenConvertModal,
    getCalculatedPrice,
    handleRatioChange,
    handleAddNewIngredient,
    handleAddInventoryIngredient,
    handleConvertSubmit,
    allProducts
  } = useCustomMixRequests();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-primary animate-pulse font-bold text-lg">
        Loading Requests...
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <CustomMixHeader />

      <div className="grid gap-3 sm:gap-4">
        {totalItems === 0 ? (
          <div className="text-center p-6 sm:p-8 bg-muted/20 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground font-semibold">
            No custom mix requests found.
          </div>
        ) : (
          requests.map(request => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CustomMixCard
                request={request}
                isExpanded={expandedId === request.id}
                onToggleExpand={() => setExpandedId(expandedId === request.id ? null : request.id)}
                onStatusUpdate={updateStatus}
                onOpenConvertModal={handleOpenConvertModal}
                getStatusColor={getStatusColor}
              />
            </motion.div>
          ))
        )}
      </div>

      {totalItems > 0 && (
        <Pagination
          currentPage={page}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
          className="mt-4"
        />
      )}

      <ConvertToOrderModal
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        convertingRequest={convertingRequest}
        ratios={ratios}
        setRatios={setRatios}
        handleRatioChange={handleRatioChange}
        showAddForm={showAddForm}
        setShowAddForm={setShowAddForm}
        newIngredientName={newIngredientName}
        setNewIngredientName={setNewIngredientName}
        newIngredientPrice={newIngredientPrice}
        setNewIngredientPrice={setNewIngredientPrice}
        handleAddNewIngredient={handleAddNewIngredient}
        getCalculatedPrice={getCalculatedPrice}
        orderQuantity={orderQuantity}
        setOrderQuantity={setOrderQuantity}
        orderAddress={orderAddress}
        setOrderAddress={setOrderAddress}
        paymentStatus={paymentStatus}
        setPaymentStatus={setPaymentStatus}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        handleConvertSubmit={handleConvertSubmit}
        isSubmittingOrder={isSubmittingOrder}
        allProducts={allProducts}
        handleAddInventoryIngredient={handleAddInventoryIngredient}
      />
    </div>
  );
}

export default CustomMixRequests;
