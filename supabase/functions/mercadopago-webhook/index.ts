import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MERCADOPAGO-WEBHOOK] ${step}${detailsStr}`);
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
    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    logStep("Webhook received");

    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Parse webhook payload
    const payload: WebhookPayload = await req.json();
    logStep("Webhook payload received", payload);

    // Validate webhook authenticity (basic validation)
    const userAgent = req.headers.get("user-agent");
    if (!userAgent || !userAgent.includes("MercadoPago")) {
      logStep("WARNING: Suspicious webhook source", { userAgent });
    }

    // Check if this is a payment notification
    if (payload.type !== "payment") {
      logStep("INFO: Non-payment notification ignored", { type: payload.type });
      return new Response("OK", { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    // Get payment ID from the webhook
    const paymentId = payload.data?.id;
    if (!paymentId) {
      logStep("ERROR: No payment ID in webhook");
      return new Response("No payment ID", { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    logStep("Processing payment notification", { paymentId });

    // Here you would typically fetch payment details from Mercado Pago API
    // For now, we'll simulate the payment data structure
    // In a real implementation, you'd need to:
    // 1. Call Mercado Pago API to get payment details
    // 2. Validate the payment using your access token
    
    const mercadoPagoAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mercadoPagoAccessToken) {
      logStep("ERROR: MercadoPago access token not configured");
      return new Response("Configuration error", { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Fetch payment details from Mercado Pago
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
      return new Response("Failed to fetch payment", { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    const paymentData: PaymentData = await paymentResponse.json();
    logStep("Payment data retrieved", { 
      id: paymentData.id, 
      status: paymentData.status,
      email: paymentData.payer?.email 
    });

    // Update subscription status in database
    await updateSubscriptionStatus(supabaseClient, paymentData);

    logStep("Webhook processed successfully");

    // Always return 200 OK to acknowledge receipt
    return new Response("OK", { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook processing", { message: errorMessage });
    
    // Still return 200 to avoid webhook retries for application errors
    return new Response("OK", { 
      status: 200, 
      headers: corsHeaders 
    });
  }
});

async function updateSubscriptionStatus(supabaseClient: any, paymentData: PaymentData) {
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