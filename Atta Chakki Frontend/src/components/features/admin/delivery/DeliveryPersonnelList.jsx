import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../common/card';
import { Button } from '../../../common/button';
import { Plus, Users } from 'lucide-react';
import { DeliveryPersonnelMobileCard } from './DeliveryPersonnelMobileCard';
import { DeliveryPersonnelTable } from './DeliveryPersonnelTable';
import { EmptyState } from '../../../shared/EmptyState';

export function DeliveryPersonnelList({
  personnelList,
  onAddClick,
  onToggleActive,
  onEdit,
  onDelete,
}) {
  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg">Delivery Team</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {personnelList.length} {personnelList.length === 1 ? 'person' : 'people'} in the team
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
        {personnelList.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No delivery personnel added yet"
            description="Add your delivery team members to start assigning orders."
            action={
              <Button
                variant="outline"
                onClick={onAddClick}
              >
                <Plus className="h-4 w-4 mr-2 shrink-0" />
                Add First Personnel
              </Button>
            }
          />
        ) : (
          <>
            {/* Mobile: card list (below md) */}
            <div className="md:hidden space-y-3">
              {personnelList.map((personnel) => (
                <DeliveryPersonnelMobileCard
                  key={personnel.id}
                  personnel={personnel}
                  onToggleActive={onToggleActive}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>

            {/* Desktop: table (md and up) */}
            <DeliveryPersonnelTable
              personnelList={personnelList}
              onToggleActive={onToggleActive}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
