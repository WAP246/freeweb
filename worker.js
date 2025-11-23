export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Serve the HTML page at root
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(HTML_CONTENT, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Proxy endpoint
    if (url.pathname === '/proxy') {
      const targetUrl = url.searchParams.get('url');
      
      if (!targetUrl) {
        return new Response('URL parameter required', { status: 400 });
      }
      
      try {
        const target = new URL(targetUrl);
        const response = await fetch(target.toString(), {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('text/html')) {
          let html = await response.text();
          
          // Rewrite URLs to go through proxy
          const baseUrl = target.origin;
          html = html.replace(
            /(href|src)="\\//g,
            `$1="/proxy?url=${encodeURIComponent(baseUrl)}/`
          );
          html = html.replace(
            /(href|src)="(https?:\\/\\/[^"]+)"/g,
            (match, attr, url) => `${attr}="/proxy?url=${encodeURIComponent(url)}"`
          );
          
          return new Response(html, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
        
        // Pass through other content
        return new Response(response.body, {
          headers: { 'Content-Type': contentType || 'application/octet-stream' }
        });
        
      } catch (error) {
        return new Response(`Error: ${error.message}`, { status: 500 });
      }
    }
    
    return new Response('Not Found', { status: 404 });
  }
};

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Web Proxy</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
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
      outline: none;
    }
    input:focus { border-color: #667eea; }
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
    button:hover { background: #5568d3; }
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
      <input 
        type="text" 
        id="urlInput" 
        placeholder="Enter URL (e.g., https://example.com)"
        value="https://example.com"
      />
      <button onclick="loadUrl()">Go</button>
    </div>
  </div>
  <iframe id="proxyFrame"></iframe>

  <script>
    function loadUrl() {
      const url = document.getElementById('urlInput').value;
      if (!url) return alert('Please enter a URL');
      
      try {
        new URL(url);
      } catch {
        return alert('Invalid URL format');
      }
      
      const proxyUrl = '/proxy?url=' + encodeURIComponent(url);
      document.getElementById('proxyFrame').src = proxyUrl;
    }
    
    document.getElementById('urlInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') loadUrl();
    });
  </script>
</body>
</html>`;
