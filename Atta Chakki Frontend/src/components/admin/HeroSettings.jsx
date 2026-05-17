import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Image as ImageIcon, Save } from 'lucide-react';
import { API_BASE_URL } from '../../config';

export function HeroSettings() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/get_store_settings.php`);
      const data = await response.json();
      
      if (data.success && data.settings && data.settings.heroSlides) {
        try {
          const parsedSlides = JSON.parse(data.settings.heroSlides);
          setSlides(parsedSlides);
        } catch (e) {
          console.error("Failed to parse heroSlides:", e);
          setSlides([]);
        }
      } else {
        // Default fallback if nothing in DB
        setSlides([
          {
            image: "https://images.unsplash.com/photo-1731082300550-8093311708ef?w=1400&auto=format&fit=crop&q=80",
            title: "Apka Bhrosa Apki Apni Chakki",
            subtitle: "Premium quality flour, spices & cotton services. Ground fresh daily."
          }
        ]);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load hero settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Ensure all slides have data
      const validSlides = slides.filter(s => s.image || s.title || s.subtitle);
      
      const payload = {
        settings: {
          heroSlides: JSON.stringify(validSlides)
        }
      };

      const response = await fetch(`${API_BASE_URL}/update_store_settings.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success("Hero settings saved successfully!");
      } else {
        toast.error(data.message || "Failed to save settings");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Network error while saving");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e, index) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    try {
      setUploadingIndex(index);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'hero');

      const response = await fetch(`${API_BASE_URL}/upload_image.php`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        const newSlides = [...slides];
        newSlides[index].image = data.url;
        setSlides(newSlides);
        toast.success('Image uploaded successfully');
      } else {
        toast.error(data.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Network error during upload');
    } finally {
      setUploadingIndex(null);
      // Reset input
      e.target.value = '';
    }
  };

  const updateSlide = (index, field, value) => {
    const newSlides = [...slides];
    newSlides[index][field] = value;
    setSlides(newSlides);
  };

  const addSlide = () => {
    setSlides([...slides, { image: '', title: '', subtitle: '' }]);
  };

  const removeSlide = (index) => {
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hero Section Settings</h1>
          <p className="text-muted-foreground text-sm">Manage the sliding banners on the customer homepage</p>
        </div>
      </div>

      <div className="space-y-6">
        {slides.map((slide, index) => (
          <Card key={index} className="p-6 border-muted bg-card shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-lg">Slide {index + 1}</h3>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => removeSlide(index)}
                className="px-6"
              >
                <Trash2 className="h-4 w-4 mr-2 text-white" /> Remove Slide
              </Button>
            </div>

            {/* FULL WIDTH HERO PREVIEW — exact same look as Homepage */}
            <div className="w-full rounded-lg overflow-hidden relative mb-8" style={{ aspectRatio: '16/6' }}>
              {slide.image ? (
                <img 
                  src={slide.image} 
                  alt={`Slide ${index + 1}`}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />
              ) : (
                <div className="absolute inset-0 bg-gray-800 flex flex-col items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-white/20 mb-2" />
                  <p className="text-sm text-white/40">No background image selected</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
              
              {/* Text Overlay — same as Homepage hero */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 sm:px-8">
                <h3 className="text-white text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3 drop-shadow-lg">
                  {slide.title || 'Your Title Will Appear Here'}
                </h3>
                <p className="text-white/90 text-sm sm:text-base md:text-lg max-w-2xl drop-shadow-md">
                  {slide.subtitle || 'Your subtitle description will appear here...'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Image Upload */}
              <div className="space-y-3">
                <Label className="text-base">Background Image Source</Label>
                
                <div className="flex flex-col gap-3 mt-2">
                  <div className="flex items-center gap-3">
                    <Label 
                      htmlFor={`upload-${index}`}
                      className={`cursor-pointer border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2.5 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors w-full sm:w-auto ${uploadingIndex === index ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {uploadingIndex === index ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                      ) : (
                        <><ImageIcon className="h-4 w-4 text-primary" /> Select From Device</>
                      )}
                    </Label>
                    <input 
                      id={`upload-${index}`}
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, index)}
                      disabled={uploadingIndex === index}
                    />
                  </div>
                  
                  <div className="relative flex items-center mt-2">
                    <div className="flex-grow border-t border-muted"></div>
                    <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs uppercase tracking-wider">OR PASTE URL</span>
                    <div className="flex-grow border-t border-muted"></div>
                  </div>

                  <Input 
                    value={slide.image || ''} 
                    onChange={(e) => updateSlide(index, 'image', e.target.value)}
                    placeholder="https://..."
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Texts */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base">Main Title (Tagline)</Label>
                  <Input 
                    value={slide.title || ''} 
                    onChange={(e) => updateSlide(index, 'title', e.target.value)}
                    placeholder="E.g. Pure & Fresh, Every Time"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-base">Subtitle (Description)</Label>
                  <textarea 
                    value={slide.subtitle || ''} 
                    onChange={(e) => updateSlide(index, 'subtitle', e.target.value)}
                    placeholder="E.g. Grains ground with no additives..."
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1.5"
                  />
                </div>
              </div>
            </div>
          </Card>
        ))}

        <Button 
          variant="outline" 
          onClick={addSlide} 
          className="w-full py-8 border-dashed border-2 hover:bg-muted/50 mb-4"
        >
          <Plus className="h-5 w-5 mr-2" /> Add New Slide
        </Button>
        
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving} size="lg" className="sm:w-auto min-w-[200px] shadow-sm">
            {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
            {saving ? "Saving Changes..." : "Save All Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
