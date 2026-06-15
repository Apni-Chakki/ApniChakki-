import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, UserCheck, UserX, Loader2 } from 'lucide-react';
import { Button } from '../../components/common/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/common/dialog';
import { Input } from '../../components/common/input';
import { Label } from '../../components/common/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/common/table';
import { Badge } from '../../components/common/badge';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';

export function ManageDelivery() {
  const [personnelList, setPersonnelList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  const fetchPersonnel = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/manage_delivery.php`);
      const data = await response.json();
      if (data.success) {
        setPersonnelList(data.personnel);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonnel();
  }, []);

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', password: '' });
  };

  // --- SPY CODE INJECTED HERE ---
  const handleAddPersonnel = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const response = await fetch(`${API_BASE_URL}/manage_delivery.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...formData })
      });
      
      // 1. Read as Raw Text first to catch PHP crashes!
      const rawText = await response.text(); 
      console.log("Raw PHP Response:", rawText);

      try {
        // 2. Try to parse it as JSON
        const result = JSON.parse(rawText);
        
        if (result.success) {
          toast.success('Delivery personnel added successfully');
          fetchPersonnel();
          setIsAddDialogOpen(false);
          resetForm();
        } else {
          toast.error(result.message || 'Failed to add personnel');
        }
      } catch (parseError) {
        // 3. If it's HTML/Error text, show it on the screen!
        alert("PHP Error Occurred:\n\n" + rawText);
        toast.error("Server returned an invalid response.");
      }

    } catch (error) {
      toast.error('Connection failed completely.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditClick = (personnel) => {
    setEditingPersonnel(personnel);
    setFormData({
      name: personnel.name,
      email: personnel.email || '',
      phone: personnel.phone,
      password: '', 
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdatePersonnel = async (e) => {
    e.preventDefault();
    if (!editingPersonnel) return;
    setIsProcessing(true);

    try {
      const response = await fetch(`${API_BASE_URL}/manage_delivery.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id: editingPersonnel.id, ...formData })
      });
      
      const rawText = await response.text();
      try {
        const result = JSON.parse(rawText);
        if (result.success) {
          toast.success('Delivery personnel updated successfully');
          fetchPersonnel();
          setIsEditDialogOpen(false);
          setEditingPersonnel(null);
          resetForm();
        } else {
          toast.error(result.message || 'Update failed');
        }
      } catch (e) {
        alert("PHP Error:\n" + rawText);
      }
    } catch (error) {
      toast.error('Network Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleActive = async (personnel) => {
    try {
      const response = await fetch(`${API_BASE_URL}/manage_delivery.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id: personnel.id, isActive: personnel.isActive ? 0 : 1 })
      });
      const result = await response.json();

      if (result.success) {
        toast.success(personnel.isActive ? 'Personnel deactivated' : 'Personnel activated');
        fetchPersonnel();
      }
    } catch (error) {
      toast.error("Failed to change status");
    }
  };

  const handleDelete = async (id) => {
    const deletePersonnel = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/manage_delivery.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id: id })
        });
        const result = await response.json();

        if (result.success) {
          toast.success('Delivery personnel deleted');
          fetchPersonnel();
        }
      } catch (error) {
        toast.error('Failed to delete');
      }
    };

    toast.custom((t) => (
      <div className="bg-primary border border-primary-foreground/20 rounded-lg p-4 shadow-xl flex flex-col gap-3 max-w-sm">
        <p className="text-primary-foreground font-medium">Are you sure you want to delete this delivery personnel?</p>
        <div className="flex gap-2 justify-end">
          <Button 
            onClick={() => toast.dismiss(t)} 
            variant="outline" 
            size="sm"
            className="bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 border-transparent"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              toast.dismiss(t);
              deletePersonnel();
            }} 
            size="sm"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent"
          >
            Delete
          </Button>
        </div>
      </div>
    ));
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto" /></div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl text-foreground font-bold">Manage Delivery Personnel</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Add and manage delivery team members
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2 shrink-0" />
          Add Personnel
        </Button>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Delivery Team</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {personnelList.length} {personnelList.length === 1 ? 'person' : 'people'} in the team
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {personnelList.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-muted-foreground">
              <p className="text-sm">No delivery personnel added yet.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2 shrink-0" />
                Add First Personnel
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile: card list (below md) */}
              <div className="md:hidden space-y-3">
                {personnelList.map((personnel) => (
                  <div key={personnel.id} className="border rounded-lg p-3 bg-card space-y-2.5">
                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-border">
                      <p className="font-semibold text-sm break-words min-w-0 flex-1">{personnel.name}</p>
                      {personnel.isActive ? (
                        <Badge className="bg-success text-success-foreground shrink-0 text-[10px]">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0 text-[10px]">Inactive</Badge>
                      )}
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="text-muted-foreground break-all">{personnel.email}</p>
                      <p className="text-muted-foreground break-all">{personnel.phone}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        className={`w-full ${personnel.isActive ? 'border-orange-300 hover:bg-orange-50' : 'border-green-300 hover:bg-green-50'}`}
                        onClick={() => handleToggleActive(personnel)}
                      >
                        {personnel.isActive ? (
                          <UserX className="h-4 w-4 text-orange-500" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-blue-200 hover:bg-blue-50"
                        onClick={() => handleEditClick(personnel)}
                      >
                        <Edit2 className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => handleDelete(personnel.id)}
                      >
                        <Trash2 className="h-4 w-4 text-white" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table (md and up) */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
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
                              onClick={() => handleToggleActive(personnel)}
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
                              onClick={() => handleEditClick(personnel)}
                            >
                              <Edit2 className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8 px-0 flex items-center justify-center"
                              onClick={() => handleDelete(personnel.id)}
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Personnel Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Add Delivery Personnel</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Add a new member to your delivery team. They'll receive login credentials to access the delivery panel.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddPersonnel}>
            <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
              <div className="space-y-1.5">
                <Label htmlFor="add-name" className="text-sm">Full Name</Label>
                <Input
                  id="add-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-email" className="text-sm">Email</Label>
                <Input
                  id="add-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@gristmill.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-phone" className="text-sm">Phone Number</Label>
                <Input
                  id="add-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-password" className="text-sm">Password</Label>
                <Input
                  id="add-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Create a password"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsAddDialogOpen(false); resetForm(); }}
                className="w-full sm:flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="outline"
                disabled={isProcessing}
                className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-primary-foreground border-primary hover:border-primary"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Personnel'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Personnel Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Edit Delivery Personnel</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Update personnel information. Leave password blank to keep current password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePersonnel}>
            <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-sm">Full Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-email" className="text-sm">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone" className="text-sm">Phone Number</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-password" className="text-sm">New Password (Optional)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Type to change password"
                  minLength={6}
                />
              </div>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsEditDialogOpen(false); setEditingPersonnel(null); resetForm(); }}
                className="w-full sm:flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="outline"
                disabled={isProcessing}
                className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-primary-foreground border-primary hover:border-primary"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Personnel'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}




