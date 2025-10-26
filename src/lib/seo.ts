import { Metadata } from 'next';

interface SEOConfig {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

const defaultConfig = {
  title: 'Scribbl - Online Drawing & Guessing Game',
  description: 'Play Scribbl, a free multiplayer drawing and guessing game. Create rooms, draw with friends, and guess words in real-time!',
  image: '/og-image.png', // You need to create this
  url: 'https://scribbl.app', // Update with your domain
  type: 'website',
};

export function generateSEO(config: SEOConfig = {}): Metadata {
  const seo = { ...defaultConfig, ...config };

  return {
    title: seo.title,
    description: seo.description,
    keywords: [
      'drawing game',
      'multiplayer game',
      'guessing game',
      'online game',
      'skribbl',
      'pictionary',
      'free game',
      'browser game',
      'drawing and guessing',
    ],
    authors: [{ name: 'Your Name' }],
    creator: 'Your Name',
    openGraph: {
      type: seo.type as 'website' | 'article',
      title: seo.title,
      description: seo.description,
      url: seo.url,
      siteName: 'Scribbl',
      images: [
        {
          url: seo.image,
          width: 1200,
          height: 630,
          alt: seo.title,
        },
      ],
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
      images: [seo.image],
      creator: '@yourhandle', // Update with your Twitter
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    icons: {
      icon: '/favicon.ico',
      shortcut: '/favicon-16x16.png',
      apple: '/apple-touch-icon.png',
    },
    manifest: '/manifest.json',
    viewport: {
      width: 'device-width',
      initialScale: 1,
      maximumScale: 1,
      userScalable: false,
    },
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: '#ffffff' },
      { media: '(prefers-color-scheme: dark)', color: '#000000' },
    ],
  };
}

// Usage in pages:
// export const metadata = generateSEO({
//   title: 'Create Game | Scribbl',
//   description: 'Create a new drawing and guessing game room',
// });
