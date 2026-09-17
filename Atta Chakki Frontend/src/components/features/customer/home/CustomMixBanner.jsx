import { Leaf, ArrowRight } from 'lucide-react';
import { Button } from '../../../common/button';
import { LazyAnimatedSection } from '../../../common/LazyAnimatedSection';

export function CustomMixBanner({ onOpenModal, t }) {
  return (
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
            <Button
              size="lg"
              className="bg-white text-accent hover:bg-white/90 font-bold text-lg px-8 py-6 rounded-full shadow-lg transition-transform duration-300 hover:scale-105"
              onClick={onOpenModal}
            >
              {t('Request Custom Mix')} <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>
    </LazyAnimatedSection>
  );
}

export default CustomMixBanner;
