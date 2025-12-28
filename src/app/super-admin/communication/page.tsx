'use client';

import { useState } from 'react';
import {
  MessageSquare,
  Mail,
  Bell,
  Send,
  Plus,
  Search,
  Filter,
  Users,
  Building2,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreHorizontal,
  X,
  FlaskConical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Placeholder data - in production this would come from the database
const messages = [
  {
    id: '1',
    type: 'announcement',
    title: 'Platform Maintenance Scheduled',
    content: 'We will be performing scheduled maintenance on January 15th from 2:00 AM to 4:00 AM UTC.',
    recipients: 'All Organizations',
    sentAt: '2 hours ago',
    status: 'delivered',
    opens: 245,
    clicks: 89,
  },
  {
    id: '2',
    type: 'email',
    title: 'New Feature: Asset QR Codes',
    content: 'We\'re excited to announce QR code support for asset tracking!',
    recipients: 'Professional & Enterprise',
    sentAt: '1 day ago',
    status: 'delivered',
    opens: 189,
    clicks: 67,
  },
  {
    id: '3',
    type: 'notification',
    title: 'Security Update Required',
    content: 'Please update your 2FA settings for enhanced security.',
    recipients: 'Super Admins',
    sentAt: '3 days ago',
    status: 'delivered',
    opens: 12,
    clicks: 8,
  },
];

const channels = [
  { id: 'all', label: 'All Messages', count: 156, icon: MessageSquare },
  { id: 'email', label: 'Emails', count: 89, icon: Mail },
  { id: 'notification', label: 'Notifications', count: 45, icon: Bell },
  { id: 'announcement', label: 'Announcements', count: 22, icon: Users },
];

export default function CommunicationPage() {
  const [activeChannel, setActiveChannel] = useState('all');
  const [showCompose, setShowCompose] = useState(false);

  return (
    <div className="space-y-6">
      {/* Demo Banner */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
          <FlaskConical className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <p className="font-medium text-violet-900 text-sm">Demo Module</p>
          <p className="text-violet-700 text-xs">All data on this page is simulated for demonstration purposes. Email/notification sending is not functional.</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Communication Center</h1>
          <p className="text-slate-500 text-sm">Manage platform-wide communications and announcements</p>
        </div>
        <Button onClick={() => setShowCompose(true)} className="bg-slate-900 hover:bg-slate-800">
          <Plus className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {channels.map((channel) => {
          const Icon = channel.icon;
          return (
            <button
              key={channel.id}
              onClick={() => setActiveChannel(channel.id)}
              className={cn(
                'p-4 rounded-xl border text-left transition-all',
                activeChannel === channel.id
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  activeChannel === channel.id ? 'bg-white/20' : 'bg-slate-100'
                )}>
                  <Icon className={cn(
                    'h-5 w-5',
                    activeChannel === channel.id ? 'text-white' : 'text-slate-500'
                  )} />
                </div>
              </div>
              <p className={cn(
                'text-sm',
                activeChannel === channel.id ? 'text-white/80' : 'text-slate-500'
              )}>{channel.label}</p>
              <p className="text-2xl font-bold mt-1">{channel.count}</p>
            </button>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search messages..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors">
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Recent Messages</h2>
        </div>

        <div className="divide-y divide-slate-100">
          {messages.map((message) => (
            <div key={message.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    message.type === 'email' && 'bg-blue-100',
                    message.type === 'notification' && 'bg-amber-100',
                    message.type === 'announcement' && 'bg-purple-100'
                  )}>
                    {message.type === 'email' && <Mail className="h-5 w-5 text-blue-600" />}
                    {message.type === 'notification' && <Bell className="h-5 w-5 text-amber-600" />}
                    {message.type === 'announcement' && <Users className="h-5 w-5 text-purple-600" />}
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">{message.title}</h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-1">{message.content}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {message.recipients}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {message.sentAt}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{message.opens} opens</span>
                      <span>{message.clicks} clicks</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 mt-1">
                      <CheckCircle className="h-3 w-3" />
                      Delivered
                    </span>
                  </div>
                  <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                    <MoreHorizontal className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing <span className="font-medium text-slate-700">3</span> of{' '}
            <span className="font-medium text-slate-700">156</span> messages
          </p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors disabled:opacity-50" disabled>
              Previous
            </button>
            <button className="px-3 py-1.5 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
              1
            </button>
            <button className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowCompose(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">New Message</h2>
              <button onClick={() => setShowCompose(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Message Type</label>
                <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
                  <option>Email</option>
                  <option>In-App Notification</option>
                  <option>Announcement</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Recipients</label>
                <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
                  <option>All Organizations</option>
                  <option>Free Tier Only</option>
                  <option>Starter & Above</option>
                  <option>Professional & Enterprise</option>
                  <option>Enterprise Only</option>
                  <option>Super Admins</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
                <input
                  type="text"
                  placeholder="Enter subject..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
                <textarea
                  rows={5}
                  placeholder="Write your message..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <button className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium">
                Save as Template
              </button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowCompose(false)}>Cancel</Button>
                <Button className="bg-slate-900 hover:bg-slate-800">
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
