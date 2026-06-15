import { useState, useEffect } from 'react';
import { Card } from '../../components/common/card';
import { Button } from '../../components/common/button';
import { Textarea } from '../../components/common/textarea';
import { Label } from '../../components/common/label';
import { Badge } from '../../components/common/badge';
import { API_BASE_URL } from '../../config';
import { Loader2, Trash2, Mail, Phone, Calendar, User, MessageSquare, AlertCircle, RefreshCw, Send, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function ContactMessages() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/get_contact_messages.php`);
      const data = await response.json();
      if (data.success) {
        setMessages(data.data);
      } else {
        toast.error(data.message || 'Failed to load messages');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const deleteMessage = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/delete_contact_message.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        const data = await response.json();
        
        if (data.success) {
          toast.success('Message deleted successfully');
          setMessages(messages.filter(msg => msg.id !== id));
        } else {
          toast.error(data.message || 'Error deleting message');
        }
      } catch (err) {
        toast.error('Network error while deleting message');
      }
    };

    toast.custom((t) => (
      <div className="bg-primary border border-primary-foreground/20 rounded-lg p-4 shadow-xl flex flex-col gap-3 max-w-sm">
        <p className="text-primary-foreground font-medium">Are you sure you want to delete this message?</p>
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
              deleteMessage();
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

  const handleOpenReplyModal = (msg) => {
    setSelectedMessage(msg);
    setReplyText(msg.reply_message || '');
    setIsReplyModalOpen(true);
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) {
      toast.error('Please enter a reply message');
      return;
    }

    setSendingReply(true);
    try {
      const response = await fetch(`${API_BASE_URL}/reply_contact_message.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedMessage.id,
          reply_message: replyText
        })
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        setIsReplyModalOpen(false);
        fetchMessages(); // Refresh list to show updated status
      } else {
        toast.error(data.message || 'Failed to send reply');
      }
    } catch (err) {
      toast.error('Network error while sending reply');
    } finally {
      setSendingReply(false);
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-8">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">{t('Contact Messages')}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {t('Manage inquiries and messages from your customers')}
          </p>
        </div>
        <Button onClick={fetchMessages} variant="outline" size="sm" className="w-full sm:w-auto">
          <RefreshCw className={`w-4 h-4 mr-2 shrink-0 ${loading ? 'animate-spin' : ''}`} />
          {t('Refresh')}
        </Button>
      </div>

      {messages.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 sm:p-12 text-center border-dashed">
          <div className="bg-muted p-3 sm:p-4 rounded-full mb-4">
            <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground" />
          </div>
          <h3 className="text-base sm:text-xl font-semibold mb-2">{t('No messages yet')}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto">
            {t("When customers contact you through the contact form, their messages will appear here.")}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {messages.map((msg) => (
            <Card key={msg.id} className={`overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow ${msg.status === 'replied' ? 'opacity-90' : ''}`}>
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="bg-primary/10 p-2 rounded-full text-primary shrink-0">
                      <User className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base sm:text-lg leading-none break-words">{msg.name}</h3>
                        {msg.status === 'replied' && (
                          <Badge variant="success" className="bg-green-100 text-green-700 hover:bg-green-100 border-none text-[10px] sm:text-xs shrink-0">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {t('Replied')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] sm:text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span className="break-words">{new Date(msg.created_at).toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0"
                    onClick={() => handleDelete(msg.id)}
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                </div>

                <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <a href={`mailto:${msg.email}`} className="text-primary hover:underline font-medium break-all">
                      {msg.email}
                    </a>
                  </div>
                  {msg.phone && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                      <a href={`tel:${msg.phone}`} className="hover:text-primary transition-colors break-all">
                        {msg.phone}
                      </a>
                    </div>
                  )}
                  <div className="flex items-start gap-2 text-xs sm:text-sm">
                    <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="font-semibold text-foreground break-words">
                      {msg.subject || t('Contact Inquiry')}
                    </span>
                  </div>
                </div>

                <div className="bg-muted/30 p-3 sm:p-4 rounded-lg border border-border/50 mb-3">
                  <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed italic text-foreground/80 break-words">
                    "{msg.message}"
                  </p>
                </div>

                {msg.reply_message && (
                  <div className="bg-primary/5 p-3 sm:p-4 rounded-lg border border-primary/10">
                    <p className="text-[10px] sm:text-xs font-bold text-primary uppercase mb-1">{t('Your Reply')}:</p>
                    <p className="text-xs sm:text-sm text-foreground/70 italic break-words">"{msg.reply_message}"</p>
                  </div>
                )}
              </div>

              <div className="bg-muted/20 px-3 sm:px-6 py-3 border-t border-border/50 flex flex-col sm:flex-row sm:justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    navigator.clipboard.writeText(msg.email);
                    toast.success(t('Email copied to clipboard'));
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2 shrink-0" />
                  {t('Copy Email')}
                </Button>
                <Button
                  size="sm"
                  variant={msg.status === 'replied' ? 'outline' : 'secondary'}
                  className="w-full sm:w-auto"
                  onClick={() => handleOpenReplyModal(msg)}
                >
                  <Send className="w-4 h-4 mr-2 shrink-0" />
                  {msg.status === 'replied' ? t('Update Reply') : t('Send Reply')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reply Modal */}
      {isReplyModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-base sm:text-xl font-bold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary shrink-0" />
                  {t('Reply to Message')}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setIsReplyModalOpen(false)} className="h-8 w-8 shrink-0">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="bg-muted p-3 sm:p-4 rounded-lg">
                  <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase mb-1">{t('Customer Message')}:</p>
                  <p className="text-xs sm:text-sm italic break-words">"{selectedMessage?.message}"</p>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="reply-text" className="text-sm">{t('Your Reply')}</Label>
                  <Textarea
                    id="reply-text"
                    placeholder={t('Type your response here...')}
                    rows={6}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="resize-none"
                  />
                  <p className="text-[11px] sm:text-xs text-muted-foreground break-words">
                    {t('This reply will be saved in the database and an email will be attempted to be sent to')} <span className="font-medium text-primary break-all">{selectedMessage?.email}</span>.
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-6 sm:mt-8">
                <Button
                  variant="outline"
                  onClick={() => setIsReplyModalOpen(false)}
                  className="w-full sm:flex-1"
                >
                  {t('Cancel')}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSendReply}
                  disabled={sendingReply}
                  className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-primary-foreground border-primary hover:border-primary"
                >
                  {sendingReply ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />
                  ) : (
                    <Send className="w-4 h-4 mr-2 shrink-0" />
                  )}
                  {t('Send Reply')}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
