import { Edit, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Card } from '../../../common/card';
import { Button } from '../../../common/button';

/**
 * Single service row card on the "Manage Services" admin page.
 * Displays priority badge, image, name, description, tag chips (price/category/
 * customizations/mix/tracked/dual-mode/discount/custom-badge), and the three
 * action buttons (toggle active, edit, delete).
 *
 * Extracted from ManageServices.jsx (Phase 3.2a) — behavior preserved exactly.
 *
 * Parent still owns:
 *  - the services array + category grouping
 *  - the mutation handlers (onToggleActive/onEdit/onDelete)
 *  - the isAdding/editingId flags that disable buttons during a form session
 *
 * @param {{
 *   service: object,
 *   isAdding: boolean,
 *   editingId: string | number | null,
 *   onToggleActive: (id: any, currentStatus: any) => void,
 *   onEdit: (service: object) => void,
 *   onDelete: (id: any) => void,
 * }} props
 */
export function ServiceListItem({ service, isAdding, editingId, onToggleActive, onEdit, onDelete }) {
  const custs = service.customizations || [];
  const hasCusts = custs.length > 0 || service.is_grinding_service === 1 || service.is_grinding_service === true;
  const busy = isAdding || editingId !== null;
  const isActive = Number(service.is_active) === 1;

  return (
    <Card
      className={`p-3 sm:p-6 transition-all duration-300 hover:shadow-lg border border-border/50 hover:border-primary/20 bg-white relative overflow-hidden group ${
        isActive ? '' : 'opacity-60 grayscale-[0.3]'
      }`}
    >
      {/* Priority Badge */}
      <div className="absolute top-0 right-0 bg-primary/10 text-primary text-[9px] sm:text-[10px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-bl border-l border-b border-primary/10 transition-all group-hover:bg-primary group-hover:text-primary-foreground">
        ⭐ {service.priority ?? 0}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:gap-4 mt-4 sm:mt-0">
        {service.image && (
          <div className="w-full sm:w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-muted border border-border shadow-inner">
            <img
              src={service.image}
              alt={service.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="mb-1.5 sm:mb-2 text-base sm:text-lg font-bold text-slate-800 flex flex-wrap items-center gap-2 break-words">
            <span className="break-words">{service.name}</span>
            {Number(service.is_active) === 0 && (
              <span className="text-[10px] sm:text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded border shrink-0">
                Disabled
              </span>
            )}
          </h3>
          <p className="text-muted-foreground mb-2 sm:mb-3 text-xs sm:text-sm line-clamp-2">
            {service.description || 'No description provided'}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="bg-primary/10 text-primary px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium border border-primary/20 break-words">
              Rs. {service.price} per {service.unit}
            </span>
            <span className="bg-slate-100 text-slate-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm capitalize border break-words">
              {service.category || service.category_name || 'Uncategorized'}
            </span>

            {hasCusts ? (
              <span className="bg-amber-500/10 text-amber-600 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border border-amber-500/20 break-words">
                ⚙️ {custs.length > 0
                  ? custs.map((c) => `${c.option_name}: Rs.${c.option_price}`).join(' + ')
                  : `Cleaning: ${service.cleaning_price} + Grinding: ${service.grinding_price}`}
              </span>
            ) : service.is_custom_mix ? (
              <span className="bg-purple-500/10 text-purple-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border border-purple-300 break-words">
                🌾 Custom Mix: {(service.mix_items || []).map((m) => m.item_name).join(', ')}
              </span>
            ) : (
              <span className="bg-gray-100 text-gray-500 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border">
                Standard Product
              </span>
            )}

            {(service.category === 'service' || service.category_name === 'service') ? (
              <span className="bg-green-500/10 text-green-600 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border border-green-500/20">
                Active Service
              </span>
            ) : (service.track_inventory == 1 || service.track_inventory === true) ? (
              <span className="bg-blue-500/10 text-blue-600 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border border-blue-500/20">
                ✓ Tracked
              </span>
            ) : (
              <span className="bg-gray-100 text-gray-500 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border border-gray-200">
                Not Tracked
              </span>
            )}

            {(service.dual_unit === 1 || service.dual_unit === true) && (
              <span className="bg-blue-600/10 text-blue-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border border-blue-300/30">
                🚚 Dual Mode
              </span>
            )}

            {service.discount_type && service.discount_type !== 'none' && parseFloat(service.discount_value) > 0 && (
              <span className="bg-emerald-600/10 text-emerald-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border border-emerald-300">
                {service.discount_type === 'percentage'
                  ? `🏷️ ${parseFloat(service.discount_value)}% OFF`
                  : `🏷️ Rs.${parseFloat(service.discount_value)} OFF`}
              </span>
            )}

            {service.badge_text && service.badge_text.trim() && (
              <span className="bg-rose-600/10 text-rose-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border border-rose-300 uppercase">
                {service.badge_text.trim()}
              </span>
            )}
          </div>
        </div>

        {/* Actions — full-width 3-col grid on mobile, vertical stack on desktop */}
        <div className="grid grid-cols-3 sm:flex sm:flex-col gap-2 pt-3 sm:pt-0 sm:self-start border-t sm:border-t-0 border-border shrink-0">
          <Button
            onClick={() => onToggleActive(service.id, service.is_active)}
            variant="outline"
            size="sm"
            disabled={busy}
            title={isActive ? 'Visible to customers — click to hide' : 'Hidden from customers — click to show'}
            className={`w-full sm:w-auto ${
              isActive
                ? 'border-emerald-500/40 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800'
                : 'border-red-500/40 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800'
            }`}
          >
            {isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button
            onClick={() => onEdit(service)}
            variant="outline"
            size="sm"
            disabled={busy}
            className="w-full sm:w-auto"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => onDelete(service.id)}
            variant="destructive"
            size="sm"
            disabled={busy}
            className="w-full sm:w-auto sm:px-4"
          >
            <Trash2 className="h-4 w-4 text-white" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
