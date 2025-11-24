export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Serve the UI
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(HTML_CONTENT, {
        headers: { 'Content-Type': 'text/html; charset=UTF-8' }
      });
    }

    // Proxy endpoint
    if (url.pathname === '/proxy') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        return new Response('URL parameter required', { status: 400 });
      }

      let target;
      try {
        target = new URL(targetUrl);
      } catch {
        return new Response('Invalid target URL', { status: 400 });
      }

      try {
        const response = await fetch(target.toString(), {
          method: request.method,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': request.headers.get('Accept') || '*/*'
          },
          body: ['GET', 'HEAD'].includes(request.method)
            ? undefined
            : request.body
        });

        const contentType = response.headers.get('content-type') || '';

        // === HTML REWRITE ===
        if (contentType.includes('text/html')) {
          let html = await response.text();

          // Base origin for absolute paths
          const base = target.origin;

          // 1. Rewrite absolute root paths: /something
          html = html.replace(
            /(href|src)=["']\/([^"']*)["']/g,
            (m, attr, path) =>
              `${attr}="/proxy?url=${encodeURIComponent(base + '/' + path)}"`
          );

          // 2. Rewrite absolute URLs
          html = html.replace(
            /(href|src)=["'](https?:\/\/[^"']+)["']/g,
            (m, attr, full) =>
              `${attr}="/proxy?url=${encodeURIComponent(full)}"`
          );

          // 3. Rewrite relative paths like ./ and ../
          html = html.replace(
            /(href|src)=["'](\.\/|\.\.\/|[^\/][^"']*)["']/g,
            (m, attr, relPath) => {
              const absolute = new URL(relPath, target).toString();
              return `${attr}="/proxy?url=${encodeURIComponent(absolute)}"`;
            }
          );

          return new Response(html, {
            headers: { 'Content-Type': 'text/html; charset=UTF-8' }
          });
        }

        // === BINARY / OTHER TYPES ===
        const newHeaders = new Headers(response.headers);
        return new Response(response.body, {
          status: response.status,
          headers: newHeaders
        });

      } catch (err) {
        return new Response("Proxy Error: " + err.message, { status: 500 });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
};

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Web Proxy</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: system-ui, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .header {
    background: rgba(255,255,255,0.95);
    padding: 20px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }
  .search-container {
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    gap: 10px;
  }
  input {
    flex: 1;
    padding: 12px 20px;
    border: 2px solid #ddd;
    border-radius: 25px;
    font-size: 16px;
  }
  button {
    padding: 12px 30px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 25px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
  }
  iframe {
    flex: 1;
    border: none;
    background: white;
  }
</style>
</head>
<body>
<div class="header">
  <div class="search-container">
    <input id="urlInput" placeholder="Enter URL" value="https://example.com">
    <button onclick="loadUrl()">Go</button>
  </div>
</div>

<iframe id="proxyFrame"></iframe>

<script>
function loadUrl() {
  const url = document.getElementById('urlInput').value.trim();
  try { new URL(url); }
  catch { return alert("Invalid URL"); }

  document.getElementById('proxyFrame').src =
    '/proxy?url=' + encodeURIComponent(url);
}

document.getElementById('urlInput')
  .addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loadUrl();
  });
</script>
</body>
</html>`;
