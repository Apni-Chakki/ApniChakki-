import { useTranslation } from 'react-i18next';
import Autoplay from 'embla-carousel-autoplay';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '../../../common/carousel';
import { LazyAnimatedSection } from '../../../common/LazyAnimatedSection';
import { ServiceCard } from '../../../../pages/customer/ServiceCard';

export function SpecialOffersSection({ discountedProducts, onAddToCart, t }) {
  const { i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';

  if (!discountedProducts || discountedProducts.length === 0) return null;

  return (
    <LazyAnimatedSection
      type="fade-up"
      placeholderHeight="400px"
      className="discounted-section px-4 bg-gradient-to-b from-secondary/5 to-background border-t border-border/40"
    >
      <section className="container mx-auto max-w-6xl">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            {t('Special Offers')}
          </h2>
          <p className="premium-section-sub">
            {t('Grab your favorites at discounted prices. Pure quality, sweet savings.')}
          </p>
        </div>

        <div className="relative px-4 sm:px-8 md:px-12">
          <Carousel
            key={isUrdu ? 'rtl' : 'ltr'}
            dir={isUrdu ? 'rtl' : 'ltr'}
            opts={{
              align: 'start',
              loop: true,
              direction: isUrdu ? 'rtl' : 'ltr',
            }}
            plugins={[
              Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true }),
            ]}
            className="w-full"
          >
            <CarouselContent
              className={`-ml-2 md:-ml-4 rtl:-mr-2 rtl:md:-mr-4 rtl:ml-0 rtl:md:ml-0 ${
                discountedProducts.length <= 1 ? 'justify-center' : ''
              } ${
                discountedProducts.length <= 2 ? 'sm:justify-center' : ''
              } ${
                discountedProducts.length <= 4 ? 'lg:justify-center' : ''
              }`}
            >
              {discountedProducts.map((product) => (
                <CarouselItem
                  key={product.id}
                  className="basis-full sm:basis-1/2 lg:basis-1/4 pl-2 md:pl-4 rtl:pr-2 rtl:md:pr-4 rtl:pl-0 rtl:md:pl-0"
                >
                  <div className="h-full py-2">
                    <ServiceCard
                      service={product}
                      onAddToCart={() => onAddToCart(product)}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious
              className={`-left-2 sm:-left-4 md:-left-6 rtl:-right-2 rtl:sm:-right-4 rtl:md:-right-6 rtl:left-auto ${
                discountedProducts.length > 1 ? 'flex' : 'hidden'
              } ${
                discountedProducts.length > 2 ? 'sm:flex' : 'sm:hidden'
              } ${
                discountedProducts.length > 4 ? 'lg:flex' : 'lg:hidden'
              }`}
            />
            <CarouselNext
              className={`-right-2 sm:-right-4 md:-right-6 rtl:-left-2 rtl:sm:-left-4 rtl:md:-left-6 rtl:right-auto ${
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
  );
}

export default SpecialOffersSection;
