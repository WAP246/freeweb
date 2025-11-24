// Basic proxy worker for fetching websites
async function handleRequest(request) {
    // Get the URL parameter from the query string
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
        return new Response('Please provide a "url" query parameter.', { status: 400 });
    }

    try {
        // Make an HTTP request to the target URL
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0',
                // You can add more headers here to mimic a real browser if needed
            }
        });

        // Get the response body (HTML) and return it as the response
        const body = await response.text();
        return new Response(body, {
            status: response.status,
            headers: response.headers,
        });

    } catch (error) {
        // If there's an error (e.g., invalid URL), return an error response
        return new Response('Error fetching content: ' + error.message, { status: 500 });
    }
}

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});
