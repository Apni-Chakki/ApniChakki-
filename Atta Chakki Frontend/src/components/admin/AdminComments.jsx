import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { API_BASE_URL } from '../../config';
import { Loader2, Trash2, Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../lib/AuthContext';

export function AdminComments() {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async (searchTerm = '') => {
    setLoading(true);
    try {
      const url = `${API_BASE_URL}/admin_get_comments.php${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setComments(data.data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchComments(search);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/delete_comment.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, user_id: user.id, role: user.role })
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Comment deleted successfully');
        fetchComments(search);
      } else {
        toast.error(data.message || 'Error deleting comment');
      }
    } catch (err) {
      toast.error('Network error while deleting comment');
    }
  };

  if (loading && comments.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Manage Comments</h1>
        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
          <Input 
            placeholder="Search by user or comment..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:w-64"
          />
          <Button type="submit" variant="secondary">
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
        </form>
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-muted-foreground border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Rating</th>
                <th className="px-6 py-4 font-semibold">Comment</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {comments.map((comment) => (
                <tr key={comment.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {comment.user_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-yellow-100 text-yellow-800 font-bold">
                       {comment.rating} ★
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="line-clamp-2 max-w-md">{comment.comment_text}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                    {new Date(comment.timestamp).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDelete(comment.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              
              {comments.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                    No comments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}