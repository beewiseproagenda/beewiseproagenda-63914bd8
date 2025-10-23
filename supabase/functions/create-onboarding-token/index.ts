import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import * as jose from 'https://deno.land/x/jose@v4.11.4/index.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-ONBOARDING-TOKEN] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Require JWT authentication with admin role
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      logStep("Unauthorized - missing authorization header");
      return new Response(JSON.stringify({ error: 'Unauthorized - Missing authorization header' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      logStep("Unauthorized - invalid token", { error: authError?.message });
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid token' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Check if user has admin role
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      logStep("Forbidden - not admin", { userId: user.id, error: roleError?.message });
      return new Response(JSON.stringify({ error: 'Forbidden - Admin role required' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    logStep("Admin authenticated", { userId: user.id, email: user.email });

    const { userId, email } = await req.json();
    
    if (!userId || !email) {
      throw new Error("userId and email are required");
    }

    logStep("Creating onboarding token", { userId, email });

    // Create JWT token with 1 hour expiration
    const secret = new TextEncoder().encode(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
    
    const token = await new jose.SignJWT({
      userId,
      email,
      type: 'onboarding'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret);

    logStep("Onboarding token created successfully");

    return new Response(JSON.stringify({ token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-onboarding-token", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});