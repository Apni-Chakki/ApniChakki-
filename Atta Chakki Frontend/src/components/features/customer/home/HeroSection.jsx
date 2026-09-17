import { useState, useEffect } from 'react';

export function HeroSection({ heroSlides, tDynamic }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!heroSlides || heroSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides]);

  const activeSlide = heroSlides[currentSlide] || heroSlides[0];

  return (
    <section className="relative overflow-hidden w-full bg-muted aspect-[16/9] sm:aspect-[21/9] min-h-[340px] max-h-[550px]">
      {activeSlide && (
        <img
          key={currentSlide}
          src={activeSlide.image}
          alt={activeSlide.title || "Suchi Chakki Hero"}
          fetchpriority={currentSlide === 0 ? "high" : "auto"}
          loading={currentSlide === 0 ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

      <div className="relative h-full container mx-auto px-4 sm:px-6 flex flex-col items-center justify-center text-center">
        <h1 className="text-white text-2xl sm:text-4xl md:text-5xl lg:text-6xl mb-3 sm:mb-4 px-4 font-bold tracking-tight">
          {activeSlide ? tDynamic(activeSlide.title) : ''}
        </h1>
        <p className="text-white/90 text-sm sm:text-lg md:text-xl max-w-2xl px-4">
          {activeSlide ? tDynamic(activeSlide.subtitle) : ''}
        </p>
      </div>
    </section>
  );
}

export default HeroSection;
