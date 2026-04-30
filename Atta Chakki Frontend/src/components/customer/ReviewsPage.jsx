import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { RollingStarRating } from './RollingStarRating';
import { Button } from '../ui/button';
import { API_BASE_URL } from '../../config';
import { Loader2, ArrowLeft, Edit2, Trash2, Send } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function ReviewsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ average: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [myRating, setMyRating] = useState(5);
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If navigating from homepage "Write a Review" button
  useEffect(() => {
    if (location.state?.openReviewForm) {
      if (!user) {
        toast.info("Please log in to write a review");
      } else if (user.role !== 'admin') {
        setFormOpen(true);
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      }
      
      // Clear the state so it doesn't trigger again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, user]);

  useEffect(() => {
    fetchReviews(filterRating);
  }, [filterRating]);

  const fetchReviews = async (rating) => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/get_comments.php`;
      if (rating !== 'all') {
        url += `?rating=${rating}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setReviews(data.data);
        if (data.stats && rating === 'all') {
            setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrEdit = async () => {
    if (!myComment.trim()) {
      toast.error('Please write a comment');
      return;
    }
    
    setSubmitting(true);
    try {
      const endpoint = editId ? 'edit_comment.php' : 'add_comment.php';
      const method = editId ? 'PUT' : 'POST';

      const payload = {
        user_id: user.id,
        rating: myRating,
        comment_text: myComment
      };
      
      if (editId) payload.id = editId;

      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(editId ? 'Review updated!' : 'Review posted successfully!');
        setFormOpen(false);
        setEditId(null);
        setMyRating(5);
        setMyComment('');
        fetchReviews(filterRating); // Refresh
      } else {
        toast.error(data.message || 'Error saving review');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (review) => {
    setEditId(review.id);
    setMyRating(review.rating);
    setMyComment(review.comment_text);
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteReview = async (id) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/delete_comment.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, user_id: user.id })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Review deleted');
        fetchReviews(filterRating);
      } else {
        toast.error(data.message || 'Error deleting review');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12 max-w-6xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild style={{ marginLeft: '-0.5rem', marginBottom: '0.5rem' }}>
          <Link to="/"><ArrowLeft className="w-4 h-4 mr-1" /> {t('Back')}</Link>
        </Button>
        <h1 className="text-3xl font-bold text-foreground text-center">{t('Customer Reviews')}</h1>
        {user && user.role !== 'admin' && !formOpen && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.75rem' }}>
            <Button onClick={() => {
                setFormOpen(true);
                setEditId(null);
                setMyRating(5);
                setMyComment('');
            }}>
              {t('Write a Review')}
            </Button>
          </div>
        )}
      </div>

      <div className="bg-card shadow-sm border border-border p-6 rounded-xl mb-8 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">{t('Average Overview')}</h2>
          <div className="flex gap-4 items-center">
            <RollingStarRating rating={Math.round(stats.average || 0)} />
            <span className="font-bold text-lg">{stats.average || '0.0'} / 5</span>
            <span className="text-muted-foreground ml-2">({stats.total} total)</span>
          </div>
        </div>

        <div className="flex gap-1 flex-wrap p-1 bg-secondary rounded-lg self-end sm:self-auto">
          <Button
            variant={filterRating === 'all' ? 'default' : 'ghost'}
            onClick={() => setFilterRating('all')}
            className="text-xs h-8 px-2"
          >
            {t('All')}
          </Button>
          {[5, 4, 3, 2, 1].map(stars => (
            <Button
              key={stars}
              variant={filterRating === stars.toString() ? 'default' : 'ghost'}
              onClick={() => setFilterRating(stars.toString())}
              className="text-xs h-8 px-2"
            >
              {stars} ★
            </Button>
          ))}
        </div>
      </div>

      {formOpen && user && (
        <Card className="p-6 mb-8 border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-4 duration-500 shadow-md">
            <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-4">
               <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                   {editId ? t('Edit Your Review') : t('Create a Review')}
               </h3>
               <Button variant="ghost" className="h-8 hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => setFormOpen(false)}>Cancel</Button>
            </div>
            
            <div className="mb-6 bg-background rounded-lg p-4 border border-border shadow-sm">
                <label className="block mb-2 font-medium text-muted-foreground">{t('Rating')}</label>
                <div className="flex justify-center sm:justify-start">
                    <RollingStarRating interactive rating={myRating} onRatingChange={setMyRating} />
                </div>
            </div>

            <div className="mb-6">
                <label className="block mb-2 font-medium text-muted-foreground">{t('Share your experience')}</label>
                <textarea
                   className="w-full min-h-[120px] p-4 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-y shadow-sm"
                   value={myComment}
                   onChange={e => setMyComment(e.target.value)}
                   placeholder={t('What did you like about our products?')}
                />
            </div>

            <div className="flex justify-end mt-4">
                <Button onClick={handleAddOrEdit} disabled={submitting} size="lg" className="w-full sm:w-auto">
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editId ? t('Update Review') : t('Post Review')} <Send className="w-4 h-4 ml-2"/>
                </Button>
            </div>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center flex-col items-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">{t('Loading comments...')}</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-20 bg-secondary rounded-xl">
          <p className="text-xl text-muted-foreground">{t('No reviews found for this filter.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {reviews.map((review) => (
             <Card key={review.id} className="p-6 flex flex-col gap-4 bg-card h-full justify-between shadow-sm hover:shadow-md transition-all duration-300">
             <div>
               <RollingStarRating rating={review.rating} />
               <p className="text-foreground italic mt-4 text-base leading-relaxed whitespace-pre-wrap">"{review.comment_text}"</p>
             </div>
             <div>
               <div className="mt-6 border-t pt-4 border-border/50">
                 <p className="font-semibold text-foreground text-sm truncate">{review.user_name}</p>
                 <p className="text-sm text-muted-foreground mt-1">
                   {new Date(review.timestamp).toLocaleDateString(undefined, {
                     year: 'numeric',
                     month: 'long',
                     day: 'numeric'
                   })}
                 </p>
               </div>
               {user && String(user.id) === String(review.user_id) && (
                 <div className="flex gap-2 mt-4 pt-3 border-t border-border/30">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => startEdit(review)}>
                       <Edit2 className="w-4 h-4 mr-2" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteReview(review.id)}>
                       <Trash2 className="w-4 h-4" />
                    </Button>
                 </div>
               )}
             </div>
           </Card>
          ))}
        </div>
      )}
    </div>
  );
}
