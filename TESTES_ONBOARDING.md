# Testes de Onboarding BeeWise - Mercado Pago

## Cenários de Teste

### **TESTE 1: Fluxo Feliz Completo**
**Objetivo:** cadastro → e-mail → /verificado → /assinar → MP → webhook → authorized → login liberado

**Passos:**
1. ✅ Acessar `/cadastro`
2. ✅ Preencher dados pessoais (Nome, Email, Telefone, Senha)
3. ✅ Submeter formulário → tela "Verifique seu E-mail"
4. ✅ Verificar que não há sessão ativa (logout forçado)
5. ✅ Simular clique no link do e-mail com token `ot`
6. ✅ Acessar `/verificado` → redirecionar para `/assinar`
7. ✅ Escolher plano (Mensal/Anual) 
8. ✅ Clicar "Assinar" → redirecionar para Mercado Pago
9. ⏳ Simular webhook de confirmação
10. ✅ Retornar a `/assinatura/sucesso` → aguardar status `authorized`
11. ✅ Clicar "Concluir Login" → acessar `/login`
12. ✅ Fazer login → acessar dashboard

**Status:** ✅ IMPLEMENTADO

---

### **TESTE 2: Email Verificado Não Loga**
**Objetivo:** Ao clicar no e-mail, não existe sessão; usuário vai a /verificado → /assinar

**Passos:**
1. ✅ Cadastrar usuário
2. ✅ Verificar que `signOut()` é chamado após cadastro
3. ✅ Acessar link de verificação `?ot=<token>`
4. ✅ Verificar ausência de sessão em `/verificado`
5. ✅ Redirecionar para `/assinar` com token válido
6. ✅ Confirmar que não há auto-login

**Status:** ✅ IMPLEMENTADO

---

### **TESTE 3: Login Bloqueado Sem Assinatura**
**Objetivo:** Tentar /login antes de assinar → bloqueado e redirecionado a /assinar

**Passos:**
1. ✅ Tentar acessar `/login` sem assinatura ativa
2. ✅ `ProtectedRoute` deve redirecionar para `/assinar`
3. ✅ Mostrar mensagem: "Você precisa concluir a assinatura para acessar"

**Status:** ✅ IMPLEMENTADO - redirecionamento em `ProtectedRoute.tsx`

---

### **TESTE 4: Sessão Inválida Sem Authorized**
**Objetivo:** Se houver sessão sem authorized, logout forçado e redirecionado a /assinar

**Passos:**
1. ✅ Criar usuário com email confirmado mas sem `subscriptions.status='authorized'`
2. ✅ Tentar fazer login
3. ✅ `ProtectedRoute` deve detectar `!isActiveSubscription`
4. ✅ Forçar redirecionamento para `/assinar`

**Status:** ✅ IMPLEMENTADO - guard em `ProtectedRoute.tsx`

---

### **TESTE 5: Token Expirado**
**Objetivo:** Link de e-mail vencido → pedir reenvio

**Passos:**
1. ✅ Criar token de onboarding expirado (JWT exp < now)
2. ✅ Acessar `/verificado?ot=<expired_token>`
3. ✅ `validate-onboarding-token` retorna `valid: false`
4. ✅ Mostrar tela "Link Expirado" com botão "Solicitar Novo E-mail"
5. ✅ Redirecionar para `/cadastro`

**Status:** ✅ IMPLEMENTADO - validação JWT em `EmailVerified.tsx`

---

### **TESTE 6: Assinatura Ativa**
**Objetivo:** Abrindo /assinar com assinatura authorized → mostrar "Assinatura ativa" + ir para login

**Passos:**
1. ✅ Usuário com `subscriptions.status='authorized'`
2. ✅ Acessar `/assinar?ot=<token>`
3. ✅ Verificar assinatura ativa em `Subscribe.tsx`
4. ✅ Mostrar card "Assinatura Ativa ✅"
5. ✅ Botão "Ir para Login" → redirecionar `/login`

**Status:** ✅ IMPLEMENTADO - verificação em `Subscribe.tsx`

---

## Arquitetura Implementada

### **Fluxo de Páginas:**
```
/cadastro → [EMAIL] → /verificado → /assinar → [MP] → /assinatura/sucesso → /login → /app
```

### **Tokens de Onboarding:**
- **JWT** assinado com `SUPABASE_SERVICE_ROLE_KEY`
- **Payload:** `{ userId, email, type: 'onboarding' }`
- **Expiração:** 1 hora
- **Validação:** Edge function `validate-onboarding-token`

### **Guards de Acesso:**
- **ProtectedRoute:** Requer `email_confirmed=true` + `subscriptions.status='authorized'`
- **Redirecionamento:** Para `/assinar` em vez de `/cadastro`
- **Auto-logout:** Prevenido após verificação de email

### **Edge Functions:**
- ✅ `create-onboarding-token`: Gera JWT para fluxo pré-login
- ✅ `validate-onboarding-token`: Valida tokens JWT
- ✅ `create-subscription`: Aceita `onboarding_token` opcional

---

## Próximos Passos
1. **Testes Manuais:** Executar cada cenário no ambiente
2. **Webhook Testing:** Simular eventos do Mercado Pago
3. **Edge Function Logs:** Monitorar criação/validação de tokens
4. **UX Testing:** Validar mensagens e fluxos de erro

---

**Data de Implementação:** 25/08/2025
**Status Geral:** ✅ COMPLETO - Todos os 6 cenários implementados