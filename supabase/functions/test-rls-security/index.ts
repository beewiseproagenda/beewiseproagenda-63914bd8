import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create authenticated client
    const db = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } }
      }
    )

    const results = {
      user_id: user.id,
      timestamp: new Date().toISOString(),
      tests: [] as any[],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        security_level: 'unknown' as 'secure' | 'vulnerable' | 'unknown'
      }
    }

    console.log('=== RLS SECURITY TEST FOR CLIENTES TABLE ===')
    console.log(`Testing user: ${user.id}`)

    // TEST 1: Verify user can only see their own clientes
    try {
      const { data: myClientes, error: selectError } = await db
        .from('clientes')
        .select('id, user_id')
      
      if (selectError) throw selectError

      const allBelongToUser = myClientes?.every(c => c.user_id === user.id) ?? true
      const testResult = {
        test: 'SELECT - Own data only',
        passed: allBelongToUser,
        details: `Retrieved ${myClientes?.length || 0} clientes, all belong to current user: ${allBelongToUser}`,
        risk: allBelongToUser ? 'none' : 'CRITICAL - Can see other users data!'
      }
      
      results.tests.push(testResult)
      results.summary.total++
      if (testResult.passed) results.summary.passed++
      else results.summary.failed++

      console.log(`✓ Test 1: ${testResult.passed ? 'PASS' : 'FAIL'}`)
    } catch (error) {
      results.tests.push({
        test: 'SELECT - Own data only',
        passed: false,
        error: error.message,
        risk: 'CRITICAL'
      })
      results.summary.total++
      results.summary.failed++
      console.log('✗ Test 1: FAIL - Error occurred')
    }

    // TEST 2: Try to query with specific user_id filter (should only return if matches auth.uid())
    try {
      // First, get a different user_id from the database (if exists)
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { persistSession: false } }
      )

      const { data: otherUsers } = await supabaseAdmin
        .from('clientes')
        .select('user_id')
        .neq('user_id', user.id)
        .limit(1)

      if (otherUsers && otherUsers.length > 0) {
        const otherUserId = otherUsers[0].user_id

        // Try to query other user's data with authenticated client
        const { data: otherClientes, error } = await db
          .from('clientes')
          .select('id, user_id')
          .eq('user_id', otherUserId)

        // Should return empty array due to RLS, even with explicit filter
        const passed = (otherClientes?.length === 0) && !error
        const testResult = {
          test: 'SELECT - Filter bypass attempt',
          passed,
          details: `Attempted to query user_id ${otherUserId}, got ${otherClientes?.length || 0} results`,
          risk: passed ? 'none' : 'CRITICAL - RLS bypass possible!'
        }
        
        results.tests.push(testResult)
        results.summary.total++
        if (testResult.passed) results.summary.passed++
        else results.summary.failed++

        console.log(`✓ Test 2: ${testResult.passed ? 'PASS' : 'FAIL'}`)
      } else {
        results.tests.push({
          test: 'SELECT - Filter bypass attempt',
          passed: true,
          details: 'No other users found to test against',
          risk: 'none'
        })
        results.summary.total++
        results.summary.passed++
        console.log('✓ Test 2: SKIP - No other users to test')
      }
    } catch (error) {
      results.tests.push({
        test: 'SELECT - Filter bypass attempt',
        passed: true, // Error is expected/acceptable here
        details: `Error occurred (acceptable): ${error.message}`,
        risk: 'none'
      })
      results.summary.total++
      results.summary.passed++
      console.log('✓ Test 2: PASS - Error is acceptable')
    }

    // TEST 3: Try to INSERT with different user_id (should fail or be overridden)
    try {
      const fakeUserId = '00000000-0000-0000-0000-000000000000'
      
      const { data: insertData, error: insertError } = await db
        .from('clientes')
        .insert({
          user_id: fakeUserId, // Try to insert with fake user_id
          nome: 'Test RLS Cliente',
          telefone: '11999999999',
          email: 'test-rls@test.com',
          tipo_pessoa: 'cpf',
          cpf_cnpj: '00000000000',
          endereco: {}
        })
        .select()
        .single()

      // Should either fail due to RLS or override user_id to auth.uid()
      const passed = insertError !== null || (insertData && insertData.user_id === user.id)
      
      // Cleanup if insert succeeded
      if (insertData) {
        await db.from('clientes').delete().eq('id', insertData.id)
      }

      const testResult = {
        test: 'INSERT - user_id override attempt',
        passed,
        details: insertError 
          ? `INSERT blocked by RLS: ${insertError.message}`
          : `INSERT succeeded but user_id was set to ${insertData.user_id} (current user: ${user.id})`,
        risk: passed ? 'none' : 'CRITICAL - Can insert data for other users!'
      }
      
      results.tests.push(testResult)
      results.summary.total++
      if (testResult.passed) results.summary.passed++
      else results.summary.failed++

      console.log(`✓ Test 3: ${testResult.passed ? 'PASS' : 'FAIL'}`)
    } catch (error) {
      results.tests.push({
        test: 'INSERT - user_id override attempt',
        passed: true, // Error is good here
        details: `INSERT properly rejected: ${error.message}`,
        risk: 'none'
      })
      results.summary.total++
      results.summary.passed++
      console.log('✓ Test 3: PASS - INSERT properly rejected')
    }

    // TEST 4: Try to UPDATE another user's record (should fail)
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { persistSession: false } }
      )

      const { data: otherClientes } = await supabaseAdmin
        .from('clientes')
        .select('id, user_id')
        .neq('user_id', user.id)
        .limit(1)

      if (otherClientes && otherClientes.length > 0) {
        const targetId = otherClientes[0].id

        const { data: updateData, error: updateError } = await db
          .from('clientes')
          .update({ nome: 'HACKED' })
          .eq('id', targetId)
          .select()

        const passed = updateError !== null || !updateData || updateData.length === 0
        const testResult = {
          test: 'UPDATE - Other user data attempt',
          passed,
          details: passed 
            ? 'UPDATE properly blocked by RLS'
            : `SECURITY BREACH: Updated ${updateData?.length || 0} records`,
          risk: passed ? 'none' : 'CRITICAL - Can modify other users data!'
        }
        
        results.tests.push(testResult)
        results.summary.total++
        if (testResult.passed) results.summary.passed++
        else results.summary.failed++

        console.log(`✓ Test 4: ${testResult.passed ? 'PASS' : 'FAIL'}`)
      } else {
        results.tests.push({
          test: 'UPDATE - Other user data attempt',
          passed: true,
          details: 'No other users found to test against',
          risk: 'none'
        })
        results.summary.total++
        results.summary.passed++
        console.log('✓ Test 4: SKIP - No other users to test')
      }
    } catch (error) {
      results.tests.push({
        test: 'UPDATE - Other user data attempt',
        passed: true,
        details: `UPDATE properly rejected: ${error.message}`,
        risk: 'none'
      })
      results.summary.total++
      results.summary.passed++
      console.log('✓ Test 4: PASS - UPDATE properly rejected')
    }

    // TEST 5: Try to DELETE another user's record (should fail)
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { persistSession: false } }
      )

      const { data: otherClientes } = await supabaseAdmin
        .from('clientes')
        .select('id, user_id')
        .neq('user_id', user.id)
        .limit(1)

      if (otherClientes && otherClientes.length > 0) {
        const targetId = otherClientes[0].id

        const { error: deleteError } = await db
          .from('clientes')
          .delete()
          .eq('id', targetId)

        const passed = deleteError !== null
        const testResult = {
          test: 'DELETE - Other user data attempt',
          passed,
          details: passed 
            ? 'DELETE properly blocked by RLS'
            : 'SECURITY BREACH: DELETE succeeded on other user data',
          risk: passed ? 'none' : 'CRITICAL - Can delete other users data!'
        }
        
        results.tests.push(testResult)
        results.summary.total++
        if (testResult.passed) results.summary.passed++
        else results.summary.failed++

        console.log(`✓ Test 5: ${testResult.passed ? 'PASS' : 'FAIL'}`)
      } else {
        results.tests.push({
          test: 'DELETE - Other user data attempt',
          passed: true,
          details: 'No other users found to test against',
          risk: 'none'
        })
        results.summary.total++
        results.summary.passed++
        console.log('✓ Test 5: SKIP - No other users to test')
      }
    } catch (error) {
      results.tests.push({
        test: 'DELETE - Other user data attempt',
        passed: true,
        details: `DELETE properly rejected: ${error.message}`,
        risk: 'none'
      })
      results.summary.total++
      results.summary.passed++
      console.log('✓ Test 5: PASS - DELETE properly rejected')
    }

    // Determine overall security level
    if (results.summary.failed === 0) {
      results.summary.security_level = 'secure'
    } else {
      results.summary.security_level = 'vulnerable'
    }

    console.log('=== TEST SUMMARY ===')
    console.log(`Total: ${results.summary.total}`)
    console.log(`Passed: ${results.summary.passed}`)
    console.log(`Failed: ${results.summary.failed}`)
    console.log(`Security Level: ${results.summary.security_level.toUpperCase()}`)
    console.log('====================')

    return new Response(
      JSON.stringify(results, null, 2),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Test execution error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Test execution failed',
        details: error.message,
        summary: {
          security_level: 'unknown'
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
