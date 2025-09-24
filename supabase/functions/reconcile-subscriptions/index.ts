import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
};

interface ReconcileResult {
  total_users: number;
  updated: number;
  unchanged: number;
  errors: string[];
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
      updated: 0,
      unchanged: 0,
      errors: []
    };

    // Get all profiles with user_id
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, subscription_active, subscription_status, trial_started_at, trial_expires_at, created_at, email');

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
    for (let i = 0; i < (profiles?.length || 0); i++) {
      const profile = profiles[i];
      let hasActive = false;
      let newStatus = 'none';

      // Backfill trial data if missing
      let trialUpdate = {};
      if (!profile.trial_started_at || !profile.trial_expires_at) {
        const startedAt = profile.created_at;
        const expiresAt = new Date(new Date(startedAt).getTime() + (7 * 24 * 60 * 60 * 1000));
        trialUpdate = {
          trial_started_at: startedAt,
          trial_expires_at: expiresAt.toISOString()
        };
      }

      // Check subscriptions table first (newest data)
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('status, cancelled_at, next_charge_at')
        .eq('user_id', profile.user_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (subscriptions && subscriptions.length > 0) {
        const sub = subscriptions[0];
        hasActive = sub.status === 'active' && 
                   !sub.cancelled_at &&
                   (!sub.next_charge_at || new Date(sub.next_charge_at) > new Date());
        newStatus = hasActive ? 'active' : sub.status;
      } else {
        // Check subscribers table (legacy)
        const { data: subscribers } = await supabase
          .from('subscribers')
          .select('subscribed, subscription_end')
          .or(`user_id.eq.${profile.user_id},email.eq.${profile.email || ''}`)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (subscribers && subscribers.length > 0) {
          const sub = subscribers[0];
          hasActive = sub.subscribed &&
                     (!sub.subscription_end || new Date(sub.subscription_end) > new Date());
          newStatus = hasActive ? 'active' : 'inactive';
        } else {
          // Check mp_subscriptions table
          const { data: mpSubs } = await supabase
            .from('mp_subscriptions')
            .select('status')
            .eq('user_id', profile.user_id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (mpSubs && mpSubs.length > 0) {
            const mpSub = mpSubs[0];
            hasActive = mpSub.status === 'authorized';
            newStatus = hasActive ? 'active' : mpSub.status;
          }
        }
      }

      // Update if changed or trial data missing
      const needsUpdate = profile.subscription_active !== hasActive || 
                         profile.subscription_status !== newStatus ||
                         trialUpdate.trial_started_at;
      
      if (needsUpdate) {
        const updateData = { 
          subscription_active: hasActive,
          subscription_status: newStatus,
          subscription_updated_at: new Date().toISOString(),
          ...trialUpdate
        };

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('user_id', profile.user_id);

        if (updateError) {
          console.error(`Error updating profile ${profile.user_id}:`, updateError);
          result.errors.push(`Profile ${profile.user_id}: ${updateError.message}`);
        } else {
          result.updated++;
          console.log(`Updated profile ${profile.user_id}: subscription_active = ${hasActive}, status = ${newStatus}`);
        }
      } else {
        result.unchanged++;
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

  } catch (error: any) {
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