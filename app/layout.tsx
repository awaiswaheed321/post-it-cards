import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Post-It Cards',
  description: 'Little notes, just for the two of us.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="blob-field" aria-hidden>
          <span className="blob animate-float" style={{ width: 280, height: 280, top: '-6%', left: '2%', background: '#F5B45C' }} />
          <span className="blob animate-float" style={{ width: 240, height: 240, top: '10%', right: '-6%', background: '#E86A98', animationDelay: '-6s' }} />
          <span className="blob animate-float" style={{ width: 220, height: 220, bottom: '-6%', left: '8%', background: '#FF9166', animationDelay: '-10s' }} />
          <span className="blob animate-float" style={{ width: 260, height: 260, bottom: '4%', right: '4%', background: '#9B8CFF', animationDelay: '-3s' }} />
        </div>
        {children}
      </body>
    </html>
  );
}
