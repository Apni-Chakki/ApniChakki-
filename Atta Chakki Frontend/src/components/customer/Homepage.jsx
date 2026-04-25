import { useState, useEffect } from 'react';
import { ServiceCard } from './ServiceCard';
import { UserReviews } from './UserReviews';
import { Card } from '../ui/card'; 
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { useTranslation } from 'react-i18next';
import { useCart } from '../../lib/CartContext';
import { API_BASE_URL } from '../../config';

// Import your custom local images
import wheatImg from '../../assets/Wheat and Flour.png';
import gramImg from '../../assets/Gram and pulses.png';
import riceImg from '../../assets/Rice.png';
import spicesImg from '../../assets/Spices.png';
import cottonImg from '../../assets/cotton.png';
import convenienceImg from '../../assets/convienece serviecs.png';

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1731082300550-8093311708ef?w=1400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1565607052745-35f8c6ba59b1?w=1400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1623066798929-946425dbe1b0?w=1400&auto=format&fit=crop&q=80"
];

// Map of local images for default fallback
const DEFAULT_CATEGORY_IMAGES = {
  'wheat': wheatImg,
  'gram': gramImg,
  'rice': riceImg,
  'spices': spicesImg,
  'cotton': cottonImg,
  'service': convenienceImg
};

export function Homepage() {
  const [services, setServices] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const { addToCart } = useCart();

  const animatedText = t("Apka Bhrosa Apki Apni Chakki");

  // --- CHANGED: Fetch from PHP Backend instead of LocalStorage ---
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/get_products.php`),
          fetch(`${API_BASE_URL}/get_categories.php`)
        ]);
        
        const data = await productsRes.json();
        const catsData = await categoriesRes.json();
        
        console.log("Categories Response:", catsData);
        console.log("Products Response:", data);
        
        if (catsData.success) {
          console.log("Setting categories:", catsData.categories);
          setDbCategories(catsData.categories || []);
        } else {
          console.error("Categories API returned success: false", catsData);
        }

        if (data.success) {
          setServices(data.products);
        } else {
          console.error("No products found or backend error");
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();

    // Listen for category updates from admin panel
    const handleCategoryUpdate = () => {
      console.log("Category update event received, refetching...");
      fetchProducts();
    };
    
    window.addEventListener('categoriesUpdated', handleCategoryUpdate);
    return () => window.removeEventListener('categoriesUpdated', handleCategoryUpdate);
  }, []);
  // Use only database categories - no static fallback
  const allCategories = dbCategories.map((dbCat, index) => {
    // Get fallback image - prefer local asset, then hero image
    let imageUrl = dbCat.image_url;
    
    // If no valid URL, use local image asset
    if (!imageUrl || (!imageUrl.startsWith('http') && imageUrl.endsWith('.png'))) {
      const categoryName = (dbCat.name || '').toLowerCase().replace(/\s+/g, '_');
      imageUrl = DEFAULT_CATEGORY_IMAGES[categoryName] || HERO_IMAGES[0];
    }
    
    return {
      id: dbCat.id || dbCat.name,
      labelKey: dbCat.name,
      imageUrl: imageUrl,
      overlayColor: ['bg-primary/35', 'bg-accent/30', 'bg-secondary/40', 'bg-orange-600/35', 'bg-amber-500/30', 'bg-accent/25'][index % 6]
    };
  });

  const getServicesByCategory = (categoryId) => {
    if (!services) return [];
    
    // Find the category object to get its name
    const selectedCat = allCategories.find(c => c.id === categoryId);
    if (!selectedCat) return [];
    
    // Filter by category NAME (products are saved with category name, not ID)
    return services.filter(s => s.category && s.category.toLowerCase() === selectedCat.labelKey.toLowerCase());
  };

  const getOtherServices = () => {
    return services.filter(service => !service.category); // Basic fallback
  };

  const displayedServices = selectedCategory 
    ? (selectedCategory === 'other' ? getOtherServices() : getServicesByCategory(selectedCategory))
    : [];

  // Helper to handle Add to Cart using the CartContext
  const handleAddToCart = (product) => {
    addToCart(product);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[300px] sm:h-[400px] md:h-[500px] overflow-hidden">
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGES[0]})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        </div>

        <div className="relative h-full container mx-auto px-4 sm:px-6 flex flex-col items-center justify-center text-center">
          <h1 className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-3 sm:mb-4 px-4 font-bold tracking-tight">
            {animatedText}
          </h1>
          <p className="text-white/90 text-base sm:text-lg md:text-xl max-w-2xl px-4">
            {t("Premium quality flour, spices, and cotton services. Ground fresh daily.")}
          </p>
        </div>
      </section>

      <section className="py-8 sm:py-12 md:py-16 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          {loading && (
            <div className="text-center py-12">
              <p>{t("Loading fresh products...")}</p>
            </div>
          )}

          {!loading && !selectedCategory && (
            <div>
              <h2 className="text-center mb-6 sm:mb-8 md:mb-10 text-3xl font-bold text-foreground">
                {t('Our Services')}
              </h2>
              {allCategories.length === 0 ? (
                <div className="text-center py-16 bg-muted/10 rounded-lg border-2 border-dashed border-muted">
                  <p className="text-lg text-muted-foreground mb-2">{t('No categories available yet.')}</p>
                  <p className="text-sm text-muted-foreground">{t('Please check back later or contact us for more information.')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {allCategories.map((category) => (
                    <Card
                      key={category.id}
                      className="cursor-pointer rounded-2xl shadow-lg hover:shadow-2xl transition-shadow duration-300 group relative overflow-hidden w-full"
                      style={{ height: '300px' }} 
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <div 
                        className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-500"
                        style={{ backgroundImage: `url(${category.imageUrl})` }}
                      />
                      <div className={`absolute inset-0 ${category.overlayColor} group-hover:opacity-70 transition-opacity duration-300`} />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors duration-300" />
                      <div className="relative h-full flex items-center justify-center px-6">
                        <h3 className="text-xl md:text-2xl font-bold text-white text-center drop-shadow-2xl leading-tight">
                          {t(category.labelKey)}
                        </h3>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && selectedCategory && (
            <div>
              <div className="flex items-center gap-4 mb-6">
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedCategory(null)}
                  className="flex items-center gap-2 hover:bg-secondary"
                >
                  <ArrowLeft className="h-4 w-4" /> {t('Back to Categories')}
                </Button>
                <h2 className="text-2xl font-bold text-foreground">
                  {t(allCategories.find(c => c.id === selectedCategory)?.labelKey || '')}
                </h2>
              </div>

              {displayedServices.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                  {displayedServices.map(service => (
                    <ServiceCard 
                      key={service.id} 
                      service={service} 
                      onAddToCart={() => handleAddToCart(service)}
                    />
                  ))}
                </div>
              )}

              {!displayedServices.length && (
                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-border">
                  <p>{t('No products found in this category.')}</p>
                  <Button variant="link" onClick={() => setSelectedCategory(null)}>
                    {t('Back to Categories')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <UserReviews />

      <section className="py-8 sm:py-12 md:py-16 px-4 bg-secondary/20">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="mb-4 sm:mb-6 text-3xl font-bold text-foreground">
            {t('Why Choose')} Apni Atta Chakki?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mt-6 sm:mt-8">
            <div className="p-5 sm:p-6 bg-card rounded-lg shadow-md border border-border">
              <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🌾</div>
              <h4 className="mb-2 text-xl font-semibold text-foreground">{t('Pure & Fresh')}</h4>
              <p className="text-muted-foreground text-sm sm:text-base">{t('Grains ground fresh daily with no additives.')}</p>
            </div>
            <div className="p-5 sm:p-6 bg-card rounded-lg shadow-md border border-border">
              <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🧵</div>
              <h4 className="mb-2 text-xl font-semibold text-foreground">{t('Traditional Services')}</h4>
              <p className="text-muted-foreground text-sm sm:text-base">{t('Expert Cotton Penja and Quilt filling services.')}</p>
            </div>
            <div className="p-5 sm:p-6 bg-card rounded-lg shadow-md border border-border sm:col-span-2 md:col-span-1">
              <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🚚</div>
              <h4 className="mb-2 text-xl font-semibold text-foreground">{t('Convenience')}</h4>
              <p className="text-muted-foreground text-sm sm:text-base">{t('Home pickup and delivery available.')}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}