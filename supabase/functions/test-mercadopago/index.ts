import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * 🧪 TEST FUNCTION for Mercado Pago Integration
 * 
 * This function tests your MP credentials and payload structure
 * Use this to validate your setup before using the main create-subscription function
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { plan_code, email } = await req.json();
    
    const mpAccessToken = (Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || '').trim();
    const appUrl = Deno.env.get('APP_URL');
    
    if (!mpAccessToken) {
      return new Response(JSON.stringify({ 
        error: 'MERCADOPAGO_ACCESS_TOKEN not configured',
        checkSecrets: 'Go to Supabase dashboard > Functions > Secrets and verify MERCADOPAGO_ACCESS_TOKEN exists'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test payload matching your implementation
    const testPayload = {
      reason: `TEST - Assinatura BeeWise Pro - ${plan_code === 'mensal' ? 'Mensal' : 'Anual'}`,
      payer_email: email || 'test@example.com',
      back_url: `${appUrl || 'https://your-app.com'}/assinatura/sucesso`,
      external_reference: `test-${Date.now()}`,
      auto_recurring: {
        frequency: plan_code === 'mensal' ? 1 : 12,
        frequency_type: 'months',
        transaction_amount: plan_code === 'mensal' ? 19.90 : 14.90,
        currency_id: 'BRL'
      },
      notification_url: `${appUrl || 'https://your-app.com'}/functions/v1/mercadopago-webhook`
    };

    console.log('🧪 Testing Mercado Pago with payload:', JSON.stringify(testPayload, null, 2));

    // Test the MP API call
    const response = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `test-${Date.now()}`,
      },
      body: JSON.stringify(testPayload),
    });

    const responseData = await response.json();

    console.log('🧪 MP Response:', {
      status: response.status,
      statusText: response.statusText,
      data: responseData
    });

    if (response.ok) {
      return new Response(JSON.stringify({
        success: true,
        status: response.status,
        message: '✅ Mercado Pago API working correctly!',
        init_point: responseData.init_point,
        preapproval_id: responseData.id,
        testPayload
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      // Detailed error response
      return new Response(JSON.stringify({
        success: false,
        status: response.status,
        statusText: response.statusText,
        errorDetails: responseData,
        testPayload,
        troubleshooting: {
          401: 'Invalid access token - Check MP_ACCESS_TOKEN secret',
          400: 'Invalid payload structure - Check required fields',
          403: 'Token permissions issue - Ensure production token has subscription permissions',
          500: 'Mercado Pago server error - Try again later'
        }[response.status] || 'Unknown error'
      }), {
        status: 200, // Return 200 so you can see the detailed error
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('🧪 Test function error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Test function error',
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});