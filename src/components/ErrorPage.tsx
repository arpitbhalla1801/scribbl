"use client";

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-black">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-6">😵</div>
        <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
          Oops! Something went wrong
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {error.message || 'An unexpected error occurred'}
        </p>
        
        <div className="space-y-3">
          <button
            onClick={reset}
            className="btn-primary w-full"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="btn-secondary w-full inline-block"
          >
            Go Home
          </Link>
        </div>

        {error.digest && (
          <p className="text-xs text-gray-500 dark:text-gray-600 mt-6">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
