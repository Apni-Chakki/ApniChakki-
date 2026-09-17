import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Star } from 'lucide-react';
import { Button } from '../../../common/button';
import { LazyAnimatedSection } from '../../../common/LazyAnimatedSection';

export function StorySection({ storySlides, storeName, t }) {
  const [currentStorySlide, setCurrentStorySlide] = useState(0);

  useEffect(() => {
    if (!storySlides || storySlides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentStorySlide((prev) => (prev + 1) % storySlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [storySlides]);

  return (
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
                      hidden: { opacity: 0, x: -30 },
                      visible: { opacity: 1, x: 0, transition: { duration: 0.5 } }
                    }}
                    className="flex-1 w-full"
                  >
                    <div className={`relative w-full max-w-[280px] sm:max-w-md mx-auto group ${currentStorySlide % 2 !== 0 ? 'sm:ml-auto sm:mr-0' : 'sm:ml-0 sm:mr-auto'}`}>
                      <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-[2.5rem] blur-xl transform scale-105 transition-transform duration-700 group-hover:scale-110" />

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
                      hidden: { opacity: 0, x: 30 },
                      visible: { opacity: 1, x: 0, transition: { duration: 0.5 } }
                    }}
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
                        {t('At Suchi Chakki, we believe in preserving the traditional art of stone grinding. Unlike commercial mills, our process retains the natural oils, bran, and essential nutrients of the grain.').replace(/Suchi Chakki|Apni Atta Chakki/g, storeName)}
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
  );
}

export default StorySection;
