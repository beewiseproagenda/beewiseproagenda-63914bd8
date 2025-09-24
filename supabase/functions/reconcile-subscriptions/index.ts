import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
};

interface ReconcileResult {
  total_users: number;
  active_marked: number;
  inactive_marked: number;
  unchanged: number;
  errors: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Admin-only validation
    const adminToken = req.headers.get('x-admin-token');
    const expectedToken = Deno.env.get('ADMIN_SECRET_TOKEN');
    
    if (!adminToken || !expectedToken || adminToken !== expectedToken) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - admin token required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('[RECONCILE] Starting subscription reconciliation...');

    const result: ReconcileResult = {
      total_users: 0,
      active_marked: 0,
      inactive_marked: 0,
      unchanged: 0,
      errors: 0
    };

    // Get all profiles with user_id
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, subscription_active');

    if (profilesError) {
      console.error('[RECONCILE] Error fetching profiles:', profilesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profiles', details: profilesError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    result.total_users = profiles?.length || 0;
    console.log(`[RECONCILE] Found ${result.total_users} profiles`);

    // Process each profile
    for (const profile of profiles || []) {
      try {
        // Check for active subscriptions in multiple tables
        const [subscriptionsResult, subscribersResult, mpSubsResult] = await Promise.all([
          // New subscriptions table
          supabase
            .from('subscriptions')
            .select('status, cancelled_at, next_charge_at')
            .eq('user_id', profile.user_id)
            .order('created_at', { ascending: false })
            .limit(1),
          
          // Legacy subscribers table
          supabase
            .from('subscribers')
            .select('subscribed, subscription_end')
            .or(`user_id.eq.${profile.user_id}`)
            .order('updated_at', { ascending: false })
            .limit(1),
            
          // MP subscriptions table
          supabase
            .from('mp_subscriptions')
            .select('status')
            .eq('user_id', profile.user_id)
            .order('created_at', { ascending: false })
            .limit(1)
        ]);

        let hasActiveSubscription = false;

        // Check new subscriptions table
        if (subscriptionsResult.data?.length > 0) {
          const sub = subscriptionsResult.data[0];
          hasActiveSubscription = sub.status === 'active' && 
                                !sub.cancelled_at &&
                                (!sub.next_charge_at || new Date(sub.next_charge_at) > new Date());
        }

        // Check legacy subscribers table
        if (!hasActiveSubscription && subscribersResult.data?.length > 0) {
          const sub = subscribersResult.data[0];
          hasActiveSubscription = sub.subscribed &&
                                (!sub.subscription_end || new Date(sub.subscription_end) > new Date());
        }

        // Check MP subscriptions table for active statuses
        if (!hasActiveSubscription && mpSubsResult.data?.length > 0) {
          const sub = mpSubsResult.data[0];
          hasActiveSubscription = ['authorized', 'approved', 'authorized_payment', 'active', 'valid'].includes(sub.status);
        }

        // Update profile if status changed
        const currentStatus = profile.subscription_active;
        if (currentStatus !== hasActiveSubscription) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              subscription_active: hasActiveSubscription,
              subscription_updated_at: new Date().toISOString()
            })
            .eq('user_id', profile.user_id);

          if (updateError) {
            console.error(`[RECONCILE] Error updating profile ${profile.user_id}:`, updateError);
            result.errors++;
          } else {
            if (hasActiveSubscription) {
              result.active_marked++;
            } else {
              result.inactive_marked++;
            }
            console.log(`[RECONCILE] Updated ${profile.user_id}: ${hasActiveSubscription ? 'ACTIVE' : 'INACTIVE'}`);
          }
        } else {
          result.unchanged++;
        }

      } catch (error) {
        console.error(`[RECONCILE] Error processing profile ${profile.user_id}:`, error);
        result.errors++;
      }
    }

    console.log('[RECONCILE] Reconciliation completed:', result);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription reconciliation completed',
        result
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[RECONCILE] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});