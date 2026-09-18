import { useState, useEffect, lazy } from 'react';
import { useCart } from '../../store/CartContext';
import { API_BASE_URL } from '../../config';
import { useDynamicTranslation } from '../../hooks/useDynamicTranslation';
import { SEO } from '../../components/common/SEO';
import { LazyAnimatedSection } from '../../components/common/LazyAnimatedSection';

// Extracted Modular Sections
import { HeroSection } from '../../components/features/customer/home/HeroSection';
import { CouponsTickerBar } from '../../components/features/customer/home/CouponsTickerBar';
import { SpecialOffersSection } from '../../components/features/customer/home/SpecialOffersSection';
import { CategoriesSection } from '../../components/features/customer/home/CategoriesSection';
import { TrendingSection } from '../../components/features/customer/home/TrendingSection';
import { HowItWorksSection } from '../../components/features/customer/home/HowItWorksSection';
import { CustomMixBanner } from '../../components/features/customer/home/CustomMixBanner';
import { CustomMixModal } from '../../components/features/customer/home/CustomMixModal';
import { StorySection } from '../../components/features/customer/home/StorySection';
import { WhyChooseUsSection } from '../../components/features/customer/home/WhyChooseUsSection';
import { FaqSection } from '../../components/features/customer/home/FaqSection';
import '../../components/features/customer/home/HomeSections.css';

const UserReviews = lazy(() => import('@/components/features/customer/reviews/UserReviews').then(module => ({ default: module.UserReviews })));

const DEFAULT_HERO_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1731082300550-8093311708ef?w=600&auto=format&fit=crop&q=70&fm=webp",
    title: "Apka Bhrosa Apki Suchi Chakki",
    subtitle: "Premium quality flour, spices & cotton services. Ground fresh daily."
  },
  {
    image: "https://images.unsplash.com/photo-1565607052745-35f8c6ba59b1?w=600&auto=format&fit=crop&q=70&fm=webp",
    title: "Pure & Fresh, Every Time",
    subtitle: "Grains ground with no additives — just the way nature intended."
  },
  {
    image: "https://images.unsplash.com/photo-1623066798929-946425dbe1b0?w=600&auto=format&fit=crop&q=70&fm=webp",
    title: "Traditional Services, Modern Convenience",
    subtitle: "Expert Cotton Penja, Quilt filling & home delivery — all in one place."
  }
];

const DEFAULT_STORY_SLIDES = [
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=75&fm=webp",
  "https://images.unsplash.com/photo-1606822350882-a54cb0eb8de8?w=500&auto=format&fit=crop&q=75&fm=webp"
];

export function Homepage() {
  const [services, setServices] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [heroSlides, setHeroSlides] = useState(DEFAULT_HERO_SLIDES);
  const [storySlides, setStorySlides] = useState(DEFAULT_STORY_SLIDES);
  const [featuredCoupons, setFeaturedCoupons] = useState([]);
  const [showCustomMixModal, setShowCustomMixModal] = useState(false);
  const [storeName, setStoreName] = useState("Suchi Chakki");
  const { t, tDynamic, translateBatch, language } = useDynamicTranslation();
  const { addToCart } = useCart();

  // Fetch from PHP Backend with real-time stock auto-refresh & cache-busting
  useEffect(() => {
    let isMounted = true;

    const fetchData = async (isBackground = false) => {
      try {
        if (!isBackground) setLoading(true);
        const [productsRes, categoriesRes, settingsRes, couponsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/get_products.php?_t=${Date.now()}`, { cache: 'no-store' }),
          fetch(`${API_BASE_URL}/get_categories.php?_t=${Date.now()}`, { cache: 'no-store' }),
          fetch(`${API_BASE_URL}/get_store_settings.php?_t=${Date.now()}`, { cache: 'no-store' }),
          fetch(`${API_BASE_URL}/coupons/get_featured_coupons.php?_t=${Date.now()}`, { cache: 'no-store' })
        ]);

        const data = await productsRes.json();
        const catsData = await categoriesRes.json();
        const settingsData = await settingsRes.json();

        if (!isMounted) return;

        if (settingsData.success && settingsData.settings) {
          if (settingsData.settings.storeName) {
            setStoreName(settingsData.settings.storeName);
          }
          if (settingsData.settings.heroSlides) {
            try {
              setHeroSlides(JSON.parse(settingsData.settings.heroSlides));
            } catch (e) { console.error("Failed to parse heroSlides", e); }
          }
          if (settingsData.settings.storySlides) {
            try {
              const rawVal = settingsData.settings.storySlides;
              const parsed = typeof rawVal === 'string' ? JSON.parse(rawVal) : rawVal;
              if (Array.isArray(parsed)) {
                const storyUrls = parsed.map(s => {
                  if (typeof s === 'string') return s;
                  if (s && typeof s === 'object' && s.image) return s.image;
                  return '';
                }).filter(Boolean);
                if (storyUrls.length > 0) {
                  setStorySlides(storyUrls);
                }
              }
            } catch (e) { console.error("Failed to parse storySlides", e); }
          }
        }

        if (catsData.success) {
          setDbCategories(catsData.categories || []);
        }

        if (data.success && Array.isArray(data.products)) {
          setServices(data.products);
        }

        if (couponsRes.ok) {
          const couponsData = await couponsRes.json();
          if (couponsData.success) {
            setFeaturedCoupons(couponsData.coupons);
          }
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData(false);

    // Auto-refresh products and stock every 10 seconds in background
    const stockInterval = setInterval(() => {
      fetchData(true);
    }, 10000);

    // Refresh immediately when user returns to the tab or focuses window
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData(true);
      }
    };

    // Listen for category or order updates
    const handleRefreshEvent = () => {
      fetchData(true);
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleRefreshEvent);
    window.addEventListener('categoriesUpdated', handleRefreshEvent);
    window.addEventListener('ordersUpdated', handleRefreshEvent);

    return () => {
      isMounted = false;
      clearInterval(stockInterval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleRefreshEvent);
      window.removeEventListener('categoriesUpdated', handleRefreshEvent);
      window.removeEventListener('ordersUpdated', handleRefreshEvent);
    };
  }, []);

  // Pre-fetch translations for all dynamic DB text in one batch call
  useEffect(() => {
    if (language === 'en') return;
    const categoryNames = dbCategories.map(c => c.name).filter(Boolean);
    const productTexts = services.flatMap(s => [s.name, s.description, s.unit].filter(Boolean));
    const slideTexts = heroSlides.flatMap(s => [s.title, s.subtitle].filter(Boolean));
    translateBatch([...categoryNames, ...productTexts, ...slideTexts]);
  }, [dbCategories, services, heroSlides, language]);

  // Use only database categories
  const allCategories = dbCategories.map((dbCat, index) => {
    return {
      id: dbCat.id || dbCat.name,
      labelKey: dbCat.name,
      imageUrl: dbCat.image_url || '',
      overlayColor: ['bg-primary/35', 'bg-accent/30', 'bg-secondary/40', 'bg-orange-600/35', 'bg-amber-500/30', 'bg-accent/25'][index % 6]
    };
  });

  const getServicesByCategory = (categoryId) => {
    if (!services) return [];
    const selectedCat = allCategories.find(c => c.id === categoryId);
    if (!selectedCat) return [];
    return services.filter(s => s.category && s.category.toLowerCase() === selectedCat.labelKey.toLowerCase());
  };

  const getOtherServices = () => {
    return services.filter(service => !service.category);
  };

  const displayedServices = selectedCategory
    ? (selectedCategory === 'other' ? getOtherServices() : getServicesByCategory(selectedCategory))
    : [];

  const handleAddToCart = (product) => {
    addToCart(product);
  };

  const featuredProducts = services.slice(0, 4);
  const discountedProducts = services.filter(service => {
    const discountType = service.discount_type || 'none';
    const discountValue = parseFloat(service.discount_value) || 0;
    return discountType !== 'none' && discountValue > 0;
  });

  return (
    <div className="min-h-screen">
      <SEO 
        title="Home"
        description="Fresh, hygienic, and authentic Chakki Atta and premium spices delivered straight to your doorstep."
        keywords="chakki atta, fresh flour, pure spices, whole wheat, custom mix atta, online chakki"
      />

      {/* Hero Section */}
      <HeroSection heroSlides={heroSlides} tDynamic={tDynamic} />

      {/* Auto-sliding Coupon Bar Below Hero */}
      <CouponsTickerBar featuredCoupons={featuredCoupons} t={t} />

      {/* Discounted Products Section */}
      {!loading && !selectedCategory && (
        <SpecialOffersSection
          discountedProducts={discountedProducts}
          onAddToCart={handleAddToCart}
          t={t}
        />
      )}

      {/* Categories Section */}
      <CategoriesSection
        loading={loading}
        allCategories={allCategories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        displayedServices={displayedServices}
        onAddToCart={handleAddToCart}
        t={t}
        tDynamic={tDynamic}
      />

      {/* Trending Now Section */}
      {!loading && !selectedCategory && (
        <TrendingSection
          featuredProducts={featuredProducts}
          onAddToCart={handleAddToCart}
          t={t}
        />
      )}

      {/* How It Works Section */}
      {!selectedCategory && (
        <HowItWorksSection t={t} />
      )}

      {/* Custom Mix CTA Banner */}
      {!selectedCategory && (
        <CustomMixBanner onOpenModal={() => setShowCustomMixModal(true)} t={t} />
      )}

      {/* Our Story Section */}
      {!selectedCategory && (
        <StorySection storySlides={storySlides} storeName={storeName} t={t} />
      )}

      {/* User Reviews Section */}
      <LazyAnimatedSection type="fade-up" placeholderHeight="400px">
        <UserReviews />
      </LazyAnimatedSection>

      {/* Why Choose Us Section */}
      <WhyChooseUsSection storeName={storeName} t={t} />

      {/* FAQ Section */}
      {!selectedCategory && (
        <FaqSection t={t} />
      )}

      {/* Custom Mix Dialog Modal */}
      <CustomMixModal
        open={showCustomMixModal}
        onOpenChange={setShowCustomMixModal}
        t={t}
      />
    </div>
  );
}

export default Homepage;
