import { motion } from 'framer-motion';
import { LazyAnimatedSection } from '../../../common/LazyAnimatedSection';
import { ServiceCard } from '../../../../pages/customer/ServiceCard';

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 }
  }
};

export function TrendingSection({ featuredProducts, onAddToCart, t }) {
  if (!featuredProducts || featuredProducts.length === 0) return null;

  return (
    <LazyAnimatedSection
      type="fade-up"
      placeholderHeight="450px"
      className="trending-section px-4 bg-gradient-to-b from-background to-secondary/10"
    >
      <section className="container mx-auto max-w-6xl">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
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
                onAddToCart={() => onAddToCart(product)}
              />
            </motion.div>
          ))}
        </motion.div>
      </section>
    </LazyAnimatedSection>
  );
}

export default TrendingSection;
