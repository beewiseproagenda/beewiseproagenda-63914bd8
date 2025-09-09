import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const EDGE = 'https://obdwvgxxunkomacbifry.supabase.co/functions/v1';
    const PROD_ORIGIN = 'https://beewiseproagenda.com.br';

    // Test auth-ping
    const authPingResp = await fetch(`${EDGE}/auth-ping`, {
      method: 'GET',
      headers: {
        'Origin': PROD_ORIGIN,
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iZHd2Z3h4dW5rb21hY2JpZnJ5Iiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJpYXQiOjE3NTc0MzYxNTAsImV4cCI6MTc1NzQ0MzM1MH0.test',
        'Content-Type': 'application/json'
      }
    });

    let authPingJson;
    try {
      authPingJson = await authPingResp.json();
    } catch {
      authPingJson = { error: 'Failed to parse JSON' };
    }

    // Test create-subscription annual
    const createSubResp = await fetch(`${EDGE}/create-subscription`, {
      method: 'POST',
      headers: {
        'Origin': PROD_ORIGIN,
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iZHd2Z3h4dW5rb21hY2JpZnJ5Iiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJpYXQiOjE3NTc0MzYxNTAsImV4cCI6MTc1NzQ0MzM1MH0.test',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plan: 'annual',
        userEmail: 'test@beewiseproagenda.com.br'
      })
    });

    let createSubJson;
    try {
      createSubJson = await createSubResp.json();
    } catch {
      createSubJson = { error: 'Failed to parse JSON' };
    }

    const result = {
      "auth_ping": {
        "status": authPingResp.status,
        "ok": authPingJson.ok || false,
        "user_id": authPingJson.user_id || null,
        "error": authPingJson.error || null
      },
      "create_subscription_annual": {
        "status": createSubResp.status,
        "ok": createSubResp.ok,
        "retried": createSubJson.retried || false,
        "preference_id": createSubJson.preference_id || null,
        "external_reference": createSubJson.external_reference || null,
        "init_point": createSubJson.init_point || null,
        "mp_error": createSubJson.mp_error || (createSubResp.ok ? null : {
          "status": createSubResp.status,
          "code": createSubJson.code || createSubJson.error || "UNKNOWN",
          "message": createSubJson.message || "Unknown error",
          "cause": createSubJson.cause || []
        })
      }
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({
      "auth_ping": { "status": 500, "ok": false, "user_id": null, "error": "NETWORK_ERROR" },
      "create_subscription_annual": { "status": 500, "ok": false, "retried": false, "preference_id": null, "external_reference": null, "init_point": null, "mp_error": { "status": 500, "code": "NETWORK_ERROR", "message": error.message, "cause": [] }}
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});