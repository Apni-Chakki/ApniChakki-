import { useState, useEffect } from 'react';
import { Save, Clock, MapPin, Phone, Mail, Megaphone, SplitSquareHorizontal, Map } from 'lucide-react';
import { Button } from '../../components/common/button';
import { Input } from '../../components/common/input';
import { Label } from '../../components/common/label';
import { Textarea } from '../../components/common/textarea';
import { Card } from '../../components/common/card';
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
    deliveryAreas: 'Lahore City Limits', // Updated default
    announcement: 'Special Offer: Get 10% off on your first order of fresh stone-ground flour!',
    processingTimePerKg: '2',
    heavyOrderThreshold: '100'
  });

  // NEW: State for our Dynamic Distance Math
  const [deliveryConfig, setDeliveryConfig] = useState({
    base_fare: 50,
    base_distance: 10,
    per_km_rate: 10
  });

  useEffect(() => {
    // 1. Fetch General Store Settings
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/get_store_settings.php`);
        const data = await response.json();
        if (data.success && data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      } catch (error) {
        console.error("Error fetching store settings:", error);
      }
    };

    // 2. Fetch Dynamic Delivery Settings
    const fetchDeliverySettings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/get_delivery_settings.php`);
        const data = await response.json();
        if (data.success && data.settings) {
          setDeliveryConfig({
            base_fare: data.settings.base_fare,
            base_distance: data.settings.base_distance,
            per_km_rate: data.settings.per_km_rate
          });
        }
      } catch (error) {
        console.error("Error fetching delivery settings:", error);
      }
    };

    fetchSettings();
    fetchDeliverySettings();
  }, []);

  const handleSave = async () => {
    try {
      // 1. Save Store Settings
      const storeResponse = await fetch(`${API_BASE_URL}/update_store_settings.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const storeData = await storeResponse.json();

      // 2. Save Delivery Math Settings
      const deliveryResponse = await fetch(`${API_BASE_URL}/update_delivery_settings.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deliveryConfig),
      });
      const deliveryData = await deliveryResponse.json();

      if (storeData.success && deliveryData.success) {
        toast.success('All settings saved successfully!');
        window.dispatchEvent(new Event('settingsUpdated'));
      } else {
        toast.error('Partial failure: ' + (storeData.message || deliveryData.message));
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error('Network error saving settings');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Store Settings</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage your store information and customer announcements</p>
      </div>

      <Card className="p-4 sm:p-6 border-amber-200 bg-amber-50/50">
        <h2 className="mb-3 sm:mb-4 flex items-center gap-2 font-semibold text-amber-900 text-sm sm:text-base">
          <Megaphone className="h-5 w-5 shrink-0" />
          Announcement Banner
        </h2>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="announcement">Banner Text</Label>
            <Textarea
              id="announcement"
              placeholder="Enter text for the sticky bottom banner..."
              value={settings.announcement}
              onChange={(e) => setSettings({ ...settings, announcement: e.target.value })}
              className="resize-none"
              rows={2}
            />
            <p className="text-xs sm:text-sm text-muted-foreground">
              This message will stay fixed at the bottom of the viewport until it reaches the footer.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-6">
        <h2 className="mb-4 sm:mb-6 font-semibold text-sm sm:text-base">Basic Information</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="storeName">Store Name</Label>
              <Input
                id="storeName"
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
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

          <div className="space-y-1.5">
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

          <div className="space-y-1.5">
            <Label htmlFor="address">
              <MapPin className="h-4 w-4 inline mr-2" />
              Store Address
            </Label>
            <Textarea
              id="address"
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              rows={2}
              className="resize-none"
            />
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-6">
        <h2 className="mb-4 sm:mb-6 font-semibold text-sm sm:text-base">Business Hours</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="openingTime">Opening Time</Label>
            <Input
              id="openingTime"
              type="time"
              value={settings.openingTime}
              onChange={(e) => setSettings({ ...settings, openingTime: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="closingTime">Closing Time</Label>
            <Input
              id="closingTime"
              type="time"
              value={settings.closingTime}
              onChange={(e) => setSettings({ ...settings, closingTime: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-4 sm:mt-6 border-t pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="processingTimePerKg">Processing Time Per Kg (minutes)</Label>
            <Input
              id="processingTimePerKg"
              type="number"
              min="1"
              step="0.5"
              value={settings.processingTimePerKg}
              onChange={(e) => setSettings({ ...settings, processingTimePerKg: e.target.value })}
              className="w-full md:w-1/2"
            />
            <p className="text-xs text-muted-foreground">
              This value is used by the auto-scheduler to calculate the Estimated Completion Time (ETA) for each order.
            </p>
          </div>
        </div>
      </Card>

      {/* NEW: Dynamic Delivery Fare UI */}
      <Card className="p-4 sm:p-6 border-blue-200 bg-blue-50/30">
        <h2 className="mb-4 sm:mb-6 flex items-center gap-2 font-semibold text-blue-900 text-sm sm:text-base">
          <Map className="h-5 w-5 shrink-0" />
          Dynamic Delivery Geofencing
        </h2>
        <div className="space-y-4 sm:space-y-6">

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="base_fare" className="font-bold">Base Fare (Rs.)</Label>
              <Input
                id="base_fare"
                type="number"
                value={deliveryConfig.base_fare}
                onChange={(e) => setDeliveryConfig({ ...deliveryConfig, base_fare: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">Starting price for nearby deliveries.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="base_distance" className="font-bold">Base Distance (km)</Label>
              <Input
                id="base_distance"
                type="number"
                value={deliveryConfig.base_distance}
                onChange={(e) => setDeliveryConfig({ ...deliveryConfig, base_distance: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">Distance covered by the Base Fare.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="per_km_rate" className="font-bold">Per Extra KM Rate (Rs.)</Label>
              <Input
                id="per_km_rate"
                type="number"
                value={deliveryConfig.per_km_rate}
                onChange={(e) => setDeliveryConfig({ ...deliveryConfig, per_km_rate: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">Fee added for every kilometer past the base distance.</p>
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-lg border border-blue-100 text-sm">
            <p className="font-semibold text-blue-800 mb-1">How it works on the Checkout Page:</p>
            <ul className="list-disc list-inside text-muted-foreground text-xs space-y-1">
              <li>Customer enters area, system maps it to GPS coordinates.</li>
              <li>System draws a straight line from store GPS to customer GPS.</li>
              <li>If distance is &le; {deliveryConfig.base_distance}km, fee is Rs. {deliveryConfig.base_fare}.</li>
              <li>If distance is 15km, fee is: {deliveryConfig.base_fare} + (5km x {deliveryConfig.per_km_rate}) = Rs. {Number(deliveryConfig.base_fare) + (5 * Number(deliveryConfig.per_km_rate))}.</li>
            </ul>
          </div>

        </div>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleSave} className="w-full sm:w-auto">
          <Save className="h-4 w-4 mr-2 shrink-0" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}




