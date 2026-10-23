"use client";
export default function Error({ reset }: { reset: () => void }) {
  return <main className="error-page"><span className="brand">KN1GHTS / MANAGEMENT</span><h1>Unable to load the workspace.</h1><p>Check the Firebase connection and try again. Your published content has not been changed.</p><button onClick={reset}>Try again</button><a href="/login">Return to sign in</a></main>;
}
