# 🧪 Mercado Pago Testing Guide

## Quick Test via Edge Function

Test your Mercado Pago integration using the test function:

```bash
# Test monthly plan
curl -X POST https://obdwvgxxunkomacbifry.supabase.co/functions/v1/test-mercadopago \
  -H "Content-Type: application/json" \
  -d '{
    "plan_code": "mensal",
    "email": "test@example.com"
  }'

# Test annual plan  
curl -X POST https://obdwvgxxunkomacbifry.supabase.co/functions/v1/test-mercadopago \
  -H "Content-Type: application/json" \
  -d '{
    "plan_code": "anual", 
    "email": "test@example.com"
  }'
```

## Direct cURL Test (Production Validation)

Replace `YOUR_MP_ACCESS_TOKEN` with your actual token:

```bash
curl -X POST https://api.mercadopago.com/preapproval \
  -H "Authorization: Bearer YOUR_MP_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-$(date +%s)" \
  -d '{
    "reason": "TEST - Assinatura BeeWise Pro - Mensal",
    "payer_email": "test@example.com",
    "back_url": "https://your-app.com/assinatura/sucesso",
    "external_reference": "test-user-mensal-123",
    "auto_recurring": {
      "frequency": 1,
      "frequency_type": "months", 
      "transaction_amount": 19.90,
      "currency_id": "BRL"
    },
    "notification_url": "https://your-app.com/webhook"
  }'
```

## Expected Success Response (201)

```json
{
  "id": "2c93808482cd96c601829ad729ba0b5c",
  "payer_id": 12345678,
  "payer_email": "test@example.com", 
  "status": "pending",
  "reason": "TEST - Assinatura BeeWise Pro - Mensal",
  "external_reference": "test-user-mensal-123",
  "init_point": "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=xxx",
  "auto_recurring": {
    "frequency": 1,
    "frequency_type": "months",
    "transaction_amount": 19.90,
    "currency_id": "BRL"
  }
}
```

## Error Debugging

### 401 Unauthorized
- **Cause**: Invalid or expired access token
- **Fix**: Verify MP_ACCESS_TOKEN in Supabase secrets
- **Check**: Token should be production token starting with `APP_USR-`

### 400 Bad Request  
- **Cause**: Invalid payload structure
- **Common Issues**:
  - `transaction_amount` should be decimal (19.90) not cents (1990)
  - `frequency_type` must be "months" not "month"
  - Missing required fields in `auto_recurring`

### 403 Forbidden
- **Cause**: Token doesn't have subscription permissions
- **Fix**: Use production token with subscription scope

## Plan Details From Database

Monthly Plan:
- Code: `mensal`
- Price: R$ 19.90 (1990 cents)
- Frequency: 1 month
- MP Plan ID: `3b02b267a1bd44a68d749495857aafcb`

Annual Plan:  
- Code: `anual`
- Price: R$ 14.90/month (1490 cents, R$ 178.80/year)
- Frequency: 12 months
- MP Plan ID: `f3f127b3ec40448cab2b861af5f7a3d1`

## Testing Flow

1. **Test credentials** → Use test function or cURL
2. **Verify response** → Should get 201 with `init_point` 
3. **Check webhook** → MP will send notifications to your webhook URL
4. **User flow** → Registration → Email verification → Plan selection → MP checkout → Webhook confirmation