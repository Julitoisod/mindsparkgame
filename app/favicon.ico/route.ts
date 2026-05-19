export const dynamic = 'force-static'

export function GET() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#07111f"/>
      <path d="M17 38h30c3.5 0 6.5-3 6.5-6.5S50.5 25 47 25H17c-3.5 0-6.5 3-6.5 6.5S13.5 38 17 38Z" fill="#21d4fd"/>
      <path d="M20 28v7M16.5 31.5h7M43.5 31.5h.1M48.5 31.5h.1" stroke="#07111f" stroke-width="4" stroke-linecap="round"/>
      <path d="M30 24h4l2 4h-8l2-4Z" fill="#2af598"/>
    </svg>
  `.trim()

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
