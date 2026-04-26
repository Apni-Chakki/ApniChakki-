import { useState, useEffect } from 'react';
import { Save, Clock, MapPin, Phone, Mail, Megaphone } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card } from '../ui/card';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';

export function Settings() {
  const [settings, setSettings] = useState({
    storeName: "Mughal Ata Chaki",
    phone: '+92 3228483029',
    email: 'info@gristmill.com',
    address: 'Lahore, Pakistan',
    openingTime: '08:00',
    closingTime: '20:00',
    deliveryAreas: 'Sorrunding of Thokar Niaz Baig',
    deliveryCharge: '50',
    minOrderForFreeDelivery: '500',
    announcement: 'Special Offer: Get 10% off on your first order of fresh stone-ground flour!',
    processingTimePerKg: '2'
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/get_store_settings.php`);
        const data = await response.json();
        if (data.success && data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        // Keep defaults if API is unavailable
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/update_store_settings.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Settings saved successfully!');
        // Emit event to notify Footer and Header to refresh settings
        window.dispatchEvent(new Event('settingsUpdated'));
      } else {
        toast.error(data.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error('Network error saving settings');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Store Settings</h1>
        <p className="text-muted-foreground">Manage your store information and customer announcements</p>
      </div>

      <Card className="p-6 border-amber-200 bg-amber-50/50">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-amber-900">
          <Megaphone className="h-5 w-5" />
          Announcement Banner
        </h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="announcement">Banner Text</Label>
            <Textarea
              id="announcement"
              placeholder="Enter text for the sticky bottom banner..."
              value={settings.announcement}
              onChange={(e) => setSettings({ ...settings, announcement: e.target.value })}
              className="bg-white"
              rows={2}
            />
            <p className="text-sm text-muted-foreground mt-2">
              This message will stay fixed at the bottom of the viewport until it reaches the footer.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-6 font-semibold">Basic Information</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="storeName">Store Name</Label>
              <Input
                id="storeName"
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">
                <Phone className="h-4 w-4 inline mr-2" />
                Phone Number
              </Label>
              <Input
                id="phone"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">
              <Mail className="h-4 w-4 inline mr-2" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="address">
              <MapPin className="h-4 w-4 inline mr-2" />
              Store Address
            </Label>
            <Textarea
              id="address"
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              rows={2}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-6 font-semibold"> Business Hours</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="openingTime">Opening Time</Label>
            <Input
              id="openingTime"
              type="time"
              value={settings.openingTime}
              onChange={(e) => setSettings({ ...settings, openingTime: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="closingTime">Closing Time</Label>
            <Input
              id="closingTime"
              type="time"
              value={settings.closingTime}
              onChange={(e) => setSettings({ ...settings, closingTime: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-6 border-t pt-4">
          <Label htmlFor="processingTimePerKg" className="mb-2 block">Processing Time Per Kg (minutes)</Label>
          <Input
            id="processingTimePerKg"
            type="number"
            min="1"
            step="0.5"
            value={settings.processingTimePerKg}
            onChange={(e) => setSettings({ ...settings, processingTimePerKg: e.target.value })}
            className="w-full md:w-1/2"
          />
          <p className="text-xs text-muted-foreground mt-2">
            This value is used by the auto-scheduler to calculate the Estimated Completion Time (ETA) for each order.
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-6 font-semibold">Delivery Settings</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="deliveryAreas">Delivery Areas (comma separated)</Label>
            <Textarea
              id="deliveryAreas"
              placeholder="e.g., Sector 15, Green Park, Hauz Khas"
              value={settings.deliveryAreas}
              onChange={(e) => setSettings({ ...settings, deliveryAreas: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deliveryCharge">Delivery Charge (₹)</Label>
              <Input
                id="deliveryCharge"
                type="number"
                value={settings.deliveryCharge}
                onChange={(e) => setSettings({ ...settings, deliveryCharge: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="minOrderForFreeDelivery">Minimum Order for Free Delivery (₹)</Label>
              <Input
                id="minOrderForFreeDelivery"
                type="number"
                value={settings.minOrderForFreeDelivery}
                onChange={(e) => setSettings({ ...settings, minOrderForFreeDelivery: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleSave} size="lg">
          <Save className="h-5 w-5 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}