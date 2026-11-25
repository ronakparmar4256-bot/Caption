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