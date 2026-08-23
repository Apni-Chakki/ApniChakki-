import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/common/card';
import { Input } from '../../components/common/input';
import { Button } from '../../components/common/button';
import { API_BASE_URL } from '../../config';
import { Loader2, Trash2, Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../store/AuthContext';
import { Pagination } from '../../components/common/Pagination';

export function AdminComments() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [appliedSearch, pageSize]);

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, appliedSearch]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (appliedSearch) params.set('search', appliedSearch);
      const response = await fetch(`${API_BASE_URL}/admin_get_comments.php?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setComments(data.data);
        setTotalItems(data.total || 0);
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
    setAppliedSearch(search);
  };

  const handleDelete = async (id) => {
    const deleteComment = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/delete_comment.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, user_id: user.id, role: user.role })
        });
        const data = await response.json();

        if (data.success) {
          toast.success('Comment deleted successfully');
          fetchComments();
        } else {
          toast.error(data.message || 'Error deleting comment');
        }
      } catch (err) {
        toast.error('Network error while deleting comment');
      }
    };

    toast.custom((t) => (
      <div className="bg-primary border border-primary-foreground/20 rounded-lg p-4 shadow-xl flex flex-col gap-3 max-w-sm">
        <p className="text-primary-foreground font-medium">Are you sure you want to delete this comment?</p>
        <div className="flex gap-2 justify-end">
          <Button
            onClick={() => toast.dismiss(t)}
            variant="outline"
            size="sm"
            className="bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 border-transparent"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              toast.dismiss(t);
              deleteComment();
            }}
            size="sm"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent"
          >
            Delete
          </Button>
        </div>
      </div>
    ));
  };

  if (loading && comments.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">{t("Manage Comments")}</h1>
        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
          <Input
            placeholder="Search by user or comment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 md:w-64"
          />
          <Button type="submit" variant="secondary" className="shrink-0">
            <Search className="w-4 h-4 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline">Search</span>
          </Button>
        </form>
      </div>

      {/* Mobile: card list (below md) */}
      <div className="md:hidden space-y-3">
        {totalItems === 0 ? (
          <Card className="p-6 sm:p-8 text-center text-sm text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
            No comments found
          </Card>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-border">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm break-words">{comment.user_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(comment.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 font-bold text-xs shrink-0">
                  {comment.rating} ★
                </span>
              </div>
              <p className="text-xs text-foreground break-words">{comment.comment_text}</p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(comment.id)}
                className="w-full mt-1"
              >
                <Trash2 className="w-4 h-4 mr-2 text-white shrink-0" />
                Delete
              </Button>
            </Card>
          ))
        )}
      </div>

      {/* Desktop: table (md and up) */}
      <div className="hidden md:block bg-card rounded-lg shadow-sm border border-border overflow-hidden">
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
                      className="px-4"
                    >
                      <Trash2 className="w-4 h-4 mr-2 text-white" />
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}

              {totalItems === 0 && (
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

      {totalItems > 0 && (
        <Pagination
          currentPage={page}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          className="mt-4"
        />
      )}
    </div>
  );
}
