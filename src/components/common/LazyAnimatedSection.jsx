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
  duration = 0.7,
  margin = '250px 0px',
  className = '',
  id,
  placeholderHeight = '180px'
}) {
  const ref = useRef(null);
  // once: true ensures that the section stays loaded once visited
  const isInView = useInView(ref, { once: true, margin });

  const selectedVariants = animationVariants[type] || animationVariants['fade-up'];

  return (
    <div
      ref={ref}
      id={id}
      className={className}
      style={!isInView ? { minHeight: placeholderHeight } : {}}
    >
      {isInView ? (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={selectedVariants}
          transition={{
            duration,
            delay,
            ease: [0.16, 1, 0.3, 1] // Custom snappy cubic bezier curve
          }}
        >
          {children}
        </motion.div>
      ) : (
        // A clean, soft loader/placeholder while waiting for intersection
        <div className="w-full h-full flex items-center justify-center opacity-0 transition-opacity duration-300 pointer-events-none" style={{ minHeight: placeholderHeight }}>
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
