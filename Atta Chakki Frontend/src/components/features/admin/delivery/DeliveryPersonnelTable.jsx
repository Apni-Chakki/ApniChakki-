import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../../common/badge';
import { Button } from '../../../common/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../common/table';
import { UserCheck, UserX, Edit2, Trash2 } from 'lucide-react';

export function DeliveryPersonnelTable({ personnelList, onToggleActive, onEdit, onDelete }) {
  const { t } = useTranslation();

  return (
    <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>{t('CNIC Number')}</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {personnelList.map((personnel) => (
            <TableRow key={personnel.id}>
              <TableCell className="font-medium">{personnel.name}</TableCell>
              <TableCell>{personnel.email}</TableCell>
              <TableCell>{personnel.phone}</TableCell>
              <TableCell>{personnel.cnic}</TableCell>
              <TableCell>
                {personnel.isActive ? (
                  <Badge className="bg-success text-success-foreground">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className={`h-8 w-8 px-0 flex items-center justify-center ${personnel.isActive ? 'border-orange-300 hover:bg-orange-50' : 'border-green-300 hover:bg-green-50'}`}
                    onClick={() => onToggleActive(personnel)}
                    title={personnel.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {personnel.isActive ? (
                      <UserX className="h-4 w-4 text-orange-500" />
                    ) : (
                      <UserCheck className="h-4 w-4 text-green-600" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 px-0 flex items-center justify-center border-blue-200 hover:bg-blue-50"
                    onClick={() => onEdit(personnel)}
                  >
                    <Edit2 className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8 px-0 flex items-center justify-center"
                    onClick={() => onDelete(personnel.id)}
                  >
                    <Trash2 className="h-4 w-4 text-white" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
