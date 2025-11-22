/**
 * Browser Error Capture Snippet
 * Production-ready minimal implementation
 */

(function() {
  'use strict';
  
  const COLLECTOR_URL = '/api/collect';
  const MAX_STACK_LENGTH = 5000; // Prevent huge payloads
  
  function send(payload) {
    // Truncate stack if too long
    if (payload.stack && payload.stack.length > MAX_STACK_LENGTH) {
      payload.stack = payload.stack.substring(0, MAX_STACK_LENGTH) + '\\n... [truncated]';
    }
    
    const body = JSON.stringify(payload);
    
    if (navigator.sendBeacon) {
      navigator.sendBeacon(COLLECTOR_URL, body);
    } else {
      fetch(COLLECTOR_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true
      }).catch(e => {
        console.error('[ErrorSnippet] Failed to send:', e);
      });
    }
  }
  
  function captureError(message, stack, source) {
    send({
      message: message,
      stack: stack,
      browser: {
        ua: navigator.userAgent,
        url: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      },
      timestamp: new Date().toISOString(),
      source: source
    });
  }
  
  // Global error handler
  window.addEventListener('error', function(ev) {
    const message = ev.message || 'Unknown error';
    const stack = ev.error ? ev.error.stack : null;
    
    captureError(message, stack, 'window.error');
  }, true);
  
  // Unhandled promise rejection
  window.addEventListener('unhandledrejection', function(ev) {
    const reason = ev.reason;
    const message = reason?.message || String(reason) || 'Unhandled Promise Rejection';
    const stack = reason?.stack || null;
    
    captureError(message, stack, 'unhandledrejection');
  });
  
  // Network errors (optional enhancement)
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    return originalFetch.apply(this, args).catch(err => {
      captureError(
        `Fetch failed: ${args[0]}`,
        err.stack,
        'fetch.error'
      );
      throw err; // Re-throw to maintain original behavior
    });
  };
  
  console.log('[ErrorSnippet] Initialized');
})();
