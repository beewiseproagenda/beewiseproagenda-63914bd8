import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import * as jose from 'https://deno.land/x/jose@v4.11.4/index.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VALIDATE-ONBOARDING-TOKEN] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { token } = await req.json();
    
    if (!token) {
      throw new Error("Token is required");
    }

    logStep("Validating onboarding token");

    const secret = new TextEncoder().encode(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
    
    try {
      const { payload } = await jose.jwtVerify(token, secret);
      
      if (payload.type !== 'onboarding') {
        throw new Error("Invalid token type");
      }

      logStep("Token validated successfully", { userId: payload.userId, email: payload.email });

      return new Response(JSON.stringify({ 
        valid: true, 
        userId: payload.userId, 
        email: payload.email 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (jwtError) {
      logStep("JWT validation failed", { error: jwtError.message });
      return new Response(JSON.stringify({ valid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in validate-onboarding-token", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});