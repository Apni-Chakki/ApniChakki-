import { motion } from 'framer-motion';
import { LazyAnimatedSection } from '../../../common/LazyAnimatedSection';

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 }
  }
};

export function WhyChooseUsSection({ storeName, t }) {
  return (
    <LazyAnimatedSection
      type="fade-up"
      placeholderHeight="350px"
      className="py-8 sm:py-12 md:py-16 px-4 bg-secondary/20"
    >
      <section className="container mx-auto max-w-4xl text-center">
        <h2 className="mb-4 sm:mb-6 text-3xl font-bold text-foreground">
          {t('Why Choose Suchi Chakki?').replace(/Suchi Chakki|Apni Atta Chakki/g, storeName)}
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
  );
}

export default WhyChooseUsSection;
