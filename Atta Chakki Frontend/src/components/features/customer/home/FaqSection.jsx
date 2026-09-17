import { motion } from 'framer-motion';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../../common/accordion';
import { LazyAnimatedSection } from '../../../common/LazyAnimatedSection';

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

export function FaqSection({ t }) {
  return (
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
  );
}

export default FaqSection;
