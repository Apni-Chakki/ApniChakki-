import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const animationVariants = {
  'fade-up': {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 }
  },
  'fade-in': {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  },
  'slide-left': {
    hidden: { opacity: 0, x: -70 },
    visible: { opacity: 1, x: 0 }
  },
  'slide-right': {
    hidden: { opacity: 0, x: 70 },
    visible: { opacity: 1, x: 0 }
  },
  'scale-up': {
    hidden: { opacity: 0, scale: 0.94 },
    visible: { opacity: 1, scale: 1 }
  },
  'stagger-container': {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05
      }
    }
  }
};

export function LazyAnimatedSection({
  children,
  type = 'fade-up',
  delay = 0,
  duration = 0.5,
  margin = '200px 0px',
  className = '',
  id,
  placeholderHeight
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin });

  return (
    <div
      ref={ref}
      id={id}
      className={`${className} transition-all duration-500 ease-out ${
        isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {children}
    </div>
  );
}
