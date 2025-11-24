export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Serve the main HTML page at root
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(HTML_CONTENT, {
        headers: { "content-type": "text/html" },
      });
    }

    // Proxy endpoint using Browser Rendering API
    if (url.pathname === "/browse") {
      const target = url.searchParams.get("url");
      if (!target) {
        return new Response("Missing ?url= parameter", { status: 400 });
      }

      try {
        const browser = await env.BROWSER.newContext();
        const page = await browser.newPage();

        // Load the target URL fully rendered
        await page.goto(target, { waitUntil: "domcontentloaded" });

        // Get the rendered HTML content
        let html = await page.content();

        await browser.close();

        // Rewrite all href and src URLs to route back through the proxy
        html = html.replace(
          /(href|src)="(.*?)"/g,
          (match, attr, value) => {
            try {
              const absoluteUrl = new URL(value, target).href;
              return `${attr}="/browse?url=${encodeURIComponent(absoluteUrl)}"`;
            } catch {
              return match;
            }
          }
        );

        return new Response(html, {
          headers: { "content-type": "text/html" },
        });
      } catch (e) {
        return new Response(`Error fetching target: ${e.message}`, { status: 500 });
      }
    }

    return new Response("Not found", { status: 404 });
  },
};

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Browser Rendering Proxy</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0; padding: 1rem; background: #f0f0f0;
    }
    input {
      width: 80%;
      padding: 0.5rem;
      font-size: 1rem;
      border-radius: 6px;
      border: 1px solid #ccc;
      margin-right: 0.5rem;
    }
    button {
      padding: 0.5rem 1rem;
      font-size: 1rem;
      border-radius: 6px;
      border: none;
      background-color: #667eea;
      color: white;
      cursor: pointer;
    }
    iframe {
      margin-top: 1rem;
      width: 100%;
      height: 90vh;
      border: none;
      background: white;
    }
  </style>
</head>
<body>
  <h1>Browser Rendering Proxy</h1>
  <input type="text" id="urlInput" placeholder="Enter URL (e.g. https://example.com)" />
  <button onclick="loadUrl()">Go</button>
  <iframe id="proxyFrame"></iframe>
  <script>
    function loadUrl() {
      const url = document.getElementById('urlInput').value;
      if (!url) {
        alert('Please enter a URL');
        return;
      }
      try {
        new URL(url);
      } catch {
        alert('Invalid URL');
        return;
      }
      document.getElementById('proxyFrame').src = '/browse?url=' + encodeURIComponent(url);
    }
    document.getElementById('urlInput').addEventListener('keypress', e => {
      if (e.key === 'Enter') loadUrl();
    });
  </script>
</body>
</html>`;
