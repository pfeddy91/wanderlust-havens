export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Use '*' for initial dev, refine for production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  // Allow methods needed, including OPTIONS for preflight
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
} 