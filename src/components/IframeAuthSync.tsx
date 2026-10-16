'use client';

import { useEffect } from 'react';

export default function IframeAuthSync() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Intercept window.fetch to attach token header for iframe compatibility
    const originalFetch = window.fetch;
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.startsWith('/api/') || url.includes('/api/')) {
        const token = localStorage.getItem('trackerz_token');
        if (token) {
          init = init || {};
          const headers = new Headers(init.headers || {});
          if (!headers.has('x-trackerz-session')) {
            headers.set('x-trackerz-session', token);
          }
          if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          init.headers = headers;
        }
      }

      return originalFetch.call(this, input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
