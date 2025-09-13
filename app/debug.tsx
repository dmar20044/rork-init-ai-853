import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { trpcClient } from '@/lib/trpc';
import { Stack } from 'expo-router';
import { testOpenFoodFactsAPI, testSpecificBarcode, lookupProductByBarcode } from '@/services/barcodeScanner';

export default function DebugScreen() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState<string>('3017620422003'); // Default to Nutella barcode
  const [barcodeTestResult, setBarcodeTestResult] = useState<string>('');
  const [barcodeTestData, setBarcodeTestData] = useState<any>(null);

  const addResult = (test: string, result: any, error?: any) => {
    setTestResults(prev => [...prev, {
      test,
      result,
      error,
      timestamp: new Date().toISOString()
    }]);
  };

  const testBackendConnection = async () => {
    setIsLoading(true);
    try {
      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
      addResult('Environment Variable', { 
        baseUrl,
        timestamp: new Date().toISOString(),
        platform: Platform.OS
      });

      // Test basic connectivity first
      try {
        console.log('Testing basic connectivity to:', baseUrl);
        const connectivityResponse = await fetch(`${baseUrl}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'RorkMobileApp/1.0'
          }
        });
        const connectivityData = await connectivityResponse.text();
        addResult('Basic Connectivity Test', { 
          status: connectivityResponse.status, 
          statusText: connectivityResponse.statusText,
          headers: Object.fromEntries(connectivityResponse.headers.entries()),
          bodyPreview: connectivityData.substring(0, 200) + (connectivityData.length > 200 ? '...' : ''),
          url: baseUrl
        });
      } catch (error) {
        console.error('Basic connectivity test failed:', error);
        addResult('Basic Connectivity Test', null, { 
          message: error instanceof Error ? error.message : 'Unknown error',
          type: error instanceof TypeError ? 'Network Error' : 'Other Error',
          stack: error instanceof Error ? error.stack : undefined
        });
      }

      // Test basic API endpoint
      try {
        const response = await fetch(`${baseUrl}/api`);
        const data = await response.json();
        addResult('Basic API Test', { status: response.status, data });
      } catch (error) {
        addResult('Basic API Test', null, { 
          message: error instanceof Error ? error.message : 'Unknown error',
          type: error instanceof TypeError ? 'Network Error' : 'Other Error'
        });
      }

      // Test debug endpoint
      try {
        const debugResponse = await fetch(`${baseUrl}/api/debug`);
        const debugData = await debugResponse.json();
        addResult('Debug Endpoint Test', { status: debugResponse.status, data: debugData });
      } catch (error) {
        addResult('Debug Endpoint Test', null, { 
          message: error instanceof Error ? error.message : 'Unknown error',
          type: error instanceof TypeError ? 'Network Error' : 'Other Error'
        });
      }

      // Test tRPC basic endpoint
      try {
        const hiResult = await trpcClient.example.hi.mutate({ name: 'Debug Test' });
        addResult('tRPC Basic Test', hiResult);
      } catch (error) {
        addResult('tRPC Basic Test', null, { 
          message: error instanceof Error ? error.message : 'Unknown error',
          type: error instanceof TypeError ? 'Network Error' : 'Other Error'
        });
      }

      // Test backend Rork AI endpoint
      try {
        const rorkTestResponse = await fetch(`${baseUrl}/api/test-rork-ai`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Hello from debug test'
          })
        });
        
        if (rorkTestResponse.ok) {
          const rorkTestData = await rorkTestResponse.json();
          addResult('Backend Rork AI Test', { status: rorkTestResponse.status, data: rorkTestData });
        } else {
          const errorText = await rorkTestResponse.text();
          addResult('Backend Rork AI Test', null, {
            status: rorkTestResponse.status,
            error: errorText
          });
        }
      } catch (error) {
        addResult('Backend Rork AI Test', null, { 
          message: error instanceof Error ? error.message : 'Unknown error',
          type: error instanceof TypeError ? 'Network Error' : 'Other Error'
        });
      }

      // Test tRPC food analysis endpoint
      try {
        // Simple 1x1 pixel red image in base64
        const testImage = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==';
        
        const analysisResult = await trpcClient.food.analyze.mutate({
          base64Image: testImage
        });
        addResult('tRPC Food Analysis Test', analysisResult);
      } catch (error) {
        addResult('tRPC Food Analysis Test', null, { 
          message: error instanceof Error ? error.message : 'Unknown error',
          type: error instanceof TypeError ? 'Network Error' : 'Other Error'
        });
      }

    } catch (error) {
      addResult('Backend Connection', null, error);
    } finally {
      setIsLoading(false);
    }
  };

  const testRorkAPI = async () => {
    setIsLoading(true);
    try {
      // Test direct Rork AI API call (no API key needed!)
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'Hello, this is a test message. Please respond with "Rork API test successful".'
            }
          ]
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        addResult('Direct Rork AI API Test', null, {
          status: response.status,
          error: errorText,
          headers: Object.fromEntries(response.headers.entries())
        });
      } else {
        const result = await response.json();
        addResult('Direct Rork AI API Test', { status: response.status, result });
      }
      
    } catch (error) {
      addResult('Direct Rork AI API Test', null, { 
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof TypeError ? 'Network Error' : 'Other Error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testNetworkConnectivity = async () => {
    setIsLoading(true);
    try {
      // Test basic internet connectivity
      const googleResponse = await fetch('https://www.google.com', { method: 'HEAD' });
      addResult('Internet Connectivity', { 
        status: googleResponse.status, 
        success: googleResponse.ok 
      });
      
      // Test HTTPS connectivity
      const httpsResponse = await fetch('https://httpbin.org/get');
      const httpsData = httpsResponse.ok ? await httpsResponse.json() : null;
      addResult('HTTPS Connectivity', { 
        status: httpsResponse.status, 
        success: httpsResponse.ok,
        data: httpsData
      });
      
    } catch (error) {
      addResult('Network Connectivity Test', null, { 
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof TypeError ? 'Network Error' : 'Other Error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testBarcode = async () => {
    if (!barcodeInput.trim()) {
      setBarcodeTestResult('❌ Please enter a barcode');
      return;
    }

    setBarcodeTestResult('Testing barcode...');
    setBarcodeTestData(null);
    setIsLoading(true);
    
    try {
      const result = await testSpecificBarcode(barcodeInput.trim());
      setBarcodeTestResult(`${result.success ? '✅' : '❌'} ${result.message}`);
      if (result.success && result.data) {
        setBarcodeTestData(result.data);
      }
      
      // Also add to main results
      addResult(`Barcode Test: ${barcodeInput.trim()}`, result.data, result.success ? null : result.message);
    } catch (error) {
      const errorMsg = `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setBarcodeTestResult(errorMsg);
      addResult(`Barcode Test: ${barcodeInput.trim()}`, null, error);
    } finally {
      setIsLoading(false);
    }
  };

  const testOpenFoodFacts = async () => {
    setBarcodeTestResult('Testing OpenFoodFacts API...');
    setBarcodeTestData(null);
    setIsLoading(true);
    
    try {
      const result = await testOpenFoodFactsAPI();
      setBarcodeTestResult(`${result.success ? '✅' : '❌'} ${result.message}`);
      
      // Also add to main results
      addResult('OpenFoodFacts API Test', { success: result.success, message: result.message }, result.success ? null : result.message);
    } catch (error) {
      const errorMsg = `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setBarcodeTestResult(errorMsg);
      addResult('OpenFoodFacts API Test', null, error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Debug Console' }} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Backend Debug Console</Text>
        <Text style={styles.subtitle}>Test your backend connection and API endpoints</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.testButton]} 
          onPress={testBackendConnection}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Testing...' : 'Run All Tests'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={clearResults}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.rorkButton]} 
          onPress={testRorkAPI}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Testing...' : 'Test Rork AI API'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.networkButton]} 
          onPress={testNetworkConnectivity}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Testing...' : 'Test Network'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Barcode Testing Section */}
      <View style={styles.barcodeSection}>
        <Text style={styles.sectionTitle}>Test Barcode Lookup</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter barcode (e.g., 3017620422003)"
          value={barcodeInput}
          onChangeText={setBarcodeInput}
          keyboardType="numeric"
        />
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.barcodeButton]} 
            onPress={testBarcode}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Testing...' : 'Test Barcode'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.offButton]} 
            onPress={testOpenFoodFacts}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Testing...' : 'Test OpenFoodFacts'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {barcodeTestResult && (
          <View style={styles.barcodeResult}>
            <Text style={styles.resultLabel}>Barcode Test Result:</Text>
            <Text style={styles.resultText}>{barcodeTestResult}</Text>
          </View>
        )}
        
        {barcodeTestData && (
          <View style={styles.dataContainer}>
            <Text style={styles.dataTitle}>Product Data:</Text>
            <ScrollView style={styles.dataScroll}>
              <Text style={styles.dataText}>{JSON.stringify(barcodeTestData, null, 2)}</Text>
            </ScrollView>
          </View>
        )}
      </View>

      <ScrollView style={styles.resultsContainer}>
        {testResults.map((result, index) => (
          <View key={index} style={styles.resultItem}>
            <Text style={styles.testName}>{result.test}</Text>
            <Text style={styles.timestamp}>{new Date(result.timestamp).toLocaleTimeString()}</Text>
            
            {result.error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorLabel}>ERROR:</Text>
                <Text style={styles.errorText}>{JSON.stringify(result.error, null, 2)}</Text>
              </View>
            ) : (
              <View style={styles.successContainer}>
                <Text style={styles.successLabel}>SUCCESS:</Text>
                <Text style={styles.resultText}>{JSON.stringify(result.result, null, 2)}</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: '#007AFF',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  rorkButton: {
    backgroundColor: '#34C759',
  },
  networkButton: {
    backgroundColor: '#FF9500',
  },
  barcodeButton: {
    backgroundColor: '#5856D6',
  },
  offButton: {
    backgroundColor: '#AF52DE',
  },
  barcodeSection: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  barcodeResult: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  dataContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    maxHeight: 300,
  },
  dataTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  dataScroll: {
    maxHeight: 250,
  },
  dataText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#666',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    padding: 20,
  },
  resultItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  testName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  successContainer: {
    backgroundColor: '#e8f5e8',
    padding: 10,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  errorLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 5,
  },
  successLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 5,
  },
  errorText: {
    fontSize: 12,
    color: '#d32f2f',
    fontFamily: 'monospace',
  },
  resultText: {
    fontSize: 12,
    color: '#2e7d32',
    fontFamily: 'monospace',
  },
});