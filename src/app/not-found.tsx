'use client';

import { useRouter } from 'next/navigation';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#fafafa' }}
    >
      {/* 404 Text with Shadow Effect */}
      <div className="relative select-none mb-8">
        {/* Shadow layer */}
        <span
          className="absolute inset-0"
          style={{
            fontSize: 'clamp(120px, 20vw, 200px)',
            fontWeight: 800,
            lineHeight: 1,
            background: 'linear-gradient(135deg, #1e293b, #64748b)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            opacity: 0.1,
            transform: 'translate(4px, 4px)',
          }}
          aria-hidden="true"
        >
          404
        </span>
        {/* Main text */}
        <span
          className="relative"
          style={{
            fontSize: 'clamp(120px, 20vw, 200px)',
            fontWeight: 800,
            lineHeight: 1,
            color: '#f1f5f9',
          }}
        >
          404
        </span>
      </div>

      {/* Gradient Divider */}
      <div
        className="rounded-full mb-8"
        style={{
          width: '60px',
          height: '4px',
          background: 'linear-gradient(90deg, #10b981, #3b82f6)',
        }}
      />

      {/* Title */}
      <h1
        className="mb-4 text-center"
        style={{
          fontSize: '24px',
          fontWeight: 600,
          color: '#1e293b',
        }}
      >
        Page Not Found
      </h1>

      {/* Description */}
      <p
        className="text-center max-w-md mb-10"
        style={{
          fontSize: '15px',
          color: '#64748b',
          lineHeight: 1.7,
        }}
      >
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Let&apos;s get you back on track.
      </p>

      {/* Buttons */}
      <div className="flex flex-wrap gap-4 justify-center">
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          style={{
            minWidth: '140px',
            backgroundColor: '#1e293b',
            color: '#ffffff',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#334155';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1e293b';
          }}
        >
          <Home size={18} />
          Go to Home
        </button>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
          style={{
            minWidth: '140px',
            backgroundColor: '#ffffff',
            color: '#1e293b',
            border: '1px solid #e2e8f0',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f8fafc';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <ArrowLeft size={18} />
          Go Back
        </button>
      </div>
    </div>
  );
}
