import React from 'react';
import { ShoppingBag, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/common/dialog';
import { Button } from '@/components/common/button';
import { Input } from '@/components/common/input';
import { Label } from '@/components/common/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/common/select';

export default function ConvertToOrderModal({
  modalOpen,
  setModalOpen,
  convertingRequest,
  ratios,
  setRatios,
  handleRatioChange,
  showAddForm,
  setShowAddForm,
  newIngredientName,
  setNewIngredientName,
  newIngredientPrice,
  setNewIngredientPrice,
  handleAddNewIngredient,
  getCalculatedPrice,
  orderQuantity,
  setOrderQuantity,
  orderAddress,
  setOrderAddress,
  paymentStatus,
  setPaymentStatus,
  paymentMethod,
  setPaymentMethod,
  handleConvertSubmit,
  isSubmittingOrder
}) {
  const calculatedPrice = getCalculatedPrice();

  return (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-md w-full rounded-2xl bg-white border border-primary/20 p-3 sm:p-5 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-primary/10 pb-2 sm:pb-3">
          <DialogTitle className="text-base sm:text-lg font-black text-primary uppercase tracking-wider flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 animate-pulse shrink-0" /> Convert to Active Order
          </DialogTitle>
          <DialogDescription className="text-[11px] sm:text-xs text-slate-500 leading-normal">
            Customer ke sath finalize ki gayi ratios adjust karein aur is request ko directly active scheduled order me convert karein.
          </DialogDescription>
        </DialogHeader>

        {convertingRequest && (
          <div className="space-y-4 py-3">
            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Customer Name</span>
                <p className="text-sm font-bold text-slate-700">{convertingRequest.customer_name}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Phone</span>
                <p className="text-sm font-bold text-slate-700">{convertingRequest.customer_phone}</p>
              </div>
            </div>

            {/* Mix Ingredient Ratio Renders */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-600 block border-b pb-1">
                Adjust Custom Proportions:
              </span>
              {ratios.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-primary/10 shadow-sm gap-2"
                >
                  <div className="flex flex-col min-w-0 text-left items-start flex-1">
                    <span className="text-xs font-bold text-slate-900 truncate leading-tight">
                      {item.item_name}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 leading-none font-medium">
                      Rs. {item.price_per_kg}/kg
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center border border-primary/20 rounded-lg overflow-hidden bg-white shadow-sm h-7">
                      <button
                        type="button"
                        className="w-7 h-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors select-none"
                        onClick={() => {
                          const newVal = Math.max(0, item.ratio - 0.1).toFixed(1);
                          handleRatioChange(idx, parseFloat(newVal));
                        }}
                      >
                        -
                      </button>
                      <span className="w-9 text-center text-xs font-black text-slate-800 select-none">
                        {item.ratio.toFixed(1)}
                      </span>
                      <button
                        type="button"
                        className="w-7 h-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors select-none"
                        onClick={() => {
                          const newVal = (item.ratio + 0.1).toFixed(1);
                          handleRatioChange(idx, parseFloat(newVal));
                        }}
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-red-200"
                      onClick={() => setRatios(prev => prev.filter((_, rIdx) => rIdx !== idx))}
                      title="Remove Ingredient"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {showAddForm ? (
                <div className="p-3.5 rounded-xl bg-[#fcfaf7] border border-primary/20 space-y-3 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <span className="text-[10px] font-bold text-primary uppercase block tracking-wider">
                    Add Custom Ingredient
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[9px] font-bold text-slate-500 uppercase">Ingredient Name</Label>
                      <Input
                        type="text"
                        placeholder="e.g. Jau (Barley)"
                        className="text-xs h-8 bg-white rounded-lg focus:ring-primary focus:border-primary"
                        value={newIngredientName}
                        onChange={e => setNewIngredientName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-bold text-slate-500 uppercase">Price per kg</Label>
                      <Input
                        type="number"
                        placeholder="Rs."
                        className="text-xs h-8 bg-white rounded-lg focus:ring-primary focus:border-primary"
                        value={newIngredientPrice}
                        onChange={e => setNewIngredientPrice(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-xs h-7 px-3 text-slate-500 rounded-lg"
                      onClick={() => {
                        setShowAddForm(false);
                        setNewIngredientName('');
                        setNewIngredientPrice('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      className="text-xs h-7 px-4 bg-primary text-white font-extrabold rounded-lg shadow-sm hover:bg-primary/90"
                      onClick={handleAddNewIngredient}
                    >
                      Add to Mix
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-xs border-dashed border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 h-8.5 mt-1.5 rounded-xl font-extrabold flex items-center justify-center gap-1.5 transition-all"
                  onClick={() => setShowAddForm(true)}
                >
                  + Add Custom Ingredient
                </Button>
              )}
            </div>

            {/* Dynamic Price Calculation display */}
            <div className="bg-[#fcfaf7] border border-primary/20 rounded-xl p-3 flex justify-between items-center shadow-inner">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Avg Price / kg</span>
                <p className="text-base font-black text-primary">Rs. {Math.round(calculatedPrice)}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Total Order Value</span>
                <p className="text-base font-black text-slate-800">
                  Rs. {Math.round(calculatedPrice * orderQuantity)}
                </p>
              </div>
            </div>

            {/* Order form fields */}
            <div className="space-y-3 pt-1">
              <div>
                <Label className="text-xs font-extrabold text-slate-600 mb-1 block">
                  Total Quantity (kg):
                </Label>
                <Input
                  type="number"
                  min="1"
                  className="w-full text-xs h-9 rounded-xl focus:ring-primary focus:border-primary shadow-sm"
                  value={orderQuantity}
                  onChange={e => setOrderQuantity(Math.max(1, parseFloat(e.target.value) || 1))}
                />
              </div>

              <div>
                <Label className="text-xs font-extrabold text-slate-600 mb-1 block">
                  Delivery/Shipping Address:
                </Label>
                <Input
                  type="text"
                  className="w-full text-xs h-9 rounded-xl focus:ring-primary focus:border-primary shadow-sm"
                  value={orderAddress}
                  onChange={e => setOrderAddress(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-extrabold text-slate-600 mb-1 block">Payment Status:</Label>
                  <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                    <SelectTrigger className="w-full text-xs font-bold rounded-xl h-9">
                      <SelectValue placeholder="Payment Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending" className="text-xs font-bold text-yellow-600">
                        Pending
                      </SelectItem>
                      <SelectItem value="paid" className="text-xs font-bold text-green-600">
                        Paid
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-extrabold text-slate-600 mb-1 block">Payment Method:</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="w-full text-xs font-bold rounded-xl h-9">
                      <SelectValue placeholder="Payment Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash" className="text-xs font-bold">Cash/COD</SelectItem>
                      <SelectItem value="jazzcash" className="text-xs font-bold">JazzCash</SelectItem>
                      <SelectItem value="easypaisa" className="text-xs font-bold">EasyPaisa</SelectItem>
                      <SelectItem value="bank" className="text-xs font-bold">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-primary/10 pt-3 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 text-xs font-bold rounded-xl h-9 border-primary/20"
            onClick={() => setModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 text-xs font-bold rounded-xl h-9 bg-primary hover:bg-primary/90 text-white shadow-md flex items-center justify-center gap-1.5"
            onClick={handleConvertSubmit}
            disabled={isSubmittingOrder}
          >
            {isSubmittingOrder ? 'Converting...' : 'Confirm & Create Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
