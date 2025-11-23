import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/node';
import { parseStack } from '../_lib/parser';
import { getResolver } from '../_lib/resolver';
import { insertError } from '../_lib/db';

// Initialize Sentry if configured
if (process.env.ENABLE_GLITCHTIP === 'true' && process.env.GLITCHTIP_DSN) {
  Sentry.init({
    dsn: process.env.GLITCHTIP_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, stack, browser, timestamp } = body;
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
    const receivedAt = new Date().toISOString();
    const frames = parseStack(stack);
    const firstFrame = frames[0];
    
    let resolved = null;
    if (firstFrame) {
      try {
        const resolver = getResolver();
        resolved = resolver.resolve(firstFrame.file, firstFrame.line);
      } catch (err) {
        console.error('[API/collect] Resolver error:', err);
      }
    }
    
    const errorId = insertError({
      received_at: receivedAt,
      message,
      stack: stack || null,
      browser_info: JSON.stringify(browser || {}),
      resolved_path: resolved ? resolved.path : null,
      resolved_symbol: resolved ? resolved.symbol : null,
      deps_json: resolved ? JSON.stringify(resolved.deps) : null,
      metadata_json: JSON.stringify({ 
        frames, 
        confidence: resolved?.confidence 
      }),
      is_stale: 0
    });
    
    console.log(
      `[API/collect] Error #${errorId} collected:`,
      message,
      resolved ? `(resolved to ${resolved.path})` : '(unresolved)'
    );
    
    if (process.env.ENABLE_GLITCHTIP === 'true' && process.env.GLITCHTIP_DSN) {
      try {
        const errorObj = new Error(message);
        if (stack) errorObj.stack = stack;
        
        Sentry.captureException(errorObj, {
          extra: { browser, resolved, frames, errorId },
          tags: {
            resolved_file: resolved?.path || 'unknown',
            confidence: resolved?.confidence?.toString() || '0'
          }
        });
      } catch (sentryErr) {
        console.error('[API/collect] Sentry forwarding error:', sentryErr);
      }
    }
    
    return NextResponse.json(
      { 
        id: errorId,
        resolved: !!resolved,
        confidence: resolved?.confidence || 0
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('[API/collect] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'POST to this endpoint to collect errors' },
    { status: 200 }
  );
}
