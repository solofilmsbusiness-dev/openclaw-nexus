import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// In-memory cache to avoid burning through the 25 req/day limit
const cache: Record<string, { data: unknown; ts: number }> = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// All futures symbols that need =F suffix for Alpha Vantage
const FUTURES_SYMBOLS = new Set([
  "ES", "NQ", "YM", "RTY", "CL", "GC", "SI", "NG", "ZB", "6E",
  "MES", "MNQ", "ZC", "ZS", "ZW", "HG",
]);

const MAX_SYMBOLS = 20;
const SYMBOL_RE = /^[A-Z0-9]{1,6}$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const API_KEY = Deno.env.get('ALPHA_VANTAGE_API_KEY');
  if (!API_KEY) {
    return new Response(JSON.stringify({ error: 'ALPHA_VANTAGE_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { symbols } = await req.json();
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return new Response(JSON.stringify({ error: 'symbols array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (symbols.length > MAX_SYMBOLS) {
      return new Response(JSON.stringify({ error: `Too many symbols (max ${MAX_SYMBOLS})` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: Record<string, unknown> = {};
    const now = Date.now();

    for (const symbol of symbols) {
      const sym = String(symbol).toUpperCase();

      if (!SYMBOL_RE.test(sym)) {
        results[sym] = { error: 'Invalid symbol', symbol: sym };
        continue;
      }

      // Check cache
      if (cache[sym] && now - cache[sym].ts < CACHE_TTL_MS) {
        results[sym] = cache[sym].data;
        continue;
      }

      // All symbols are futures — append =F
      const querySym = FUTURES_SYMBOLS.has(sym) ? `${sym}=F` : sym;

      // Fetch GLOBAL_QUOTE for current price data
      const quoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(querySym)}&apikey=${encodeURIComponent(API_KEY)}`;
      const quoteRes = await fetch(quoteUrl);
      const quoteJson = await quoteRes.json();

      if (quoteJson['Note'] || quoteJson['Information']) {
        // Rate limited — return cached if available, else skip
        if (cache[sym]) {
          results[sym] = { ...cache[sym].data as Record<string, unknown>, rateLimited: true };
        } else {
          results[sym] = { rateLimited: true, symbol: sym };
        }
        continue;
      }

      const gq = quoteJson['Global Quote'];
      if (!gq || !gq['05. price']) {
        results[sym] = { error: 'No data', symbol: sym };
        continue;
      }

      const data = {
        symbol: sym,
        price: parseFloat(gq['05. price']),
        change: parseFloat(gq['09. change']),
        changePercent: parseFloat(gq['10. change percent']?.replace('%', '') || '0'),
        volume: parseInt(gq['06. volume'] || '0', 10),
        open: parseFloat(gq['02. open']),
        high: parseFloat(gq['03. high']),
        low: parseFloat(gq['04. low']),
        previousClose: parseFloat(gq['08. previous close']),
        latestTradingDay: gq['07. latest trading day'],
      };

      cache[sym] = { data, ts: now };
      results[sym] = data;
    }

    return new Response(JSON.stringify({ data: results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('market-data error:', msg);
    return new Response(JSON.stringify({ error: 'Request failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
