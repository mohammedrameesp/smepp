'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  X,
  Send,
  Loader2,
  Sparkles,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  History,
  HelpCircle,
  Search,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/core/utils';

// Default brand color (slate)
const DEFAULT_BRAND_COLOR = '#0f172a';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  status?: 'sending' | 'sent' | 'error';
}

interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RateLimitInfo {
  reason: string;
  current: number;
  limit: number;
  resetAt?: string;
  retryAfterSeconds?: number;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const SUGGESTED_QUERIES = [
  { query: "Who uses ChatGPT?", icon: "users", description: "Find subscription users" },
  { query: "Show pending leave requests", icon: "calendar", description: "View leave approvals" },
  { query: "How many employees do we have?", icon: "hash", description: "Get headcount" },
  { query: "List all active subscriptions", icon: "list", description: "View all services" },
];

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [brandColor, setBrandColor] = useState(DEFAULT_BRAND_COLOR);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);

  // Fetch organization brand color
  useEffect(() => {
    fetch('/api/settings/branding')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.primaryColor) {
          setBrandColor(data.primaryColor);
        }
      })
      .catch(() => {
        // Keep default color on error
      });
  }, []);

  // Toast notification system
  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Rate limit countdown timer
  useEffect(() => {
    if (rateLimitInfo?.retryAfterSeconds) {
      setRateLimitCountdown(rateLimitInfo.retryAfterSeconds);
      const interval = setInterval(() => {
        setRateLimitCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            setRateLimitInfo(null);
            setError(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [rateLimitInfo]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        if (showHelp) {
          setShowHelp(false);
        } else if (deleteConfirmId) {
          setDeleteConfirmId(null);
        } else if (isOpen) {
          setIsOpen(false);
        }
      }
      // Cmd/Ctrl+K to focus input
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && isOpen) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Cmd/Ctrl+Shift+N for new conversation
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'N' && isOpen) {
        e.preventDefault();
        startNewConversation();
      }
      // Number keys for suggestions when empty
      if (messages.length === 0 && isOpen && !isLoading) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= SUGGESTED_QUERIES.length) {
          e.preventDefault();
          sendMessage(SUGGESTED_QUERIES[num - 1].query);
        }
      }
      // ? for help
      if (e.key === '?' && !e.shiftKey && isOpen && document.activeElement !== inputRef.current) {
        e.preventDefault();
        setShowHelp(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // sendMessage and startNewConversation are intentionally excluded from deps.
    // We want keyboard shortcuts to use the current function implementations
    // without recreating the event listener on every function update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, showHelp, deleteConfirmId, messages.length, isLoading]);

  // Mobile swipe to close
  useEffect(() => {
    if (!isOpen || !chatPanelRef.current) return;

    let startY = 0;
    let currentY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      currentY = e.touches[0].clientY;
    };

    const handleTouchEnd = () => {
      const diff = currentY - startY;
      // Swipe down more than 100px to close
      if (diff > 100) {
        setIsOpen(false);
      }
    };

    const panel = chatPanelRef.current;
    panel.addEventListener('touchstart', handleTouchStart);
    panel.addEventListener('touchmove', handleTouchMove);
    panel.addEventListener('touchend', handleTouchEnd);

    return () => {
      panel.removeEventListener('touchstart', handleTouchStart);
      panel.removeEventListener('touchmove', handleTouchMove);
      panel.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingContent('');
    setError(null);
    setRateLimitInfo(null);

    // Mark user message as sent
    setTimeout(() => {
      setMessages(prev =>
        prev.map(m => m.id === userMessage.id ? { ...m, status: 'sent' } : m)
      );
    }, 300);

    try {
      // Use streaming endpoint
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          ...(conversationId && { conversationId }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429 && errorData.rateLimitInfo) {
          setRateLimitInfo(errorData.rateLimitInfo);
        }
        throw new Error(errorData.error || 'Failed to send message');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'chunk' && data.content) {
                  fullContent += data.content;
                  setStreamingContent(fullContent);
                } else if (data.type === 'done') {
                  setConversationId(data.conversationId);
                } else if (data.type === 'error') {
                  throw new Error(data.content);
                }
              } catch {
                // Skip invalid JSON lines
              }
            }
          }
        }
      }

      // Add completed assistant message
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: fullContent || 'I was unable to process that request.',
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setStreamingContent('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMessage);
      // Mark user message as error
      setMessages(prev =>
        prev.map(m => m.id === userMessage.id ? { ...m, status: 'error' } : m)
      );
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(message);
  };

  const handleSuggestionClick = (query: string) => {
    sendMessage(query);
  };

  const startNewConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    setRateLimitInfo(null);
    setStreamingContent('');
    showToast('Started new conversation', 'success');
  }, [showToast]);

  const copyToClipboard = useCallback(async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      showToast('Copied to clipboard', 'success');
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedMessageId(messageId);
      showToast('Copied to clipboard', 'success');
      setTimeout(() => setCopiedMessageId(null), 2000);
    }
  }, [showToast]);

  const retryLastMessage = () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      setMessages(prev => prev.filter(m => m.id !== lastUserMessage.id));
      setError(null);
      setRateLimitInfo(null);
      sendMessage(lastUserMessage.content);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const formatFullTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const response = await fetch('/api/chat');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setIsLoading(true);
    setShowSidebar(false);
    try {
      const response = await fetch(`/api/chat?conversationId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setConversationId(id);
        setMessages(
          data.messages?.map((msg: { id: string; role: string; content: string; createdAt: string }) => ({
            id: msg.id,
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            createdAt: msg.createdAt,
            status: 'sent' as const,
          })) || []
        );
        setError(null);
        setRateLimitInfo(null);
      }
    } catch {
      setError('Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const confirmDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const deleteConversation = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/chat?conversationId=${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (conversationId === id) {
          startNewConversation();
        }
        showToast('Conversation deleted', 'success');
      }
    } catch {
      showToast('Failed to delete conversation', 'error');
    } finally {
      setDeleteConfirmId(null);
    }
  }, [conversationId, showToast, startNewConversation]);

  useEffect(() => {
    if (showSidebar) {
      loadConversations();
    }
  }, [showSidebar, loadConversations]);

  const formatConversationDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return 'This week';
    if (diffDays < 30) return 'This month';
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Filter conversations by search
  const filteredConversations = searchQuery
    ? conversations.filter(c =>
        c.title?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  const groupedConversations = filteredConversations.reduce((groups, conv) => {
    const groupKey = formatConversationDate(conv.updatedAt);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(conv);
    return groups;
  }, {} as Record<string, Conversation[]>);

  return (
    <>
      {/* Toast Notifications */}
      <div
        className="fixed top-4 right-4 z-[60] flex flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={cn(
              'px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-right-5 duration-200',
              toast.type === 'success' && 'bg-green-600 text-white',
              toast.type === 'error' && 'bg-red-600 text-white',
              toast.type === 'info' && 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Chat Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50',
          'sm:bottom-6 sm:right-6',
          'max-sm:bottom-20 max-sm:right-4',
          'hover:opacity-90 transition-opacity',
          isOpen && 'hidden'
        )}
        style={{ backgroundColor: brandColor }}
        size="icon"
        aria-label="Open AI Assistant chat"
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          ref={chatPanelRef}
          role="dialog"
          aria-label="AI Assistant chat"
          aria-modal="true"
          className={cn(
            'fixed flex flex-col z-50 overflow-hidden',
            'bg-white dark:bg-slate-900',
            'inset-0 sm:inset-auto',
            'sm:bottom-6 sm:right-6 sm:w-[400px] sm:h-[600px] sm:rounded-2xl sm:shadow-2xl',
            'sm:border sm:border-gray-200 dark:sm:border-slate-700',
            'animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-2 duration-200'
          )}
        >
          {/* Mobile swipe indicator */}
          <div className="sm:hidden flex justify-center pt-2">
            <div className="w-10 h-1 bg-gray-300 dark:bg-slate-600 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 text-white safe-area-inset-top" style={{ backgroundColor: brandColor }}>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <span className="font-semibold">AI Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHelp(true)}
                className="h-8 w-8 text-white hover:bg-white/20"
                aria-label="Show keyboard shortcuts"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(!showSidebar)}
                className={cn(
                  "h-8 w-8 text-white hover:bg-white/20",
                  showSidebar && "bg-white/20"
                )}
                aria-label="Toggle conversation history"
                aria-expanded={showSidebar}
              >
                <History className="h-4 w-4" />
              </Button>
              {conversationId && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={startNewConversation}
                  className="h-8 w-8 text-white hover:bg-white/20"
                  aria-label="Start new conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-white hover:bg-white/20"
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Help Modal */}
          {showHelp && (
            <div
              className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center p-4"
              onClick={() => setShowHelp(false)}
            >
              <div
                className="bg-white dark:bg-slate-800 rounded-xl p-4 max-w-xs w-full shadow-xl"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Keyboard Shortcuts</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex justify-between">
                    <span>Close chat</span>
                    <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-xs">Esc</kbd>
                  </li>
                  <li className="flex justify-between">
                    <span>Focus input</span>
                    <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-xs">Cmd+K</kbd>
                  </li>
                  <li className="flex justify-between">
                    <span>New conversation</span>
                    <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-xs">Cmd+Shift+N</kbd>
                  </li>
                  <li className="flex justify-between">
                    <span>Quick suggestions</span>
                    <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-xs">1-4</kbd>
                  </li>
                  <li className="flex justify-between">
                    <span>Show this help</span>
                    <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-xs">?</kbd>
                  </li>
                </ul>
                <Button
                  className="w-full mt-4"
                  size="sm"
                  onClick={() => setShowHelp(false)}
                >
                  Got it
                </Button>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirmId && (
            <div
              className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center p-4"
              onClick={() => setDeleteConfirmId(null)}
            >
              <div
                className="bg-white dark:bg-slate-800 rounded-xl p-4 max-w-xs w-full shadow-xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Delete conversation?</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">This cannot be undone.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    size="sm"
                    onClick={() => setDeleteConfirmId(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    size="sm"
                    onClick={() => deleteConversation(deleteConfirmId)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Main content area with sidebar */}
          <div className="flex-1 flex overflow-hidden">
            {/* Conversation Sidebar */}
            {showSidebar && (
              <div
                className="w-64 border-r border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-left-2 duration-200"
                role="navigation"
                aria-label="Conversation history"
              >
                <div className="p-3 border-b border-gray-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">History</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        startNewConversation();
                        setShowSidebar(false);
                      }}
                      className="h-7 text-xs"
                    >
                      + New
                    </Button>
                  </div>
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="h-8 pl-7 text-sm bg-white dark:bg-slate-700"
                    />
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  {loadingConversations ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="text-center py-8 px-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {searchQuery ? 'No matching conversations' : 'No conversations yet'}
                      </p>
                    </div>
                  ) : (
                    <div className="p-2">
                      {Object.entries(groupedConversations).map(([dateGroup, convs]) => (
                        <div key={dateGroup} className="mb-3">
                          <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide px-2 mb-1">
                            {dateGroup}
                          </p>
                          {convs.map(conv => (
                            <button
                              key={conv.id}
                              onClick={() => loadConversation(conv.id)}
                              className={cn(
                                "w-full text-left px-2 py-2 rounded-lg text-sm group flex items-center justify-between",
                                "hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors",
                                conversationId === conv.id && "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                              )}
                            >
                              <span className="truncate flex-1 pr-2 text-gray-700 dark:text-gray-200">
                                {conv.title || 'Untitled conversation'}
                              </span>
                              <button
                                onClick={e => confirmDeleteConversation(conv.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-opacity"
                                aria-label="Delete conversation"
                              >
                                <Trash2 className="h-3 w-3 text-gray-400 hover:text-red-500" />
                              </button>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" aria-live="polite" aria-atomic="false">
              {messages.length === 0 && !isStreaming ? (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Ask me anything</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      I can help you query employee data, subscriptions, assets, and more.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Try asking: <span className="normal-case font-normal">(Press 1-4 to select)</span>
                    </p>
                    {SUGGESTED_QUERIES.map((item, index) => (
                      <button
                        key={item.query}
                        onClick={() => handleSuggestionClick(item.query)}
                        className="w-full text-left px-3 py-2.5 text-sm bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors active:scale-[0.98] group border border-transparent hover:border-gray-200 dark:hover:border-slate-600"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-gray-200 dark:bg-slate-600 text-xs flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {index + 1}
                          </span>
                          <span className="text-gray-700 dark:text-gray-200">{item.query}</span>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 ml-7">{item.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex group',
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div className="relative max-w-[85%] sm:max-w-[280px]">
                        <div
                          className={cn(
                            'rounded-2xl px-4 py-2',
                            msg.role === 'user'
                              ? 'text-white'
                              : 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-gray-100'
                          )}
                          style={msg.role === 'user' ? { backgroundColor: brandColor } : undefined}
                        >
                          {msg.role === 'assistant' ? (
                            <div className="text-sm prose prose-sm prose-gray dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-1 prose-code:bg-gray-200 dark:prose-code:bg-slate-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-gray-800 dark:prose-pre:bg-slate-900 prose-pre:text-gray-100 prose-pre:text-xs">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          )}
                          <div className={cn(
                            'flex items-center gap-1 mt-1',
                            msg.role === 'user' ? 'justify-end' : 'justify-start'
                          )}>
                            <span
                              className={cn(
                                'text-[10px]',
                                msg.role === 'user' ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'
                              )}
                              title={formatFullTime(msg.createdAt)}
                            >
                              {formatTime(msg.createdAt)}
                            </span>
                            {msg.role === 'user' && msg.status === 'sent' && (
                              <Check className="h-3 w-3 text-white/70" />
                            )}
                            {msg.role === 'user' && msg.status === 'error' && (
                              <AlertCircle className="h-3 w-3 text-white/70" />
                            )}
                          </div>
                        </div>
                        {/* Copy button for assistant messages */}
                        {msg.role === 'assistant' && (
                          <button
                            onClick={() => copyToClipboard(msg.content, msg.id)}
                            className="absolute -right-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                            aria-label={copiedMessageId === msg.id ? "Copied to clipboard" : "Copy message"}
                          >
                            {copiedMessageId === msg.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Streaming response */}
                  {isStreaming && streamingContent && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] sm:max-w-[280px] bg-gray-100 dark:bg-slate-800 rounded-2xl px-4 py-2">
                        <div className="text-sm prose prose-sm prose-gray dark:prose-invert max-w-none prose-p:my-1">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Typing indicator */}
                  {isLoading && !streamingContent && (
                    <div className="flex justify-start" role="status" aria-label="AI Assistant is typing">
                      <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error display with rate limit countdown */}
                  {error && (
                    <div className="flex flex-col items-center gap-2 py-2" role="alert">
                      <div className={cn(
                        'px-4 py-3 rounded-lg text-sm max-w-full',
                        rateLimitInfo ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300'
                      )}>
                        <div className="flex items-start gap-2">
                          {rateLimitInfo ? (
                            <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                          ) : (
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                          )}
                          <div>
                            <p>{error}</p>
                            {rateLimitCountdown !== null && (
                              <div className="mt-2">
                                <div className="flex items-center gap-2 text-xs">
                                  <span>Try again in</span>
                                  <span className="font-mono font-semibold">{rateLimitCountdown}s</span>
                                </div>
                                {rateLimitInfo && (
                                  <p className="text-xs mt-1 opacity-75">
                                    Usage: {rateLimitInfo.current}/{rateLimitInfo.limit} requests
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {!rateLimitInfo && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={retryLastMessage}
                          className="text-xs"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Retry
                        </Button>
                      )}
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="p-4 border-t border-gray-100 dark:border-slate-700 safe-area-inset-bottom bg-white dark:bg-slate-900"
          >
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Ask a question..."
                disabled={isLoading}
                className="flex-1 text-base dark:bg-slate-800 dark:border-slate-600"
                autoComplete="off"
                aria-label="Type your message"
              />
              <Button
                type="submit"
                disabled={!message.trim() || isLoading}
                size="icon"
                className="shrink-0 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: brandColor }}
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-center hidden sm:block">
              Press ? for shortcuts
            </p>
          </form>
        </div>
      )}
    </>
  );
}
