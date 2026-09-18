import { motion } from 'framer-motion';
import { Card } from '../../../common/card';
import { Button } from '../../../common/button';
import { ArrowLeft } from 'lucide-react';
import { LazyAnimatedSection } from '../../../common/LazyAnimatedSection';
import { ServiceCard } from '../../../../pages/customer/ServiceCard';
import './CategoriesSection.css';

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 }
  }
};

export function CategoriesSection({
  loading,
  allCategories,
  selectedCategory,
  setSelectedCategory,
  displayedServices,
  onAddToCart,
  t,
  tDynamic,
}) {
  return (
    <LazyAnimatedSection
      type="fade-up"
      placeholderHeight="500px"
      className="py-6 sm:py-8 md:py-10 px-4 bg-background"
    >
      <section className="container mx-auto max-w-6xl">
        {loading && (
          <div className="text-center py-12">
            <p>{t('Loading fresh products...')}</p>
          </div>
        )}

        {!loading && !selectedCategory && (
          <div>
            <h2 className="text-center mb-4 sm:mb-6 text-2xl sm:text-3xl font-bold text-foreground">
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
                    onAddToCart={() => onAddToCart(service)}
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
  );
}

export default CategoriesSection;
