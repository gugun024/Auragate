import { NextRequest, NextResponse } from 'next/server';
import { executeChatCompletions } from '@/lib/routerEngine';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    // Multi-Client Access Key Validation (Gateway Tokens)
    const clientKeyCount = await db.clientKey.count();
    const masterEnvKey = process.env.MASTER_API_KEY;

    if (clientKeyCount > 0 || (masterEnvKey && masterEnvKey.trim().length > 0)) {
      const authHeader = req.headers.get('authorization') || '';
      const clientToken = authHeader.replace(/^Bearer\s+/i, '').trim() || req.headers.get('x-api-key') || '';
      
      let isValid = false;

      // Check against env MASTER_API_KEY
      if (masterEnvKey && masterEnvKey.trim().length > 0 && clientToken === masterEnvKey.trim()) {
        isValid = true;
      } 
      // Check against DB Client Keys
      else if (clientToken) {
        const foundKey = await db.clientKey.findFirst({
          where: { token: clientToken, status: 'ACTIVE' },
        });

        if (foundKey) {
          isValid = true;
          // Increment request counter for this client token
          await db.clientKey.update({
            where: { id: foundKey.id },
            data: { totalRequests: { increment: 1 }, lastUsedAt: new Date() },
          });
        }
      }

      if (!isValid) {
        return NextResponse.json(
          {
            error: {
              message: 'Client Access Key (Gateway Token) tidak valid atau telah dinonaktifkan. Akses ditolak.',
              type: 'authentication_error',
              code: 'invalid_gateway_token',
            },
          },
          { status: 401 }
        );
      }
    }

    const body = await req.json();

    // Execute key rotation & failover engine
    const { response, keyUsed, retryCount } = await executeChatCompletions({ body });

    // Extract headers to pass back
    const responseHeaders = new Headers();
    
    // Copy content-type (e.g., text/event-stream or application/json)
    const contentType = response.headers.get('content-type');
    if (contentType) responseHeaders.set('content-type', contentType);

    // Custom tracking headers
    responseHeaders.set('x-key-used', keyUsed.name);
    responseHeaders.set('x-provider-used', keyUsed.provider);
    responseHeaders.set('x-retry-count', String(retryCount));
    responseHeaders.set('cache-control', 'no-cache');
    responseHeaders.set('connection', 'keep-alive');

    // Stream the raw response body progressively using Next.js Response Web Streams
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[API Route /v1/chat/completions Error]:', error);
    return NextResponse.json(
      {
        error: {
          message: error.message || 'Internal Server Error pada AI Router',
          type: 'router_error',
          param: null,
          code: 'router_failure',
        },
      },
      { status: 500 }
    );
  }
}

// OPTIONS preflight for CORS support
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    },
  });
}
