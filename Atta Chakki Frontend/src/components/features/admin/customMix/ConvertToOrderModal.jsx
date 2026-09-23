import React, { useState, useRef, useEffect } from 'react';
import { ShoppingBag, Trash2, Search, Package, ChevronDown } from 'lucide-react';
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

/**
 * Inline searchable inventory dropdown for the Convert modal.
 */
function InventoryDropdown({ allProducts, existingNames, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = allProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) &&
    !existingNames.includes(p.name.toLowerCase())
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full h-9 rounded-xl border border-primary/20 bg-white px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/5 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <span className="flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5 shrink-0" />
          Select from Inventory
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-56 bg-white rounded-xl border border-primary/20 shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2 p-2 border-b bg-slate-50/80">
            <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full text-xs bg-transparent outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="max-h-40 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-3 text-center">
                <p className="text-[10px] text-slate-400 font-medium">No products found</p>
              </div>
            ) : (
              filtered.map(product => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    onSelect(product);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-primary/5 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <span className="block font-bold text-slate-800 truncate">{product.name}</span>
                    <span className="text-[10px] text-slate-500">
                      Rs. {product.price}/{product.unit || 'kg'} • Stock: {product.stock_quantity ?? 'N/A'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  isSubmittingOrder,
  allProducts = [],
  handleAddInventoryIngredient = () => {}
}) {
  const calculatedPrice = getCalculatedPrice();
  const existingNames = ratios.map(r => r.item_name.toLowerCase());

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
                    <span className="text-xs font-bold text-slate-900 truncate leading-tight flex items-center gap-1.5">
                      {item.item_name}
                      {item.product_ingredient_id && (
                        <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Inventory
                        </span>
                      )}
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

              {/* Inventory product dropdown */}
              {allProducts.length > 0 && (
                <InventoryDropdown
                  allProducts={allProducts}
                  existingNames={existingNames}
                  onSelect={handleAddInventoryIngredient}
                />
              )}

              {/* Custom text ingredient form (for non-inventory items) */}
              {showAddForm ? (
                <div className="p-3.5 rounded-xl bg-[#fcfaf7] border border-primary/20 space-y-3 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <span className="text-[10px] font-bold text-primary uppercase block tracking-wider">
                    Add Custom Ingredient (Not in Inventory)
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
                  + Add Custom Ingredient (Manual)
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
