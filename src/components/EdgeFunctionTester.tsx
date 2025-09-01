import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle, Wifi } from 'lucide-react';

export const EdgeFunctionTester = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<{
    ping?: { success: boolean; message: string; data?: any };
    createSubscription?: { success: boolean; message: string; data?: any };
  }>({});

  const testPing = async () => {
    try {
      console.log('[EdgeFunctionTester] Testing ping function...');
      
      const { data, error } = await supabase.functions.invoke('ping', {
        body: { test: true }
      });

      console.log('[EdgeFunctionTester] Ping response:', { data, error });

      if (error) {
        throw error;
      }

      setResults(prev => ({
        ...prev,
        ping: {
          success: true,
          message: 'Edge Function connectivity successful',
          data
        }
      }));
    } catch (error) {
      console.error('[EdgeFunctionTester] Ping error:', error);
      
      setResults(prev => ({
        ...prev,
        ping: {
          success: false,
          message: error.message || 'Failed to connect to Edge Function',
          data: error
        }
      }));
    }
  };

  const testCreateSubscription = async () => {
    try {
      console.log('[EdgeFunctionTester] Testing create-subscription function...');
      
      // This will fail with auth error, but we can check if the endpoint is reachable
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: { test: true }
      });

      console.log('[EdgeFunctionTester] Create-subscription response:', { data, error });

      // We expect this to fail with auth error, which means the endpoint is working
      if (error && error.message?.includes('Unauthorized')) {
        setResults(prev => ({
          ...prev,
          createSubscription: {
            success: true,
            message: 'Endpoint reachable (Auth required - expected)',
            data: { expectedAuthError: true }
          }
        }));
      } else if (error) {
        throw error;
      } else {
        setResults(prev => ({
          ...prev,
          createSubscription: {
            success: true,
            message: 'Endpoint accessible',
            data
          }
        }));
      }
    } catch (error) {
      console.error('[EdgeFunctionTester] Create-subscription error:', error);
      
      setResults(prev => ({
        ...prev,
        createSubscription: {
          success: false,
          message: error.message || 'Failed to reach create-subscription endpoint',
          data: error
        }
      }));
    }
  };

  const runTests = async () => {
    setTesting(true);
    setResults({});
    
    try {
      await testPing();
      await testCreateSubscription();
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="w-5 h-5" />
          Edge Function Connectivity Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runTests} disabled={testing} className="w-full">
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing Connectivity...
            </>
          ) : (
            'Test Edge Functions'
          )}
        </Button>

        {results.ping && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {results.ping.success ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span className="font-medium">Ping Function</span>
              <Badge variant={results.ping.success ? 'default' : 'destructive'}>
                {results.ping.success ? 'SUCCESS' : 'FAILED'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground pl-6">
              {results.ping.message}
            </p>
            {results.ping.data && (
              <pre className="text-xs bg-muted p-2 rounded overflow-auto pl-6">
                {JSON.stringify(results.ping.data, null, 2)}
              </pre>
            )}
          </div>
        )}

        {results.createSubscription && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {results.createSubscription.success ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span className="font-medium">Create Subscription Function</span>
              <Badge variant={results.createSubscription.success ? 'default' : 'destructive'}>
                {results.createSubscription.success ? 'REACHABLE' : 'FAILED'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground pl-6">
              {results.createSubscription.message}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};