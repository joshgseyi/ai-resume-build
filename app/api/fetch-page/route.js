export async function POST(request) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return Response.json({ error: 'No URL provided' }, { status: 400 });
    }

    // Fetch the page content server-side
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 15000, // 15 second timeout
    });

    if (!response.ok) {
      return Response.json({ 
        error: `Failed to fetch page: ${response.status} ${response.statusText}` 
      }, { status: response.status });
    }

    const html = await response.text();
    
    // Extract title from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'untitled';

    return Response.json({
      title: title,
      content: html,
      url: url
    });

  } catch (err) {
    console.error('Fetch page API error:', err);
    return Response.json({ 
      error: `Failed to fetch page: ${err.message}` 
    }, { status: 500 });
  }
} 