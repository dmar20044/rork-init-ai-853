import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { trpc } from '@/lib/trpc';

export default function BackendTest() {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Test the simple hi endpoint
  const hiMutation = trpc.example.hi.useMutation();
  
  const testHiEndpoint = async () => {
    setIsLoading(true);
    setTestResult('');
    
    try {
      const result = await hiMutation.mutateAsync({ name: 'Backend Test' });
      setTestResult(`✅ Hi endpoint works: ${JSON.stringify(result)}`);
    } catch (error) {
      console.error('Hi endpoint error:', error);
      setTestResult(`❌ Hi endpoint failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test the food analysis endpoint with a simple test
  const foodAnalysisMutation = trpc.food.analyze.useMutation();
  
  const testFoodAnalysis = async () => {
    setIsLoading(true);
    setTestResult('');
    
    try {
      // Simple base64 test image (1x1 pixel)
      const testImage = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==';
      
      const result = await foodAnalysisMutation.mutateAsync({
        base64Image: testImage,
        userGoals: {
          healthGoal: 'general-health'
        }
      });
      
      setTestResult(`✅ Food analysis works: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      console.error('Food analysis error:', error);
      setTestResult(`❌ Food analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Backend Test' }} />
      
      <Text style={styles.title}>Backend Connection Test</Text>
      
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={testHiEndpoint}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>Test Hi Endpoint</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={testFoodAnalysis}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>Test Food Analysis</Text>
      </TouchableOpacity>
      
      {isLoading && (
        <Text style={styles.loading}>Testing...</Text>
      )}
      
      {testResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{testResult}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  loading: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginVertical: 20,
  },
  resultContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});