import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAuth, corsHeaders, handleCors, logSafely } from '../_shared/auth.ts';

serve(async (req) => {
  logSafely('API /me request received', { method: req.method });
  
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // SECURITY: Require authentication for all /me operations
    const authResult = await requireAuth(req);
    if (!authResult) {
      logSafely('Authentication failed for /me endpoint');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Valid authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Fetch only whitelisted fields for the authenticated user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, phone')
      .eq('user_id', authResult.userId)
      .maybeSingle();

    // Get user's current subscription (only status and plan)
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('status, plan_code')
      .eq('user_id', authResult.userId)
      .in('status', ['authorized', 'active', 'pending'])
      .maybeSingle();

    // SECURITY: Return only whitelisted fields
    const response = {
      id: authResult.userId,
      email: authResult.email,
      first_name: profile?.first_name || null,
      last_name: profile?.last_name || null,
      phone: profile?.phone || null,
      role: authResult.role,
      subscription: subscription ? {
        status: subscription.status,
        plan: subscription.plan_code
      } : null
    };

    logSafely('User profile retrieved successfully', { 
      has_profile: !!profile,
      has_subscription: !!subscription
    });

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logSafely('Error in /me endpoint', { 
      error_code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});