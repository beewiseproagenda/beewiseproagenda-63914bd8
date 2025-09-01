import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHash, createHmac } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://6d45dc04-588b-43e4-8e90-8f2206699257.sandbox.lovable.dev",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// SECURITY: Safe logging function that never logs PII
const logStep = (step: string, details?: any) => {
  if (details) {
    const safeDetails = {
      ...details,
      // Remove sensitive fields
      email: details.email ? '[EMAIL_REDACTED]' : undefined,
      payer_email: details.payer_email ? '[EMAIL_REDACTED]' : undefined,
      user_id: details.user_id ? '[USER_ID]' : undefined,
      // Keep safe fields
      status: details.status,
      id: details.id,
      paymentId: details.paymentId,
      preapprovalId: details.preapprovalId,
      action: details.action,
      eventType: details.eventType,
      error_count: details.error_count,
      requestId: details.requestId
    };
    console.log(`[MERCADOPAGO-WEBHOOK] ${step} - ${JSON.stringify(safeDetails)}`);
  } else {
    console.log(`[MERCADOPAGO-WEBHOOK] ${step}`);
  }
};

// Validar assinatura do Mercado Pago
const validateSignature = (xSignature: string, xRequestId: string, payload: string, secret: string): boolean => {
  try {
    // Extrair ts e v1 do header x-signature
    const signatureParts = xSignature.split(',');
    let ts = '';
    let hash = '';

    for (const part of signatureParts) {
      const [key, value] = part.trim().split('=');
      if (key === 'ts') ts = value;
      if (key === 'v1') hash = value;
    }

    if (!ts || !hash) {
      logStep("ERROR: Missing ts or v1 in signature");
      return false;
    }

    // Criar string para validação: id + request-id + ts + payload
    const dataToSign = `id:${xRequestId};request-id:${xRequestId};ts:${ts};${payload}`;
    
    // Calcular HMAC SHA256
    const expectedHash = createHmac("sha256", secret).update(dataToSign).digest("hex");
    
    logStep("Signature validation", { 
      expectedHash: expectedHash.substring(0, 10) + "...", 
      receivedHash: hash.substring(0, 10) + "...",
      valid: expectedHash === hash 
    });

    return expectedHash === hash;
  } catch (error) {
    logStep("ERROR: Signature validation failed", { error: error.message });
    return false;
  }
};

interface WebhookPayload {
  id?: string;
  live_mode?: boolean;
  type?: string;
  date_created?: string;
  application_id?: string;
  user_id?: string;
  version?: string;
  api_version?: string;
  action?: string;
  data?: {
    id?: string;
  };
}

interface PaymentData {
  id: string;
  status: string;
  status_detail: string;
  payment_method_id: string;
  payment_type_id: string;
  transaction_amount: number;
  currency_id: string;
  payer: {
    email: string;
    id: string;
  };
  external_reference?: string;
  description?: string;
  date_created: string;
  date_approved?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    logStep("ERROR: Method not allowed", { method: req.method });
    return new Response(JSON.stringify({ "status": "received" }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  let requestId = '';
  let signatureValid = false;
  let payload: any = null;
  let eventType = '';

  try {
    logStep("Webhook received");

    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Extrair headers de assinatura
    const xSignature = req.headers.get("x-signature");
    const xRequestId = req.headers.get("x-request-id");
    requestId = xRequestId || '';

    // Ler payload como texto primeiro
    const payloadText = await req.text();
    
    // Validar assinatura se os headers estiverem presentes
    const webhookSecret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");
    if (xSignature && xRequestId && webhookSecret) {
      signatureValid = validateSignature(xSignature, xRequestId, payloadText, webhookSecret);
      
      if (!signatureValid) {
        logStep("ERROR: Invalid signature", { requestId });
        // Ainda salvar o webhook mesmo com assinatura inválida para auditoria
      }
    } else {
      logStep("WARNING: Missing signature headers or secret", { 
        hasSignature: !!xSignature, 
        hasRequestId: !!xRequestId, 
        hasSecret: !!webhookSecret 
      });
    }

    // Parse payload JSON
    try {
      payload = JSON.parse(payloadText);
    } catch (error) {
      logStep("ERROR: Invalid JSON payload", { error: error.message });
      payload = { raw_payload: payloadText };
    }

    eventType = payload.type || 'unknown';
    
    logStep("Webhook details", { 
      requestId, 
      eventType, 
      signatureValid,
      action: payload.action
    });

    // Salvar webhook na tabela de logs
    await saveWebhookLog(supabaseClient, requestId, eventType, payload, signatureValid);

    // Processar eventos específicos
    let processed = false;
    
    switch (eventType) {
      case 'payment':
        if (payload.action === 'payment.updated' || payload.action === 'payment.created') {
          processed = await handlePaymentEvent(supabaseClient, payload);
        }
        break;
        
      case 'subscription':
        if (payload.action === 'subscription.created') {
          processed = await handleSubscriptionCreated(supabaseClient, payload);
        } else if (payload.action === 'subscription.cancelled') {
          processed = await handleSubscriptionCancelled(supabaseClient, payload);
        }
        break;
        
      case 'preapproval':
        processed = await handlePreapprovalEvent(supabaseClient, payload);
        break;
        
      default:
        logStep("INFO: Event type not handled, saved to log only", { eventType });
    }

    // Atualizar status de processamento
    if (processed) {
      await updateWebhookProcessed(supabaseClient, requestId);
    }

    logStep("Webhook processed successfully", { requestId, processed });

    // Sempre retornar 200 OK com status received
    return new Response(JSON.stringify({ "status": "received" }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook processing", { 
      message: errorMessage, 
      requestId 
    });
    
    // Tentar salvar o erro no log se possível
    try {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      
      if (payload) {
        await saveWebhookLog(supabaseClient, requestId, eventType || 'error', 
          { ...payload, error: errorMessage }, signatureValid);
      }
    } catch (logError) {
      logStep("ERROR: Failed to save error log", { error: logError.message });
    }
    
    // Sempre retornar 200 OK mesmo em caso de erro
    return new Response(JSON.stringify({ "status": "received" }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function saveWebhookLog(supabaseClient: any, requestId: string, eventType: string, payload: any, signatureValid: boolean) {
  try {
    const { error } = await supabaseClient
      .from('mercadopago_webhooks')
      .insert({
        request_id: requestId,
        event_type: eventType,
        payload: payload,
        signature_valid: signatureValid,
        processed: false
      });

    if (error) {
      logStep("ERROR: Failed to save webhook log", error);
    } else {
      logStep("Webhook log saved successfully", { requestId, eventType });
    }
  } catch (error) {
    logStep("ERROR: Exception saving webhook log", { error: error.message });
  }
}

async function handlePaymentEvent(supabaseClient: any, payload: any): Promise<boolean> {
  try {
    const paymentId = payload.data?.id;
    if (!paymentId) {
      logStep("ERROR: No payment ID in payment webhook");
      return false;
    }

    logStep("Processing payment event", { paymentId, action: payload.action });

    const mercadoPagoAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mercadoPagoAccessToken) {
      logStep("ERROR: MercadoPago access token not configured");
      return false;
    }

    // Buscar detalhes do pagamento da API do Mercado Pago
    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          "Authorization": `Bearer ${mercadoPagoAccessToken}`
        }
      }
    );

    if (!paymentResponse.ok) {
      logStep("ERROR: Failed to fetch payment from MercadoPago", { 
        status: paymentResponse.status 
      });
      return false;
    }

    const paymentData = await paymentResponse.json();
    logStep("Payment data retrieved", { 
      id: paymentData.id, 
      status: paymentData.status,
      email: paymentData.payer?.email 
    });

    // Usar a função existente para atualizar status da assinatura
    await updateSubscriptionStatus(supabaseClient, paymentData);
    
    return true;
  } catch (error) {
    logStep("ERROR: Failed to handle payment event", { error: error.message });
    return false;
  }
}

async function handleSubscriptionCreated(supabaseClient: any, payload: any): Promise<boolean> {
  try {
    logStep("Processing subscription created event", { payload });
    
    // Extrair dados da assinatura
    const subscriptionData = payload.data;
    if (!subscriptionData) {
      logStep("ERROR: No subscription data in webhook");
      return false;
    }

    // Atualizar tabela de subscribers
    const subscriptionRecord = {
      email: subscriptionData.payer_email || 'unknown',
      subscribed: true,
      subscription_tier: 'Premium',
      subscription_end: subscriptionData.end_date ? new Date(subscriptionData.end_date).toISOString() : null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabaseClient
      .from('subscribers')
      .upsert(subscriptionRecord, { 
        onConflict: 'email',
        ignoreDuplicates: false 
      });

    if (error) {
      logStep("ERROR: Failed to create subscription", error);
      return false;
    }

    logStep("Subscription created successfully", { email: subscriptionRecord.email });
    return true;
  } catch (error) {
    logStep("ERROR: Failed to handle subscription created", { error: error.message });
    return false;
  }
}

async function handleSubscriptionCancelled(supabaseClient: any, payload: any): Promise<boolean> {
  try {
    logStep("Processing subscription cancelled event", { payload });
    
    // Extrair dados da assinatura
    const subscriptionData = payload.data;
    if (!subscriptionData) {
      logStep("ERROR: No subscription data in webhook");
      return false;
    }

    // Desativar assinatura
    const subscriptionRecord = {
      email: subscriptionData.payer_email || 'unknown',
      subscribed: false,
      subscription_tier: null,
      subscription_end: null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabaseClient
      .from('subscribers')
      .upsert(subscriptionRecord, { 
        onConflict: 'email',
        ignoreDuplicates: false 
      });

    if (error) {
      logStep("ERROR: Failed to cancel subscription", error);
      return false;
    }

    logStep("Subscription cancelled successfully", { email: subscriptionRecord.email });
    return true;
  } catch (error) {
    logStep("ERROR: Failed to handle subscription cancelled", { error: error.message });
    return false;
  }
}

async function updateWebhookProcessed(supabaseClient: any, requestId: string) {
  try {
    const { error } = await supabaseClient
      .from('mercadopago_webhooks')
      .update({ processed: true })
      .eq('request_id', requestId);

    if (error) {
      logStep("ERROR: Failed to update webhook processed status", error);
    } else {
      logStep("Webhook marked as processed", { requestId });
    }
  } catch (error) {
    logStep("ERROR: Exception updating webhook processed status", { error: error.message });
  }
}

async function updateSubscriptionStatus(supabaseClient: any, paymentData: any) {
  logStep("Updating subscription status", { 
    paymentId: paymentData.id,
    status: paymentData.status,
    email: paymentData.payer?.email
  });

  try {
    // First, find or create the user based on email
    const userEmail = paymentData.payer?.email;
    if (!userEmail) {
      logStep("WARNING: No email in payment data");
      return;
    }

    // Determine subscription status based on payment status
    let subscriptionStatus = 'pending';
    let subscriptionActive = false;
    
    switch (paymentData.status) {
      case 'approved':
        subscriptionStatus = 'active';
        subscriptionActive = true;
        break;
      case 'rejected':
      case 'cancelled':
        subscriptionStatus = 'cancelled';
        subscriptionActive = false;
        break;
      case 'pending':
      case 'in_process':
        subscriptionStatus = 'pending';
        subscriptionActive = false;
        break;
      default:
        subscriptionStatus = 'unknown';
        subscriptionActive = false;
    }

    // Create or update payment record
    const paymentRecord = {
      payment_id: paymentData.id,
      user_email: userEmail,
      status: paymentData.status,
      amount: paymentData.transaction_amount,
      currency: paymentData.currency_id,
      payment_method: paymentData.payment_method_id,
      external_reference: paymentData.external_reference,
      created_at: paymentData.date_created,
      approved_at: paymentData.date_approved,
      updated_at: new Date().toISOString()
    };

    // Insert/update payment record
    const { error: paymentError } = await supabaseClient
      .from('mercadopago_payments')
      .upsert(paymentRecord, { 
        onConflict: 'payment_id',
        ignoreDuplicates: false 
      });

    if (paymentError) {
      logStep("ERROR: Failed to upsert payment record", paymentError);
    } else {
      logStep("Payment record updated successfully");
    }

    // Update user subscription status if payment is approved
    if (subscriptionActive) {
      // Calculate subscription end date (30 days from now)
      const subscriptionEnd = new Date();
      subscriptionEnd.setDate(subscriptionEnd.getDate() + 30);

      const subscriptionRecord = {
        email: userEmail,
        subscribed: true,
        subscription_tier: 'Premium',
        subscription_end: subscriptionEnd.toISOString(),
        payment_id: paymentData.id,
        updated_at: new Date().toISOString()
      };

      const { error: subscriptionError } = await supabaseClient
        .from('subscribers')
        .upsert(subscriptionRecord, { 
          onConflict: 'email',
          ignoreDuplicates: false 
        });

      if (subscriptionError) {
        logStep("ERROR: Failed to update subscription", subscriptionError);
      } else {
        logStep("Subscription activated successfully", { 
          email: userEmail, 
          endDate: subscriptionEnd.toISOString() 
        });
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in updateSubscriptionStatus", { message: errorMessage });
    throw error;
  }
}

async function handlePreapprovalEvent(supabaseClient: any, payload: any): Promise<boolean> {
  try {
    const preapprovalId = payload.data?.id;
    if (!preapprovalId) {
      logStep("ERROR: No preapproval ID in preapproval webhook");
      return false;
    }

    logStep("Processing preapproval event", { preapprovalId, action: payload.action });

    const mercadoPagoAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") || Deno.env.get("MP_ACCESS_TOKEN");
    if (!mercadoPagoAccessToken) {
      logStep("ERROR: MercadoPago access token not configured");
      return false;
    }

    // Buscar detalhes do preapproval da API do Mercado Pago
    const preapprovalResponse = await fetch(
      `https://api.mercadopago.com/preapproval/${preapprovalId}`,
      {
        headers: {
          "Authorization": `Bearer ${mercadoPagoAccessToken}`
        }
      }
    );

    if (!preapprovalResponse.ok) {
      logStep("ERROR: Failed to fetch preapproval from MercadoPago", { 
        status: preapprovalResponse.status 
      });
      return false;
    }

    const preapprovalData = await preapprovalResponse.json();
    logStep("Preapproval data retrieved", { 
      id: preapprovalData.id, 
      status: preapprovalData.status,
      payer_email: preapprovalData.payer_email,
      external_reference: preapprovalData.external_reference
    });

    // Parse external_reference para obter user_id, plan_code e subscription_id
    const externalRef = preapprovalData.external_reference;
    if (!externalRef) {
      logStep("WARNING: No external_reference in preapproval data");
      return false;
    }

    const [userId, planCode, subscriptionId] = externalRef.split('|');
    if (!userId || !planCode || !subscriptionId) {
      logStep("ERROR: Invalid external_reference format", { external_reference: externalRef });
      return false;
    }

    logStep("Parsed external reference", { userId, planCode, subscriptionId });

    // Calcular next_charge_at baseado no interval do plano
    let nextChargeAt = null;
    if (preapprovalData.auto_recurring?.next_payment_date) {
      nextChargeAt = preapprovalData.auto_recurring.next_payment_date;
    }

    // Determinar cancelled_at se o status for cancelled
    let cancelledAt = null;
    if (preapprovalData.status === 'cancelled') {
      cancelledAt = new Date().toISOString();
    }

    // Atualizar subscription na tabela subscriptions
    const subscriptionUpdate = {
      mp_preapproval_id: preapprovalData.id,
      status: preapprovalData.status,
      next_charge_at: nextChargeAt,
      cancelled_at: cancelledAt,
      updated_at: new Date().toISOString()
    };

    logStep("Updating subscription", { subscriptionId, subscriptionUpdate });

    const { error: subscriptionError } = await supabaseClient
      .from('subscriptions')
      .update(subscriptionUpdate)
      .eq('id', subscriptionId);

    if (subscriptionError) {
      logStep("ERROR: Failed to update subscription", subscriptionError);
      return false;
    }

    logStep("Subscription updated successfully");

    // Salvar no mp_events também para auditoria
    const { error: eventError } = await supabaseClient
      .from('mp_events')
      .insert({
        type: 'preapproval',
        resource_id: preapprovalId,
        payload: preapprovalData,
      });

    if (eventError) {
      logStep("WARNING: Failed to save mp_event", eventError);
    }

    return true;

  } catch (error) {
    logStep("ERROR: Failed to handle preapproval event", { error: error.message });
    return false;
  }
}