import { motion } from 'framer-motion';
import { Leaf, Settings, Truck } from 'lucide-react';
import { LazyAnimatedSection } from '../../../common/LazyAnimatedSection';
import './HowItWorksSection.css';

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 }
  }
};

export function HowItWorksSection({ t }) {
  return (
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
  );
}

export default HowItWorksSection;
