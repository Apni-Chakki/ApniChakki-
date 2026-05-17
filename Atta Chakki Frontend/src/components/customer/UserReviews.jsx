import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { RollingStarRating } from './RollingStarRating';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../config';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export function UserReviews() {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopReviews = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/get_comments.php?type=top`);
        const data = await response.json();
        if (data.success) {
          setReviews(data.data);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopReviews();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <motion.section 
      className="py-8 sm:py-12 md:py-16 px-4 bg-secondary"
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 md:mb-10 gap-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">{t('Top Rated Reviews')}</h2>
          <div className="flex flex-row items-center gap-4">
            <Button asChild variant="outline">
              <Link to="/reviews">{t('View All')}</Link>
            </Button>
            <Button asChild>
              <Link to="/reviews" state={{ openReviewForm: true }}>{t('Write a Review')}</Link>
            </Button>
          </div>
        </div>
        
        {reviews.length === 0 ? (
          <p className="text-center text-muted-foreground">{t('No top reviews yet.')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
            <AnimatePresence>
              {reviews.map((review) => (
                <Card key={review.id} className="p-6 flex flex-col gap-4 bg-card h-full justify-between shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div>
                    <RollingStarRating rating={review.rating} />
                    <p className="text-foreground italic mt-3 line-clamp-4">"{review.comment_text}"</p>
                  </div>
                  <div className="mt-4 border-t pt-4 border-border">
                    <p className="text-sm font-semibold text-foreground">{review.user_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(review.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </Card>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.section>
  );
}