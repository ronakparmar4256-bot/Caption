

Browser me hi video process hoga, server load nahi padega aur fast captions milenge.

```typescript
// package.json
{
  "name": "ai-caption-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.0.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@ffmpeg/ffmpeg": "^0.11.6",
    "@ffmpeg/util": "^0.11.0",
    "@xenova/transformers": "^2.5.4",
    "tailwindcss": "^3.3.5"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.42",
    "@types/react-dom": "^18.2.17",
    "typescript": "^5.3.2",
    "postcss": "^8.4.31",
    "autoprefixer": "^10.4.16"
  }
}
```

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for FFmpeg WASM SharedArrayBuffer
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

```typescript
// app/layout.tsx
import './globals.css';

export const metadata = {
  title: 'AI Auto-Captioner',
  description: 'Browser-first AI Captioning',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
```

```typescript
// app/globals.css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #111827;
}

/* Caption Templates */
.caption-template-1 {
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  padding: 4px 8px;
  font-family: sans-serif;
  font-size: 1.2rem;
  color: #fff;
}

.caption-template-2 {
  background: linear-gradient(90deg, #ff00cc, #333399);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: monospace;
  font-size: 1rem;
  color: #000;
  font-weight: bold;
}

.caption-template-3 {
  border-bottom: 3px solid #00ffcc;
  background: transparent;
  font-family: serif;
  font-size: 1.5rem;
  color: #00ffcc;
  text-shadow: 2px 2px 4px #000;
}
```

```typescript
// app/page.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import { pipeline, env } from '@xenova/transformers';

// Disable local model loading to use CDN
env.allowLocalModels = false;

export default function Home() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [captions, setCaptions] = useState<{ start: number; end: number; text: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ffmpegRef = useRef<any>(null);

  // Load FFmpeg
  useEffect(() => {
    const loadFFmpeg = async () => {
      const ffmpeg = createFFmpeg({ log: true });
      await ffmpeg.load();
      ffmpegRef.current = ffmpeg;
      setProgress('FFmpeg Loaded');
    };
    loadFFmpeg();
  }, []);

  // Handle Video Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setCaptions([]); // Reset captions
    }
  };

  // Process Video: Extract Audio -> Transcribe
  const processVideo = async () => {
    if (!videoFile || !ffmpegRef.current) return;
    setIsProcessing(true);
    setProgress('Extracting Audio...');

    const ffmpeg = ffmpegRef.current;

    // 1. Copy video to memory
    ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(videoFile));

    // 2. Extract Audio to WAV (PCM)
    setProgress('Converting to WAV...');
    await ffmpeg.run('-i', 'input.mp4', '-vn', '-acodec', 'pcm_s16le', '-ar', '16000