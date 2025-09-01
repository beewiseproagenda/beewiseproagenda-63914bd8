// Shared authentication middleware for Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuthResult {
  userId: string;
  email: string;
  role?: string;
  session?: any;
}

export const requireAuth = async (req: Request): Promise<AuthResult | null> => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    if (!token) {
      return null;
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }

    // Get user role if needed
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    return {
      userId: user.id,
      email: user.email || '',
      role: userRole?.role || 'user',
      session: { user }
    };
  } catch (error) {
    console.error('[requireAuth] Error:', error);
    return null;
  }
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://6d45dc04-588b-43e4-8e90-8f2206699257.sandbox.lovable.dev',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

export const handleCors = (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
};

export const logSafely = (step: string, data?: any) => {
  // Never log PII - only status codes, IDs, and safe metadata
  if (data) {
    const safeData = {
      ...data,
      // Remove sensitive fields
      email: data.email ? '[EMAIL_REDACTED]' : undefined,
      user_id: data.user_id ? '[USER_ID]' : undefined,
      access_token: data.access_token ? '[TOKEN_REDACTED]' : undefined,
      // Keep safe fields
      status: data.status,
      external_reference: data.external_reference,
      plan_code: data.plan_code,
      error_code: data.error_code,
    };
    console.log(`[${step}]`, JSON.stringify(safeData, null, 2));
  } else {
    console.log(`[${step}]`);
  }
};
