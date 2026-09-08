// ============================================================
// MINIMAL TEST VERSION
// ============================================================

export default async function handler(req, res) {
  // Simple test response
  return new Response(JSON.stringify({ 
    status: 'ok', 
    message: 'API is working!',
    time: new Date().toISOString()
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
