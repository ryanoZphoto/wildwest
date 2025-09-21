'use strict';
const https = require('https');

// Netlify Function: Proxy Airtable requests securely using environment variables
// Env vars required in Netlify Site settings:
// - AIRTABLE_API_KEY
// - AIRTABLE_BASE_ID
// - AIRTABLE_PRODUCTS_TABLE (optional, defaults to 'Products')

function doFetch(url, options = {}) {
  if (typeof fetch === 'function') {
    return fetch(url, options);
  }
  // Minimal https fallback for local dev environments lacking global fetch
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const req = https.request({
        method: options.method || 'GET',
        hostname: u.hostname,
        path: u.pathname + (u.search || ''),
        headers: options.headers || {},
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: { get: (k) => res.headers[k.toLowerCase()] },
            text: async () => data,
            json: async () => JSON.parse(data || '{}'),
          });
        });
      });
      req.on('error', reject);
      if (options.body) req.write(options.body);
      req.end();
    } catch (e) { reject(e); }
  });
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  };

  try {
    if (event.httpMethod !== 'GET') {
      return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableParam = (event.queryStringParameters || {}).table;
    const table = tableParam || process.env.AIRTABLE_PRODUCTS_TABLE || 'Products';

    if (!apiKey || !baseId) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Airtable env vars not configured', details: { hasApiKey: !!apiKey, hasBaseId: !!baseId, table } }) };
    }

    const params = event.queryStringParameters || {};
    let recordId = params.id;
    // Support REST-style path: /.netlify/functions/products/{id}
    if (!recordId && event.path) {
      const m = event.path.match(/\/products\/(.+)$/);
      if (m && m[1]) recordId = decodeURIComponent(m[1]);
    }

    const baseUrl = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(table)}`;
    // Rebuild query string but omit our local-only "table" override param to avoid Airtable 404
    let qs = '';
    if (event.rawQueryString) {
      const searchParams = new URLSearchParams(event.rawQueryString);
      searchParams.delete('table');
      const s = searchParams.toString();
      qs = s ? `?${s}` : '';
    }
    const url = recordId
      ? `${baseUrl}/${encodeURIComponent(recordId)}`
      : `${baseUrl}${qs}`;

    const res = await doFetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });

    const text = await res.text();
    const isJson = res.headers.get('content-type') && String(res.headers.get('content-type')).includes('application/json');
    const body = isJson ? text : JSON.stringify({ passthrough: text });

    return { statusCode: res.status, headers, body };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Proxy error', details: String(err) }) };
  }
};


