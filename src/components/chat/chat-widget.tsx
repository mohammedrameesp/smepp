'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, Send, Loader2, Sparkles, Trash2, RefreshCw, Copy, Check, History } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
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

const SUGGESTED_QUERIES = [
  "Who uses ChatGPT?",
  "Show pending leave requests",
  "How many employees do we have?",
  "List all active subscriptions",
];

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
      // Cmd/Ctrl+K to focus input
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && isOpen) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Cmd/Ctrl+Shift+N for new conversation
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'n' && isOpen) {
        e.preventDefault();
        startNewConversation();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);
    setError(null);
    setRateLimitInfo(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          ...(conversationId && { conversationId }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle rate limit specifically
        if (response.status === 429 && data.rateLimitInfo) {
          setRateLimitInfo(data.rateLimitInfo);
        }
        throw new Error(data.error || 'Failed to send message');
      }

      setConversationId(data.conversationId);

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(message);
  };

  const handleSuggestionClick = (query: string) => {
    sendMessage(query);
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    setRateLimitInfo(null);
  };

  const copyToClipboard = useCallback(async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      // Clipboard API not available
    }
  }, []);

  const retryLastMessage = () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      // Remove the last user message and any error state
      setMessages(prev => prev.filter(m => m.id !== lastUserMessage.id));
      setError(null);
      setRateLimitInfo(null);
      // Resend
      sendMessage(lastUserMessage.content);
    }
  };

  // Format relative time
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

  // Load conversation list
  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const response = await fetch('/api/chat');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch {
      // Silently fail - sidebar is optional
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Load a specific conversation
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

  // Delete a conversation
  const deleteConversation = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/chat?conversationId=${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (conversationId === id) {
          startNewConversation();
        }
      }
    } catch {
      // Silently fail
    }
  }, [conversationId]);

  // Load conversations when sidebar opens
  useEffect(() => {
    if (showSidebar) {
      loadConversations();
    }
  }, [showSidebar, loadConversations]);

  // Format date for conversation grouping
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

  // Group conversations by date
  const groupedConversations = conversations.reduce((groups, conv) => {
    const groupKey = formatConversationDate(conv.updatedAt);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(conv);
    return groups;
  }, {} as Record<string, Conversation[]>);

  return (
    <>
      {/* Chat Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50',
          'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
          'sm:bottom-6 sm:right-6',
          'max-sm:bottom-20 max-sm:right-4', // Above mobile nav
          isOpen && 'hidden'
        )}
        size="icon"
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          className={cn(
            'fixed bg-white flex flex-col z-50 overflow-hidden',
            // Mobile: full screen with safe areas
            'inset-0 sm:inset-auto',
            // Desktop: fixed size in corner
            'sm:bottom-6 sm:right-6 sm:w-[400px] sm:h-[600px] sm:rounded-2xl sm:shadow-2xl sm:border sm:border-gray-200',
            // Animation
            'animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-2 duration-200'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white safe-area-inset-top">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <span className="font-semibold">AI Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(!showSidebar)}
                className={cn(
                  "h-8 w-8 text-white hover:bg-white/20",
                  showSidebar && "bg-white/20"
                )}
                title="Conversation history"
              >
                <History className="h-4 w-4" />
              </Button>
              {conversationId && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={startNewConversation}
                  className="h-8 w-8 text-white hover:bg-white/20"
                  title="New conversation (Cmd+Shift+N)"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-white hover:bg-white/20"
                title="Close (Esc)"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Main content area with sidebar */}
          <div className="flex-1 flex overflow-hidden">
            {/* Conversation Sidebar */}
            {showSidebar && (
              <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col overflow-hidden animate-in slide-in-from-left-2 duration-200">
                <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">History</span>
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
                <ScrollArea className="flex-1">
                  {loadingConversations ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="text-center py-8 px-4">
                      <p className="text-sm text-gray-500">No conversations yet</p>
                    </div>
                  ) : (
                    <div className="p-2">
                      {Object.entries(groupedConversations).map(([dateGroup, convs]) => (
                        <div key={dateGroup} className="mb-3">
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-2 mb-1">
                            {dateGroup}
                          </p>
                          {convs.map((conv) => (
                            <button
                              key={conv.id}
                              onClick={() => loadConversation(conv.id)}
                              className={cn(
                                "w-full text-left px-2 py-2 rounded-lg text-sm group flex items-center justify-between",
                                "hover:bg-gray-100 transition-colors",
                                conversationId === conv.id && "bg-blue-50 text-blue-700"
                              )}
                            >
                              <span className="truncate flex-1 pr-2">
                                {conv.title || 'Untitled conversation'}
                              </span>
                              <button
                                onClick={(e) => deleteConversation(conv.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
                                title="Delete conversation"
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
            <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Ask me anything</h3>
                  <p className="text-sm text-gray-500">
                    I can help you query employee data, subscriptions, assets, and more.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Try asking:
                  </p>
                  {SUGGESTED_QUERIES.map((query) => (
                    <button
                      key={query}
                      onClick={() => handleSuggestionClick(query)}
                      className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors active:scale-[0.98]"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex group',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div className="relative">
                      <div
                        className={cn(
                          'max-w-[85%] sm:max-w-[280px] rounded-2xl px-4 py-2',
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        )}
                      >
                        {msg.role === 'assistant' ? (
                          <div className="text-sm prose prose-sm prose-gray max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-1 prose-code:bg-gray-200 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-pre:text-xs">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                        <p className={cn(
                          'text-[10px] mt-1',
                          msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                        )}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                      {/* Copy button for assistant messages */}
                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className="absolute -right-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
                          title="Copy message"
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

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Error display */}
                {error && (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <div className={cn(
                      'px-4 py-2 rounded-lg text-sm',
                      rateLimitInfo ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'
                    )}>
                      {error}
                      {rateLimitInfo?.retryAfterSeconds && (
                        <span className="block mt-1 text-xs">
                          Try again in {rateLimitInfo.retryAfterSeconds} seconds
                        </span>
                      )}
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
            className="p-4 border-t border-gray-100 safe-area-inset-bottom bg-white"
          >
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask a question..."
                disabled={isLoading}
                className="flex-1 text-base" // text-base prevents iOS zoom
                autoComplete="off"
              />
              <Button
                type="submit"
                disabled={!message.trim() || isLoading}
                size="icon"
                className="bg-blue-600 hover:bg-blue-700 shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center hidden sm:block">
              Press Esc to close, Cmd+K to focus, Cmd+Shift+N for new chat
            </p>
          </form>
        </div>
      )}
    </>
  );
}
