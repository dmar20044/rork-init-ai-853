import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { trpcClient } from '@/lib/trpc';
import { Stack } from 'expo-router';

export default function DebugScreen() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
      addResult('Environment Variable', { baseUrl });

      // Test basic connectivity first
      try {
        const connectivityResponse = await fetch(`${baseUrl}`);
        const connectivityData = await connectivityResponse.text();
        addResult('Basic Connectivity Test', { 
          status: connectivityResponse.status, 
          headers: Object.fromEntries(connectivityResponse.headers.entries()),
          bodyPreview: connectivityData.substring(0, 200) + (connectivityData.length > 200 ? '...' : '')
        });
      } catch (error) {
        addResult('Basic Connectivity Test', null, { 
          message: error instanceof Error ? error.message : 'Unknown error',
          type: error instanceof TypeError ? 'Network Error' : 'Other Error'
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
        const debugResponse = await fetch(`${baseUrl}/debug`);
        const debugData = await debugResponse.json();
        addResult('Debug Endpoint Test', { status: debugResponse.status, data: debugData });
      } catch (error) {
        addResult('Debug Endpoint Test', null, { 
          message: error instanceof Error ? error.message : 'Unknown error',
          type: error instanceof TypeError ? 'Network Error' : 'Other Error'
        });
      }

      // Test food analysis endpoint with a simple base64 image
      try {
        // Simple 1x1 pixel red image in base64
        const testImage = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==';
        
        const response = await fetch(`${baseUrl}/api/analyze-food`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            base64Image: testImage,
            userGoals: {
              healthGoal: 'general-health'
            }
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          addResult('Food Analysis Test', null, {
            status: response.status,
            error: errorText,
            headers: Object.fromEntries(response.headers.entries())
          });
        } else {
          const analysisResult = await response.json();
          addResult('Food Analysis Test', analysisResult);
        }
      } catch (error) {
        addResult('Food Analysis Test', null, { 
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

  const testAnthropicAPI = async () => {
    setIsLoading(true);
    try {
      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
      
      // Test direct Anthropic API call through our backend
      const response = await fetch(`${baseUrl}/api/test-anthropic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Hello, this is a test message'
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        addResult('Direct Anthropic API Test', null, {
          status: response.status,
          error: errorText,
          headers: Object.fromEntries(response.headers.entries())
        });
      } else {
        const result = await response.json();
        addResult('Direct Anthropic API Test', { status: response.status, result });
      }
      
    } catch (error) {
      addResult('Direct Anthropic API Test', null, { 
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
          style={[styles.button, styles.anthropicButton]} 
          onPress={testAnthropicAPI}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Testing...' : 'Test Anthropic API'}
          </Text>
        </TouchableOpacity>
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
  anthropicButton: {
    backgroundColor: '#34C759',
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