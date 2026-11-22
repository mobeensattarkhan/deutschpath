'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '1.5rem',
          color: '#1b2a4a',
          background: '#faf8f3',
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ color: '#596579', marginTop: 8 }}>
            The application failed to load. If it was just deployed, check that the Supabase
            environment variables are configured, then redeploy.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              height: 44,
              padding: '0 20px',
              borderRadius: 10,
              border: 0,
              background: '#2f5fa8',
              color: '#fff',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
