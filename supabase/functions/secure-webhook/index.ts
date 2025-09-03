// Secure Mercado Pago Webhook Handler with Enhanced Security
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts';
import { corsHeaders, logSafely } from '../_shared/auth.ts';

interface WebhookPayload {
  action: string;
  type: string;
  data?: { id: string };
  live_mode: boolean;
}

const validateWebhookSignature = (signature: string, requestId: string, body: string, secret: string): boolean => {
  try {
    // Expected format: ts=timestamp,v1=hash
    const signatureParts = signature.split(',');
    const timestampPart = signatureParts.find(part => part.startsWith('ts='));
    const hashPart = signatureParts.find(part => part.startsWith('v1='));

    if (!timestampPart || !hashPart) {
      return false;
    }

    const timestamp = timestampPart.split('=')[1];
    const receivedHash = hashPart.split('=')[1];

    // Create expected signature
    const signatureString = `${requestId}${body}`;
    const expectedHash = createHmac('sha256', secret).update(signatureString).digest('hex');

    return expectedHash === receivedHash;
  } catch (error) {
    logSafely('Signature validation error', { error_code: 'SIGNATURE_ERROR' });
    return false;
  }
};

serve(async (req) => {
  logSafely('Secure webhook received', { 
    method: req.method,
    contentType: req.headers.get('content-type'),
    origin: req.headers.get('origin')
  });

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    logSafely('Invalid method', { method: req.method });
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET') || Deno.env.get('MP_WEBHOOK_SECRET');
    const mpAccessToken = (Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || '').trim();

    if (!webhookSecret || !mpAccessToken) {
      logSafely('Missing environment variables', { error_code: 'MISSING_ENV' });
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract headers
    const signature = req.headers.get('x-signature');
    const requestId = req.headers.get('x-request-id');
    
    if (!signature || !requestId) {
      logSafely('Missing required headers', { error_code: 'MISSING_HEADERS' });
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // Parse body
    const bodyText = await req.text();
    const payload: WebhookPayload = JSON.parse(bodyText);
    
    logSafely('Webhook payload', {
      action: payload.action,
      type: payload.type,
      dataId: payload.data?.id,
      liveMode: payload.live_mode,
    });

    // SECURITY: Validate webhook signature
    const isValidSignature = validateWebhookSignature(signature, requestId, bodyText, webhookSecret);
    
    if (!isValidSignature) {
      logSafely('Invalid webhook signature', { 
        error_code: 'INVALID_SIGNATURE',
        request_id: requestId 
      });
      // Still return 200 to prevent Mercado Pago retries
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // SECURITY: Log webhook for auditing (without PII)
    await supabase.from('mercadopago_webhooks').insert({
      payload: payload,
      signature_valid: true,
      processed: false,
      request_id: requestId,
      event_type: `${payload.type}.${payload.action}`
    });

    // Process based on event type
    let processResult = { success: false };

    switch (payload.type) {
      case 'preapproval':
        processResult = await handlePreapprovalEvent(supabase, payload, mpAccessToken);
        break;
      case 'payment':
        processResult = await handlePaymentEvent(supabase, payload, mpAccessToken);
        break;
      default:
        logSafely('Unhandled event type', { type: payload.type, action: payload.action });
        processResult = { success: true }; // Consider unhandled events as successful
    }

    // Mark webhook as processed
    if (processResult.success) {
      await supabase.from('mercadopago_webhooks')
        .update({ processed: true })
        .eq('request_id', requestId);
    }

    // Always return 200 to prevent retries
    return new Response('OK', { status: 200, headers: corsHeaders });

  } catch (error) {
    logSafely('Webhook processing error', { 
      error_code: 'PROCESSING_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Still return 200 to prevent infinite retries
    return new Response('OK', { status: 200, headers: corsHeaders });
  }
});

const handlePreapprovalEvent = async (supabase: any, payload: WebhookPayload, accessToken: string) => {
  try {
    if (!payload.data?.id) {
      logSafely('No preapproval ID in payload', { error_code: 'NO_PREAPPROVAL_ID' });
      return { success: false };
    }

    // Fetch preapproval details from Mercado Pago
    const response = await fetch(`https://api.mercadopago.com/preapproval/${payload.data.id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      logSafely('Failed to fetch preapproval', { 
        status: response.status,
        preapproval_id: payload.data.id 
      });
      return { success: false };
    }

    const preapprovalData = await response.json();
    
    logSafely('Preapproval data received', {
      id: preapprovalData.id,
      status: preapprovalData.status,
      external_reference: preapprovalData.external_reference,
    });

    // Parse external reference: user_id|plan_code|subscription_id
    const externalRef = preapprovalData.external_reference;
    if (!externalRef) {
      logSafely('No external reference', { error_code: 'NO_EXTERNAL_REF' });
      return { success: false };
    }

    const [userId, planCode, subscriptionId] = externalRef.split('|');
    
    if (!userId || !planCode || !subscriptionId) {
      logSafely('Invalid external reference format', { 
        external_reference: externalRef 
      });
      return { success: false };
    }

    // SECURITY: Update subscription with user-scoped query
    const updateData: any = {
      mp_preapproval_id: preapprovalData.id,
      status: preapprovalData.status === 'authorized' ? 'active' : preapprovalData.status,
      updated_at: new Date().toISOString(),
    };

    if (preapprovalData.next_payment_date) {
      updateData.next_charge_at = preapprovalData.next_payment_date;
    }

    if (preapprovalData.status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .eq('user_id', userId); // SECURITY: Ensure user ownership

    if (updateError) {
      logSafely('Failed to update subscription', { 
        error_code: 'UPDATE_ERROR',
        subscription_id: subscriptionId 
      });
      return { success: false };
    }

    // Save event for auditing
    await supabase.from('mp_events').insert({
      type: 'preapproval',
      resource_id: preapprovalData.id,
      payload: {
        status: preapprovalData.status,
        external_reference: externalRef,
        next_payment_date: preapprovalData.next_payment_date,
      },
    });

    logSafely('Preapproval processed successfully', {
      subscription_id: subscriptionId,
      new_status: updateData.status,
    });

    return { success: true };

  } catch (error) {
    logSafely('Preapproval processing error', { 
      error_code: 'PREAPPROVAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return { success: false };
  }
};

const handlePaymentEvent = async (supabase: any, payload: WebhookPayload, accessToken: string) => {
  try {
    if (!payload.data?.id) {
      logSafely('No payment ID in payload', { error_code: 'NO_PAYMENT_ID' });
      return { success: false };
    }

    // Fetch payment details
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${payload.data.id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      logSafely('Failed to fetch payment', { 
        status: response.status,
        payment_id: payload.data.id 
      });
      return { success: false };
    }

    const paymentData = await response.json();
    
    logSafely('Payment data received', {
      id: paymentData.id,
      status: paymentData.status,
      external_reference: paymentData.external_reference,
    });

    // Save payment record
    await supabase.from('mercadopago_payments').insert({
      payment_id: paymentData.id,
      status: paymentData.status,
      amount: paymentData.transaction_amount,
      currency: paymentData.currency_id,
      user_email: paymentData.payer?.email || '',
      external_reference: paymentData.external_reference,
      payment_method: paymentData.payment_method_id,
      created_at: paymentData.date_created,
      approved_at: paymentData.status === 'approved' ? paymentData.date_approved : null,
    });

    logSafely('Payment processed successfully', {
      payment_id: paymentData.id,
      status: paymentData.status,
    });

    return { success: true };

  } catch (error) {
    logSafely('Payment processing error', { 
      error_code: 'PAYMENT_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return { success: false };
  }
};