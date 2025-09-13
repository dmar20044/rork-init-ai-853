import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BackendTest() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  // Test the simple hi endpoint
  const hiMutation = trpc.example.hi.useMutation();
  
  const testHiEndpoint = async () => {
    setIsLoading(true);
    addResult('Testing Hi endpoint...');
    
    try {
      const result = await hiMutation.mutateAsync({ name: 'Backend Test' });
      addResult(`✅ Hi endpoint works: ${JSON.stringify(result)}`);
    } catch (error) {
      console.error('Hi endpoint error:', error);
      addResult(`❌ Hi endpoint failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test the food analysis endpoint with a simple test
  const foodAnalysisMutation = trpc.food.analyze.useMutation();
  
  const testFoodAnalysis = async () => {
    setIsLoading(true);
    addResult('Testing Food Analysis endpoint...');
    
    try {
      // Simple base64 test image (1x1 pixel)
      const testImage = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==';
      
      const result = await foodAnalysisMutation.mutateAsync({
        base64Image: testImage
      });
      
      if (result.success) {
        addResult(`✅ Food analysis works: ${result.data?.name || 'Success'}`);
      } else {
        addResult(`❌ Food analysis failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Food analysis error:', error);
      addResult(`❌ Food analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDirectAPI = async () => {
    setIsLoading(true);
    addResult('Testing direct API calls...');
    
    const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
    addResult(`Using backend URL: ${baseUrl}`);
    
    try {
      // Test basic connectivity
      const response = await fetch(`${baseUrl}`);
      const text = await response.text();
      addResult(`✅ Basic connectivity: ${response.status} ${response.statusText}`);
      
      // Test API endpoint
      const apiResponse = await fetch(`${baseUrl}/api`);
      const apiData = await apiResponse.json();
      addResult(`✅ API endpoint: ${apiData.message || 'Success'}`);
      
      // Test debug endpoint
      const debugResponse = await fetch(`${baseUrl}/debug`);
      const debugData = await debugResponse.json();
      addResult(`✅ Debug endpoint: ${debugData.status}`);
      
    } catch (error) {
      addResult(`❌ Direct API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testRorkAI = async () => {
    setIsLoading(true);
    addResult('Testing Rork AI API...');
    
    try {
      // Test direct Rork AI
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'Hello, please respond with "Rork API working"'
            }
          ]
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        addResult(`✅ Rork AI Direct: ${result.completion || 'Success'}`);
      } else {
        addResult(`❌ Rork AI Direct: ${response.status} ${response.statusText}`);
      }
      
      // Test backend Rork AI endpoint
      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
      const backendResponse = await fetch(`${baseUrl}/test-rork-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Test from backend test'
        })
      });
      
      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        addResult(`✅ Backend Rork AI: ${backendData.success ? 'Working' : 'Failed'}`);
      } else {
        addResult(`❌ Backend Rork AI: ${backendResponse.status} ${backendResponse.statusText}`);
      }
      
    } catch (error) {
      addResult(`❌ Rork AI test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runAllTests = async () => {
    setTestResults([]);
    addResult('Starting comprehensive backend tests...');
    
    await testDirectAPI();
    await testHiEndpoint();
    await testRorkAI();
    await testFoodAnalysis();
    
    addResult('All tests completed!');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const showEnvironment = () => {
    Alert.alert(
      'Environment Info',
      `Backend URL: ${process.env.EXPO_PUBLIC_RORK_API_BASE_URL}\n\nSupabase URL: ${process.env.EXPO_PUBLIC_SUPABASE_URL}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Backend Test' }} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Backend Connection Test</Text>
        <Text style={styles.subtitle}>Test all backend endpoints and connections</Text>
      </View>
      
      <View style={styles.buttonGrid}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]} 
          onPress={runAllTests}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Run All Tests</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton, isLoading && styles.buttonDisabled]} 
          onPress={testHiEndpoint}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Hi</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton, isLoading && styles.buttonDisabled]} 
          onPress={testDirectAPI}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test API</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton, isLoading && styles.buttonDisabled]} 
          onPress={testRorkAI}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Rork AI</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton, isLoading && styles.buttonDisabled]} 
          onPress={testFoodAnalysis}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Food Analysis</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.infoButton]} 
          onPress={showEnvironment}
        >
          <Text style={styles.buttonText}>Show Config</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={clearResults}
        >
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>
      </View>
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loading}>Testing...</Text>
        </View>
      )}
      
      <ScrollView style={styles.resultsContainer}>
        {testResults.map((result, index) => (
          <View key={index} style={styles.resultItem}>
            <Text style={[
              styles.resultText,
              result.includes('❌') && styles.errorText,
              result.includes('✅') && styles.successText
            ]}>
              {result}
            </Text>
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
    backgroundColor: '#fff',
    padding: 20,
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
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 10,
  },
  button: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    minWidth: '100%',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  infoButton: {
    backgroundColor: '#FF9500',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loading: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  resultsContainer: {
    flex: 1,
    padding: 20,
  },
  resultItem: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#e0e0e0',
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
  },
  errorText: {
    color: '#d32f2f',
  },
  successText: {
    color: '#2e7d32',
  },
});