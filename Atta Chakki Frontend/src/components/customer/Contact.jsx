import { useState, useEffect } from 'react';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../config';

const DEFAULT_SETTINGS = {
  storeName: "Apni Chakki",
  phone: "+92 300 1234567",
  email: "info@example.com",
  address: "Lahore, Pakistan",
  openingTime: "08:00",
  closingTime: "20:00"
};

export function Contact() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
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
        console.error("Could not load store settings:", error);
        // Keep defaults if API is unavailable
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/submit_contact.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message || 'Message sent! We will get back to you soon.');
        setFormData({ name: '', email: '', message: '' });
      } else {
        toast.error(data.message || 'Failed to send message');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="mb-4">{t('Contact Us')}</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Have questions? We'd love to hear from you. Send us a message or visit {settings.storeName}.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Information */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="mb-6">{t('Get in Touch')}</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('Phone')}</p>
                    <a href={`tel:${settings.phone}`} className="hover:text-primary font-medium">
                      {settings.phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('Email')}</p>
                    <a href={`mailto:${settings.email}`} className="hover:text-primary font-medium">
                      {settings.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('Address')}</p>
                    <p className="font-medium">{settings.address}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('Business Hours')}</p>
                    <p className="font-medium">{settings.openingTime} - {settings.closingTime}</p>
                    <p className="text-sm text-muted-foreground">Monday - Sunday</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-secondary/20">
              <h3 className="mb-4">{`Why Choose ${settings.storeName}?`}</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>{t('Fresh flour ground daily with premium quality grains')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>{t('Fast delivery and convenient pickup options')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>{t('Competitive pricing with no hidden charges')}</span>
                </li>
              </ul>
            </Card>
          </div>

          {/* Contact Form */}
          <Card className="p-6">
            <h2 className="mb-6">{t('Send us a Message')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">{t('Name')}</Label>
                <Input
                  id="name"
                  placeholder={t('Your name')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email">{t('Email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="message">{t('Message')}</Label>
                <Textarea
                  id="message"
                  placeholder={t('How can we help you?')}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={5}
                  required
                  className="mt-1"
                />
              </div>

              <Button type="submit" size="lg" className="w-full">
                {t('Send Message')}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}