import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Check if the request is targeting the /proxy path
  if (pathname.startsWith("/proxy")) {
    const targetPath = pathname.replace("/proxy", ""); // Remove the `/proxy` prefix
    const targetUrl = `https://api.openai.com${targetPath}${search}`; // Construct the target URL

    try {
      // Forward the request to the target URL
      const proxyResponse = await fetch(targetUrl, {
        method: req.method,
        headers: {
          ...req.headers, // Forward all headers
          host: "api.openai.com", // Ensure the host header is correct
        },
        body: req.body ? req.body : undefined, // Forward the request body if it exists
      });

      // Create a new response based on the proxied response
      const proxyHeaders = new Headers(proxyResponse.headers);
      const proxyBody = await proxyResponse.arrayBuffer();

      return new NextResponse(proxyBody, {
        headers: proxyHeaders,
        status: proxyResponse.status,
      });
    } catch (error) {
      console.error("Proxy error:", error);
      return NextResponse.json(
        { error: "Failed to proxy the request." },
        { status: 500 }
      );
    }
  }

  // Allow the request to continue for non-proxy paths
  return NextResponse.next();
}
