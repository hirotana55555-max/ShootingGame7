/**
 * Browser Error Capture Snippet
 * [Manus Debugging Version]
 */

(function() {
  'use strict';
  console.log('[ManusDebug] Snippet execution started.'); // ★追加

  const COLLECTOR_URL = '/api/collect';
  const MAX_STACK_LENGTH = 5000;

  function send(payload) {
    console.log('[ManusDebug] send() function called with payload:', payload); // ★追加
    
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
    console.log(`[ManusDebug] captureError() called from ${source}.`); // ★追加
    send({
      message: message,
      stack: stack,
      browser: { ua: navigator.userAgent, url: window.location.href },
      timestamp: new Date().toISOString(),
      source: source
    });
  }
  
  // Global error handler
  console.log('[ManusDebug] Adding "error" event listener.'); // ★追加
  window.addEventListener('error', function(ev) {
    console.log('[ManusDebug] "error" event listener triggered!'); // ★追加
    const message = ev.message || 'Unknown error';
    const stack = ev.error ? ev.error.stack : null;
    captureError(message, stack, 'window.error');
  }, true);
  
  // Unhandled promise rejection
  console.log('[ManusDebug] Adding "unhandledrejection" event listener.'); // ★追加
  window.addEventListener('unhandledrejection', function(ev) {
    console.log('[ManusDebug] "unhandledrejection" event listener triggered!'); // ★追加
    const reason = ev.reason;
    const message = reason?.message || String(reason) || 'Unhandled Promise Rejection';
    const stack = reason?.stack || null;
    captureError(message, stack, 'unhandledrejection');
  });
  
  console.log('[ManusDebug] Snippet initialized and listeners attached.'); // ★変更
})();
