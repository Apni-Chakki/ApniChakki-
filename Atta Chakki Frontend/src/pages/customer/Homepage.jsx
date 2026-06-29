import { useState, useEffect, lazy, Suspense } from 'react';
import { ServiceCard } from './ServiceCard';
const UserReviews = lazy(() => import('./UserReviews').then(module => ({ default: module.UserReviews })));
import { Card } from '../../components/common/card';
import { ArrowLeft, Tag, Copy, Star, Truck, ShieldCheck, Leaf, ArrowRight, Settings } from 'lucide-react';
import { Button } from '../../components/common/button';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../components/common/accordion';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '../../components/common/carousel';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/common/dialog';
import { Input } from '../../components/common/input';
import { Label } from '../../components/common/label';
import { Textarea } from '../../components/common/textarea';
import { useCart } from '../../store/CartContext';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';
import { motion } from 'framer-motion';
import { LazyAnimatedSection } from '../../components/common/LazyAnimatedSection';
import { useDynamicTranslation } from '../../hooks/useDynamicTranslation';
import { SEO } from '../../components/common/SEO';

const DEFAULT_HERO_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1731082300550-8093311708ef?w=1400&auto=format&fit=crop&q=80",
    title: "Apka Bhrosa Apki Apni Chakki",
    subtitle: "Premium quality flour, spices & cotton services. Ground fresh daily."
  },
  {
    image: "https://images.unsplash.com/photo-1565607052745-35f8c6ba59b1?w=1400&auto=format&fit=crop&q=80",
    title: "Pure & Fresh, Every Time",
    subtitle: "Grains ground with no additives — just the way nature intended."
  },
  {
    image: "https://images.unsplash.com/photo-1623066798929-946425dbe1b0?w=1400&auto=format&fit=crop&q=80",
    title: "Traditional Services, Modern Convenience",
    subtitle: "Expert Cotton Penja, Quilt filling & home delivery — all in one place."
  }
];

const DEFAULT_STORY_SLIDES = [
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1606822350882-a54cb0eb8de8?w=600&auto=format&fit=crop&q=80"
];

const sectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1]
    }
  }
};

const faqContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

const faqItemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 90, damping: 14 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 }
  }
};

export function Homepage() {
  const [services, setServices] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentStorySlide, setCurrentStorySlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState(DEFAULT_HERO_SLIDES);
  const [storySlides, setStorySlides] = useState(DEFAULT_STORY_SLIDES);
  const [featuredCoupons, setFeaturedCoupons] = useState([]);
  const [showCustomMixModal, setShowCustomMixModal] = useState(false);
  const [mixFormData, setMixFormData] = useState({ name: '', phone: '', details: '' });
  const [isSubmittingMix, setIsSubmittingMix] = useState(false);
  const { t, tDynamic, translateBatch, language } = useDynamicTranslation();
  const { addToCart } = useCart();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  useEffect(() => {
    if (storySlides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentStorySlide((prev) => (prev + 1) % storySlides.length);
    }, 6000); // Increased from 4000ms for slower, smoother view
    return () => clearInterval(timer);
  }, [storySlides.length]);

  // --- CHANGED: Fetch from PHP Backend instead of LocalStorage ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes, settingsRes, couponsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/get_products.php`),
          fetch(`${API_BASE_URL}/get_categories.php`),
          fetch(`${API_BASE_URL}/get_store_settings.php`),
          fetch(`${API_BASE_URL}/coupons/get_featured_coupons.php`)
        ]);

        const data = await productsRes.json();
        const catsData = await categoriesRes.json();
        const settingsData = await settingsRes.json();

        if (settingsData.success && settingsData.settings) {
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

        if (couponsRes.ok) {
          const couponsData = await couponsRes.json();
          if (couponsData.success) {
            setFeaturedCoupons(couponsData.coupons);
          }
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Listen for category updates from admin panel
    const handleCategoryUpdate = () => {
      console.log("Category update event received, refetching...");
      fetchData();
    };

    window.addEventListener('categoriesUpdated', handleCategoryUpdate);
    return () => window.removeEventListener('categoriesUpdated', handleCategoryUpdate);
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

  const copyCouponCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success(t('Coupon code copied!'));
  };

  const featuredProducts = services.slice(0, 4);
  const discountedProducts = services.filter(service => {
    const discountType = service.discount_type || 'none';
    const discountValue = parseFloat(service.discount_value) || 0;
    return discountType !== 'none' && discountValue > 0;
  });

  const handleCustomMixSubmit = async (e) => {
    e.preventDefault();
    if (!mixFormData.name || !mixFormData.phone || !mixFormData.details) {
      toast.error(t('Please fill all fields'));
      return;
    }
    setIsSubmittingMix(true);
    try {
      const response = await fetch(`${API_BASE_URL}/submit_custom_mix_request.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: mixFormData.name,
          customer_phone: mixFormData.phone,
          customer_email: 'custom.mix@apnichakki.com',
          product_name: 'General Custom Mix Request',
          custom_items: mixFormData.details,
          total_quantity: 5,
          estimated_price: 0
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('Custom Mix request sent! We will call you soon.'));
        setShowCustomMixModal(false);
        setMixFormData({ name: '', phone: '', details: '' });
      } else {
        toast.error(data.message || t('Failed to send request'));
      }
    } catch (error) {
      toast.error(t('Network error. Please try again.'));
    } finally {
      setIsSubmittingMix(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SEO 
        title="Home"
        description="Fresh, hygienic, and authentic Chakki Atta and premium spices delivered straight to your doorstep."
        keywords="chakki atta, fresh flour, pure spices, whole wheat, custom mix atta, online chakki"
      />
      {/* Hero Section */}
      <section className="relative overflow-hidden w-full" style={{ height: '65vh', minHeight: '400px' }}>
        {heroSlides.map((slide, i) => (
          <div
            key={i}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${slide.image})`,
              opacity: i === currentSlide ? 1 : 0,
              transition: 'opacity 1.2s ease-in-out',
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

        <div className="relative h-full container mx-auto px-4 sm:px-6 flex flex-col items-center justify-center text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-3 sm:mb-4 px-4 font-bold tracking-tight"
          >
            {heroSlides[currentSlide] ? tDynamic(heroSlides[currentSlide].title) : ''}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-white/90 text-base sm:text-lg md:text-xl max-w-2xl px-4"
          >
            {heroSlides[currentSlide] ? tDynamic(heroSlides[currentSlide].subtitle) : ''}
          </motion.p>
        </div>
      </section>

      {/* Auto-sliding Coupon Bar Below Hero */}
      {featuredCoupons.length > 0 && (
        <div className="bg-primary text-primary-foreground py-2.5 px-4 flex items-center w-full overflow-hidden shadow-sm border-b border-primary-foreground/10 group">
          <div className="flex w-max">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-marquee flex shrink-0 items-center whitespace-nowrap" style={{ paddingRight: '4rem' }} aria-hidden={i > 0 ? "true" : "false"}>
                {featuredCoupons.map((coupon, j) => (
                  <div key={`${i}-${j}`} className="flex items-center mr-10 bg-black/10 border border-primary-foreground/20 px-4 py-1.5 rounded-full">
                    <Tag className="h-4 w-4 mr-2 text-accent animate-pulse" />
                    <span className="text-sm font-medium tracking-wide">
                      {t('Code')}: <span className="font-bold text-accent tracking-wider px-1">{coupon.code}</span> | {t('Get')} <span className="font-bold">{coupon.discount_value}{coupon.discount_type === 'percentage' ? '%' : ' Rs.'}</span> {t('OFF')}
                      {coupon.description && <span className="opacity-80 ml-2 text-xs">({coupon.description})</span>}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Featured Products Section */}
      {!loading && !selectedCategory && featuredProducts.length > 0 && (
        <LazyAnimatedSection
          type="fade-up"
          placeholderHeight="450px"
          className="trending-section px-4 bg-gradient-to-b from-background to-secondary/10"
        >
          <section className="container mx-auto max-w-6xl">
            <div className="text-center mb-10 sm:mb-16">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                {t('Trending Now')}
              </h2>
              <p className="premium-section-sub">
                {t('Discover our most popular freshly ground products and premium spices, loved by our customers.')}
              </p>
            </div>
            <motion.div
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.08 } }
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
            >
              {featuredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  variants={itemVariants}
                  className="transition-all duration-500 hover:-translate-y-2 hover:shadow-xl rounded-2xl"
                >
                  <ServiceCard
                    service={product}
                    onAddToCart={() => handleAddToCart(product)}
                  />
                </motion.div>
              ))}
            </motion.div>
          </section>
        </LazyAnimatedSection>
      )}

      {/* Discounted Products Section */}
      {!loading && !selectedCategory && discountedProducts.length > 0 && (
        <LazyAnimatedSection
          type="fade-up"
          placeholderHeight="400px"
          className="discounted-section px-4 bg-gradient-to-b from-secondary/5 to-background border-t border-border/40"
        >
          <section className="container mx-auto max-w-6xl py-12">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                {t('Special Offers')}
              </h2>
              <p className="premium-section-sub">
                {t('Grab your favorites at discounted prices. Pure quality, sweet savings.')}
              </p>
            </div>

            <div className="relative px-4 sm:px-8 md:px-12">
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                }}
                className="w-full"
              >
                <CarouselContent
                  className={`-ml-2 md:-ml-4 ${
                    discountedProducts.length <= 1 ? 'justify-center' : ''
                  } ${
                    discountedProducts.length <= 2 ? 'sm:justify-center' : ''
                  } ${
                    discountedProducts.length <= 4 ? 'lg:justify-center' : ''
                  }`}
                >
                  {discountedProducts.map((product) => (
                    <CarouselItem key={product.id} className="basis-full sm:basis-1/2 lg:basis-1/4 pl-2 md:pl-4">
                      <div className="h-full py-2">
                        <ServiceCard
                          service={product}
                          onAddToCart={() => handleAddToCart(product)}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious
                  className={`-left-2 sm:-left-4 md:-left-6 ${
                    discountedProducts.length > 1 ? 'flex' : 'hidden'
                  } ${
                    discountedProducts.length > 2 ? 'sm:flex' : 'sm:hidden'
                  } ${
                    discountedProducts.length > 4 ? 'lg:flex' : 'lg:hidden'
                  }`}
                />
                <CarouselNext
                  className={`-right-2 sm:-right-4 md:-right-6 ${
                    discountedProducts.length > 1 ? 'flex' : 'hidden'
                  } ${
                    discountedProducts.length > 2 ? 'sm:flex' : 'sm:hidden'
                  } ${
                    discountedProducts.length > 4 ? 'lg:flex' : 'lg:hidden'
                  }`}
                />
              </Carousel>
            </div>
          </section>
        </LazyAnimatedSection>
      )}

      {/* Categories Section */}
      <LazyAnimatedSection
        type="fade-up"
        placeholderHeight="500px"
        className="py-8 sm:py-12 md:py-16 px-4 bg-background"
      >
        <section className="container mx-auto max-w-6xl">
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
                <motion.div
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.08 } }
                  }}
                  className="category-grid-responsive"
                >
                  {allCategories.map((category) => (
                    <motion.div
                      key={category.id}
                      variants={itemVariants}
                      className="w-full h-full"
                    >
                      <Card
                        className="category-card-responsive cursor-pointer rounded-2xl shadow-md hover:shadow-lg group relative overflow-hidden w-full border border-border hover:border-primary/50"
                        onClick={() => setSelectedCategory(category.id)}
                      >
                        <div
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                          style={{ backgroundImage: `url(${category.imageUrl})` }}
                        />
                        <div className={`absolute inset-0 ${category.overlayColor} opacity-60`} />
                        <div className="absolute inset-0 bg-black/30" />

                        <div className="relative h-full flex flex-col items-center justify-center px-6">
                          <h3 className="text-xl md:text-2xl font-bold text-white text-center drop-shadow-md">
                            {tDynamic(category.labelKey)}
                          </h3>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          )}

          {!loading && selectedCategory && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-6">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedCategory(null)}
                  className="flex items-center gap-2 hover:bg-secondary self-start -ml-6 sm:ml-0"
                >
                  <ArrowLeft className="h-4 w-4" /> {t('Back to Categories')}
                </Button>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                  {tDynamic(allCategories.find(c => c.id === selectedCategory)?.labelKey || '')}
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
        </section>
      </LazyAnimatedSection>

      {/* How It Works Section */}
      {!selectedCategory && (
        <LazyAnimatedSection
          type="fade-up"
          placeholderHeight="450px"
          className="py-20 sm:py-24 px-4 bg-secondary/5 relative overflow-hidden"
        >
          <section>
            <div className="absolute top-1/2 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 -z-10" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl -z-10" />

            <div className="container mx-auto max-w-5xl text-center relative z-10">
              <div className="inline-flex items-center justify-center gap-2 text-primary font-bold tracking-wider text-sm uppercase mb-4">
                ✨ {t('Simple Process')}
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-6">
                {t('How It Works')}
              </h2>
              <p className="premium-section-sub mb-16">
                {t('Experience the authentic taste of freshly ground flour in 3 simple steps.')}
              </p>

              <motion.div
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.15 } }
                }}
                className="how-it-works-grid relative"
              >
                {/* Connecting Line */}
                <div className="how-it-works-connector hidden md:block" />

                <motion.div variants={itemVariants} className="how-it-works-card group">
                  <div className="how-it-works-step-num">01</div>
                  <div className="how-it-works-icon-wrapper text-primary">
                    <Leaf className="w-10 h-10 transition-transform duration-500 group-hover:scale-110" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{t('Choose Grains')}</h3>
                  <p className="text-muted-foreground leading-relaxed">{t('Select from our premium range of wheat or create your own custom mix.')}</p>
                </motion.div>

                <motion.div variants={itemVariants} className="how-it-works-card group">
                  <div className="how-it-works-step-num">02</div>
                  <div className="how-it-works-icon-wrapper text-accent">
                    <Settings className="w-10 h-10 transition-transform duration-500 group-hover:rotate-45" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{t('Fresh Grinding')}</h3>
                  <p className="text-muted-foreground leading-relaxed">{t('We grind your order fresh upon receiving it to ensure maximum nutrition.')}</p>
                </motion.div>

                <motion.div variants={itemVariants} className="how-it-works-card group">
                  <div className="how-it-works-step-num">03</div>
                  <div className="how-it-works-icon-wrapper text-secondary" style={{ color: '#8b6f47' }}>
                    <Truck className="w-10 h-10 transition-transform duration-500 group-hover:translate-x-2" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{t('Fast Delivery')}</h3>
                  <p className="text-muted-foreground leading-relaxed">{t('Your fresh flour is carefully packaged and delivered right to your doorstep.')}</p>
                </motion.div>
              </motion.div>
            </div>
          </section>
        </LazyAnimatedSection>
      )}

      {/* Custom Mix CTA Banner */}
      {!selectedCategory && (
        <LazyAnimatedSection
          type="scale-up"
          placeholderHeight="300px"
          className="py-6 sm:py-8 px-4 bg-background"
        >
          <section className="container mx-auto max-w-5xl">
            <div className="relative rounded-[2rem] overflow-hidden shadow-2xl bg-accent">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1596647318469-89d53c614b19?w=1400&auto=format&fit=crop&q=80')" }}
              />

              <div className="relative custom-mix-card text-center text-white flex flex-col items-center">
                <div className="bg-white/20 p-4 rounded-full mb-6 backdrop-blur-sm">
                  <Leaf className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 drop-shadow-md">
                  {t('Design Your Own Atta')}
                </h2>
                <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl drop-shadow-md">
                  {t('Looking for a specific diet? Mix wheat, barley, oats, and more according to your exact requirements. We grind it fresh for you.')}
                </p>
                <Button size="lg" className="bg-white text-accent hover:bg-white/90 font-bold text-lg px-8 py-6 rounded-full shadow-lg transition-transform duration-300 hover:scale-105" onClick={() => setShowCustomMixModal(true)}>
                  {t('Request Custom Mix')} <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          </section>
        </LazyAnimatedSection>
      )}

      {/* Our Story Section */}
      {!selectedCategory && (
        <LazyAnimatedSection
          type="fade-up"
          placeholderHeight="550px"
          className="py-20 px-4 bg-secondary/10 relative overflow-hidden"
        >
          <section>
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl -z-10" />

            <div className="container mx-auto max-w-7xl">
              <div className="bg-card rounded-[2.5rem] shadow-xl border border-border/50 p-8 md:p-10 lg:p-16 relative z-10 overflow-hidden">
                <div className="flex flex-col sm:flex-row gap-8 sm:gap-16 items-center w-full">
                  {(() => {
                    const content = [
                      <motion.div
                        layout
                        key="image-col"
                        variants={{
                          hidden: { opacity: 0, x: -50 },
                          visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 90, damping: 15 } }
                        }}
                        transition={{ layout: { type: "spring", stiffness: 45, damping: 15, duration: 1.2 } }}
                        className="flex-1 w-full"
                      >
                        <div className={`relative w-full max-w-[280px] sm:max-w-md mx-auto group ${currentStorySlide % 2 !== 0 ? 'sm:ml-auto sm:mr-0' : 'sm:ml-0 sm:mr-auto'}`}>
                          <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-[2.5rem] blur-xl transform scale-105 transition-transform duration-700 group-hover:scale-110" />

                          {/* Floating Badge */}
                          <div className="absolute -top-6 -right-6 md:-top-8 md:-right-8 bg-white/90 backdrop-blur-md border border-white/50 shadow-2xl p-4 rounded-2xl z-20 flex flex-col items-center animate-bounce" style={{ animationDuration: '3s' }}>
                            <span className="text-2xl font-black text-primary block leading-none mb-1">10k+</span>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{t('Happy Families')}</span>
                          </div>

                          <div className="relative w-full rounded-[2.5rem] shadow-2xl -rotate-1 transition-transform duration-700 group-hover:rotate-0 overflow-hidden" style={{ aspectRatio: '4/3' }}>
                            {storySlides.map((slide, i) => (
                              <div
                                key={i}
                                className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out"
                                style={{
                                  backgroundImage: `url("${slide}")`,
                                  opacity: i === currentStorySlide ? 1 : 0,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </motion.div>,

                      <motion.div
                        layout
                        key="text-col"
                        variants={{
                          hidden: { opacity: 0, x: 50 },
                          visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 90, damping: 15 } }
                        }}
                        transition={{ layout: { type: "spring", stiffness: 45, damping: 15, duration: 1.2 } }}
                        className="flex-1 w-full space-y-8 text-center sm:text-left"
                      >
                        <div className="inline-flex items-center justify-center gap-2 bg-primary/10 text-primary px-5 py-2.5 rounded-full font-bold tracking-wider text-sm uppercase shadow-sm border border-primary/20 sm:justify-start">
                          <ShieldCheck className="w-5 h-5" /> {t('100% Pure & Authentic')}
                        </div>

                        <h2 className="text-3xl font-bold text-foreground leading-tight tracking-tight">
                          {t('The Heritage of Pure Flour')}
                        </h2>

                        <div className="space-y-5 text-lg text-muted-foreground leading-relaxed">
                          <p>
                            {t('At Apni Atta Chakki, we believe in preserving the traditional art of stone grinding. Unlike commercial mills, our process retains the natural oils, bran, and essential nutrients of the grain.')}
                          </p>
                          <p>
                            {t('Every grain is carefully sorted, cleaned, and ground fresh on order. No preservatives, no additives—just pure, wholesome goodness for your family.')}
                          </p>
                        </div>

                        <div className="pt-6 flex flex-col sm:flex-row items-center gap-6 justify-center sm:justify-start">
                          <Button size="lg" className="bg-primary hover:bg-primary/90 text-white rounded-full px-10 py-6 text-lg font-bold shadow-lg transition-transform duration-300 hover:scale-105 w-full sm:w-auto" onClick={() => window.location.href = '/reviews'}>
                            {t('Read Our Reviews')}
                          </Button>
                          <div className="flex items-center gap-2 text-muted-foreground font-medium bg-secondary/10 px-4 py-2 rounded-full">
                            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                            <span>{t('4.9/5 from Happy Customers')}</span>
                          </div>
                        </div>
                      </motion.div>
                    ];
                    
                    return currentStorySlide % 2 !== 0 ? content.reverse() : content;
                  })()}
                </div>
              </div>
            </div>
          </section>
        </LazyAnimatedSection>
      )}

      <LazyAnimatedSection
        type="fade-up"
        placeholderHeight="400px"
      >
        <UserReviews />
      </LazyAnimatedSection>

      <LazyAnimatedSection
        type="fade-up"
        placeholderHeight="350px"
        className="py-8 sm:py-12 md:py-16 px-4 bg-secondary/20"
      >
        <section className="container mx-auto max-w-4xl text-center">
          <h2 className="mb-4 sm:mb-6 text-3xl font-bold text-foreground">
            {t('Why Choose Apni Atta Chakki?')}
          </h2>
          <motion.div
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.1 } }
            }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mt-6 sm:mt-8"
          >
            <motion.div variants={itemVariants} className="p-5 sm:p-6 bg-card rounded-lg shadow-md border border-border">
              <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🌾</div>
              <h4 className="mb-2 text-xl font-semibold text-foreground">{t('Pure & Fresh')}</h4>
              <p className="text-muted-foreground text-sm sm:text-base">{t('Grains ground fresh daily with no additives.')}</p>
            </motion.div>
            <motion.div variants={itemVariants} className="p-5 sm:p-6 bg-card rounded-lg shadow-md border border-border">
              <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🧵</div>
              <h4 className="mb-2 text-xl font-semibold text-foreground">{t('Traditional Services')}</h4>
              <p className="text-muted-foreground text-sm sm:text-base">{t('Expert Cotton Penja and Quilt filling services.')}</p>
            </motion.div>
            <motion.div variants={itemVariants} className="p-5 sm:p-6 bg-card rounded-lg shadow-md border border-border sm:col-span-2 md:col-span-1">
              <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🚚</div>
              <h4 className="mb-2 text-xl font-semibold text-foreground">{t('Convenience')}</h4>
              <p className="text-muted-foreground text-sm sm:text-base">{t('Home pickup and delivery available.')}</p>
            </motion.div>
          </motion.div>
        </section>
      </LazyAnimatedSection>

      {/* FAQ Section */}
      {!selectedCategory && (
        <LazyAnimatedSection
          type="fade-up"
          placeholderHeight="500px"
          className="faq-section px-4 bg-background relative overflow-hidden border-t border-border/50"
        >
          <section>
            {/* Background decorative glows */}
            <div className="absolute top-1/2 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl -z-10" />

            <div className="container mx-auto max-w-3xl relative z-10">
              <div className="text-center mb-12">
                <div className="faq-title-badge">
                  💡 {t('Got Questions?')}
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  {t('Frequently Asked Questions')}
                </h2>
                <p className="faq-title-sub">
                  {t('Everything you need to know about our products and services.')}
                </p>
              </div>

              <motion.div
                variants={faqContainerVariants}
                initial="hidden"
                animate="visible"
              >
                <Accordion type="single" collapsible className="w-full">
                  <motion.div variants={faqItemVariants}>
                    <AccordionItem value="item-1" className="faq-accordion-item">
                      <AccordionTrigger className="faq-accordion-trigger">
                        <div className="flex items-center gap-4">
                          <span className="faq-badge-num">01</span>
                          <span>{t('Is the flour 100% pure without additives?')}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="faq-accordion-content">
                        <div className="faq-accordion-inner">
                          {t('Yes, absolutely! We guarantee 100% purity. We do not use any preservatives, bleach, or additives. The flour you receive is ground directly from high-quality grains.')}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>

                  <motion.div variants={faqItemVariants}>
                    <AccordionItem value="item-2" className="faq-accordion-item">
                      <AccordionTrigger className="faq-accordion-trigger">
                        <div className="flex items-center gap-4">
                          <span className="faq-badge-num">02</span>
                          <span>{t('How long does delivery take?')}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="faq-accordion-content">
                        <div className="faq-accordion-inner">
                          {t('Since we grind the flour fresh upon receiving your order, it typically takes 24 to 48 hours for your order to be processed and delivered to your doorstep.')}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>

                  <motion.div variants={faqItemVariants}>
                    <AccordionItem value="item-3" className="faq-accordion-item">
                      <AccordionTrigger className="faq-accordion-trigger">
                        <div className="flex items-center gap-4">
                          <span className="faq-badge-num">03</span>
                          <span>{t('Can I request a custom mix of grains?')}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="faq-accordion-content">
                        <div className="faq-accordion-inner">
                          {t('Yes! We offer a Custom Mix service where you can specify the ratio of wheat, barley, chickpeas, oats, or other grains. Simply contact us or leave a note during checkout.')}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>

                  <motion.div variants={faqItemVariants}>
                    <AccordionItem value="item-4" className="faq-accordion-item">
                      <AccordionTrigger className="faq-accordion-trigger">
                        <div className="flex items-center gap-4">
                          <span className="faq-badge-num">04</span>
                          <span>{t('Do you offer pickup services for cotton penja?')}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="faq-accordion-content">
                        <div className="faq-accordion-inner">
                          {t('Yes, we provide convenient home pickup and delivery for our Cotton Penja and Quilt filling services. Just schedule a pickup through our contact form.')}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                </Accordion>
              </motion.div>
            </div>
          </section>
        </LazyAnimatedSection>
      )}

      {/* Custom Mix Dialog Modal */}
      <Dialog open={showCustomMixModal} onOpenChange={setShowCustomMixModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{t('Design Your Custom Mix')}</DialogTitle>
            <DialogDescription>
              {t('Tell us exactly what you need. E.g., 5kg Wheat + 1kg Barley + 500g Oats.')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCustomMixSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="mixName">{t('Your Name')}</Label>
              <Input
                id="mixName"
                placeholder={t('Enter your full name')}
                value={mixFormData.name}
                onChange={e => setMixFormData({ ...mixFormData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mixPhone">{t('Phone Number')}</Label>
              <Input
                id="mixPhone"
                type="tel"
                placeholder="03xx xxxxxxx"
                value={mixFormData.phone}
                onChange={e => setMixFormData({ ...mixFormData, phone: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mixDetails">{t('Mix Details (Ingredients & Quantities)')}</Label>
              <Textarea
                id="mixDetails"
                placeholder={t('E.g. 5kg Wheat flour, 2kg Multigrain...')}
                rows={4}
                value={mixFormData.details}
                onChange={e => setMixFormData({ ...mixFormData, details: e.target.value })}
                required
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowCustomMixModal(false)}>
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={isSubmittingMix} className="min-w-[120px]">
                {isSubmittingMix ? t('Sending...') : t('Submit Request')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}




