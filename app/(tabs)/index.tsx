import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Camera, Image as ImageIcon, X, Upload, Scan, ImageIcon as LibraryIcon, Zap, ZapOff, QrCode, CheckCircle, XCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { analyzeFoodImageWithPersonalization, NutritionInfo, clearAnalysisCache, checkAPIStatus } from "@/services/foodAnalysis";
import { scanBarcodeFromImage, convertBarcodeToNutrition, showBarcodeScanningInstructions, lookupProductByBarcode } from "@/services/barcodeScanner";
import { useScanHistory } from "@/contexts/ScanHistoryContext";
import { useUser } from "@/contexts/UserContext";
import PremiumScanFeedback from "@/components/PremiumScanFeedback";
import LoadingScreen from "@/components/LoadingScreen";

import TabSlideView from "@/components/TabSlideView";

export default function ScannerScreen() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [showCamera, setShowCamera] = useState(true);
  const [nutritionData, setNutritionData] = useState<NutritionInfo | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  const [isBarcodeMode, setIsBarcodeMode] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [scanCooldown, setScanCooldown] = useState(false);
  const [apiStatus, setApiStatus] = useState<{ aiAPI: boolean; openFoodFacts: boolean } | null>(null);
  const [showApiTest, setShowApiTest] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { addToHistory } = useScanHistory();
  const { profile, updateScanStreak } = useUser();

  // Test API status on component mount
  useEffect(() => {
    testAPIs();
  }, []);

  const testAPIs = async () => {
    console.log('Testing API connections...');
    try {
      const status = await checkAPIStatus();
      setApiStatus(status);
      console.log('API Status Results:', status);
    } catch (error) {
      console.error('Error testing APIs:', error);
      setApiStatus({ aiAPI: false, openFoodFacts: false });
    }
  };

  const handleBarcodeScanned = async ({ type, data }: BarcodeScanningResult) => {
    if (isScanning || scanCooldown || isProcessing) return; // Prevent multiple scans
    
    console.log('Barcode scanned:', { type, data });
    
    // Validate barcode data
    if (!data || data.trim().length === 0) {
      console.log('Invalid barcode data received');
      return;
    }
    
    // Check if barcode looks valid (basic validation)
    const cleanBarcode = data.trim();
    if (cleanBarcode.length < 8 || cleanBarcode.length > 18) {
      console.log('Barcode length seems invalid:', cleanBarcode.length);
      setAnalysisError('Invalid barcode format detected');
      setTimeout(() => {
        setAnalysisError(null);
      }, 2000);
      return;
    }
    
    // Check if this is the same barcode we just scanned (prevent duplicate scans)
    if (lastScannedBarcode === cleanBarcode) {
      console.log('Same barcode scanned again, ignoring');
      return;
    }
    
    // Set all blocking states immediately to prevent duplicate scans
    setIsScanning(true);
    setIsProcessing(true);
    setScanProgress(0);
    setLastScannedBarcode(cleanBarcode);
    setScanCooldown(true);
    
    console.log('Barcode scan started for:', cleanBarcode);
    
    // Set a cooldown period to prevent rapid re-scanning
    setTimeout(() => {
      setScanCooldown(false);
      console.log('Barcode scan cooldown ended');
    }, 5000); // 5 second cooldown (increased from 3)
    
    try {
      if (Platform.OS !== "web") {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (hapticError) {
          console.log('Haptics not available:', hapticError);
        }
      }
      
      // Step 1: Reading barcode (25%)
      console.log('Scanner: Setting barcode progress to 25%');
      setScanProgress(25);
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Step 2: Looking up product (60%)
      console.log('Scanner: Setting barcode progress to 60%');
      setScanProgress(60);
      const barcodeResult = await lookupProductByBarcode(cleanBarcode);
      
      // Step 3: Processing complete (100%)
      console.log('Scanner: Setting barcode progress to 100%');
      setScanProgress(100);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (barcodeResult.success && barcodeResult.data) {
        // Convert barcode data to nutrition format with user goals for personalization
        const nutritionData = convertBarcodeToNutrition(
          barcodeResult.data,
          profile.hasCompletedQuiz ? profile.goals : undefined
        );
        
        if (nutritionData) {
          setNutritionData(nutritionData);
          // Use the product image URL if available, otherwise use a placeholder
          setCapturedImage(nutritionData.imageUrl || 'barcode-scan');
          console.log('Barcode scan: Setting capturedImage to', nutritionData.imageUrl || 'barcode-scan');
          console.log('Barcode scan successful:', nutritionData);
          
          // Automatically add to history when scan is successful (but not for unknown items)
          if (nutritionData.name !== 'Unknown Food Item' && !nutritionData.name.includes('Unknown')) {
            try {
              await addToHistory({
                nutrition: nutritionData,
                imageUri: nutritionData.imageUrl || '', // Use product image URL if available
              });
              console.log('Barcode scan automatically saved to history');
              
              // Update scan streak and total scans counter
              await updateScanStreak(nutritionData.healthScore || 0);
              console.log('Scan streak updated for barcode scan');

            } catch (historyError) {
              console.error('Error saving barcode scan to history:', historyError);
              // Don't show error to user since the main scan was successful
            }
          } else {
            console.log('Unknown food item detected, not adding to history:', nutritionData.name);
            
            // Still update scan streak for unknown items (user attempted a scan)
            try {
              await updateScanStreak(nutritionData.healthScore || 0);
              console.log('Scan streak updated for unknown barcode item');
            } catch (streakError) {
              console.error('Error updating scan streak:', streakError);
            }
          }
          
          // Live barcode scan completed successfully - the LoadingScreen onComplete will handle UI transition
          console.log('Live barcode scan completed successfully, waiting for LoadingScreen onComplete');
        } else {
          // Failed to process barcode data - stay on camera
          setAnalysisError('Failed to process barcode data');
          setIsScanning(false);
          setIsProcessing(false);
          setScanProgress(0);
          setLastScannedBarcode(null); // Reset so user can try again
          // Show temporary error message but stay on camera
          setTimeout(() => {
            setAnalysisError(null);
          }, 3000);
        }
      } else {
        // Product not found - stay on camera
        console.error('Barcode lookup failed:', barcodeResult.error);
        setIsScanning(false);
        setIsProcessing(false);
        setScanProgress(0);
        setLastScannedBarcode(null); // Reset so user can try again
        // Show temporary error message but stay on camera
        setAnalysisError(barcodeResult.error || 'Product not found in database');
        setTimeout(() => {
          setAnalysisError(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error processing barcode:', error);
      setIsScanning(false);
      setIsProcessing(false);
      setScanProgress(0);
      setLastScannedBarcode(null); // Reset so user can try again
      // Show temporary error message but stay on camera
      setAnalysisError('An unexpected error occurred while processing the barcode');
      setTimeout(() => {
        setAnalysisError(null);
      }, 3000);
    }
  };

  const handleTakePicture = async () => {
    if (!cameraRef.current) return;
    
    // If in barcode mode, don't take picture - scanning is automatic
    if (isBarcodeMode) {
      Alert.alert(
        'Automatic Scanning Active',
        'Barcode scanning is automatic. Just position a barcode in the frame and it will be detected automatically.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    try {
      if (Platform.OS !== "web") {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (hapticError) {
          console.log('Haptics not available:', hapticError);
        }
      }
      
      setIsProcessing(true);
      setScanProgress(0);
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8, // Reduced quality for better performance
        base64: false,
        skipProcessing: false,
      });
      
      if (photo?.uri) {
        setCapturedImage(photo.uri);
        console.log("Photo captured:", photo.uri);
        
        // Analyze the image with AI
        await analyzeImage(photo.uri);
      } else {
        throw new Error('No photo URI received');
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      Alert.alert("Error", "Failed to capture image. Please try again.");
      setIsProcessing(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request media library permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your photo library to select images.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false, // Don't include base64 to reduce memory usage
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets?.[0]?.uri) {
        if (Platform.OS !== "web") {
          try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch (hapticError) {
            console.log('Haptics not available:', hapticError);
          }
        }
        
        const imageUri = result.assets[0].uri;
        console.log('Selected image URI:', imageUri);
        
        // Validate the image URI exists and is accessible
        if (!imageUri || imageUri.trim() === '') {
          throw new Error('Invalid image URI received');
        }
        
        setCapturedImage(imageUri);
        setIsProcessing(true);
        setScanProgress(0);
        
        // Analyze the image with AI
        await analyzeImage(imageUri);
      } else {
        console.log('Image selection was canceled or no image selected');
      }
    } catch (error) {
      console.error("Error picking image:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        "Error", 
        `Failed to pick image: ${errorMessage}. Please try again.`
      );
    }
  };

  const analyzeImage = async (imageUri: string) => {
    try {
      setAnalysisError(null);
      
      if (isBarcodeMode) {
        console.log('Starting barcode scanning for:', imageUri);
        
        // Step 1: Processing image (20%)
        console.log('Scanner: Setting barcode image progress to 20%');
        setScanProgress(20);
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // Step 2: Scanning barcode (65%)
        console.log('Scanner: Setting barcode image progress to 65%');
        setScanProgress(65);
        const barcodeResult = await scanBarcodeFromImage(imageUri);
        
        // Step 3: Complete (100%)
        console.log('Scanner: Setting barcode image progress to 100%');
        setScanProgress(100);
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (barcodeResult.success && barcodeResult.data) {
          // Convert barcode data to nutrition format with user goals for personalization
          const nutritionData = convertBarcodeToNutrition(
            barcodeResult.data,
            profile.hasCompletedQuiz ? profile.goals : undefined
          );
          
          if (nutritionData) {
            setNutritionData(nutritionData);
            console.log('Barcode scan successful:', nutritionData);
            
            // Automatically add to history when scan is successful (but not for unknown items)
            if (nutritionData.name !== 'Unknown Food Item' && !nutritionData.name.includes('Unknown')) {
              try {
                await addToHistory({
                  nutrition: nutritionData,
                  imageUri: nutritionData.imageUrl || imageUri, // Use product image URL if available, otherwise use captured image
                });
                console.log('Barcode scan automatically saved to history');
                
                // Update scan streak and total scans counter
                await updateScanStreak(nutritionData.healthScore || 0);
                console.log('Scan streak updated for barcode scan from image');

              } catch (historyError) {
                console.error('Error saving barcode scan to history:', historyError);
                // Don't show error to user since the main scan was successful
              }
            } else {
              console.log('Unknown food item detected, not adding to history:', nutritionData.name);
              
              // Still update scan streak for unknown items (user attempted a scan)
              try {
                await updateScanStreak(nutritionData.healthScore || 0);
                console.log('Scan streak updated for unknown barcode item from image');
              } catch (streakError) {
                console.error('Error updating scan streak:', streakError);
              }
            }
            
            // Barcode scan from image completed successfully - the LoadingScreen onComplete will handle UI transition
            console.log('Barcode scan from image completed successfully, waiting for LoadingScreen onComplete');
          } else {
            setAnalysisError('Failed to process barcode data');
            setScanProgress(0);
            setIsProcessing(false); // Set processing to false on error
          }
        } else {
          setAnalysisError(barcodeResult.error || 'Failed to scan barcode');
          console.error('Barcode scan failed:', barcodeResult.error);
          setScanProgress(0);
          setIsProcessing(false); // Set processing to false on error
        }
      } else {
        console.log('Starting AI analysis for:', imageUri);
        
        // Step 1: Processing image (20%)
        console.log('Scanner: Setting AI analysis progress to 20%');
        setScanProgress(20);
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // Clear cache to ensure fresh analysis (temporary debugging measure)
        console.log('Clearing analysis cache to ensure fresh analysis');
        await clearAnalysisCache();
        
        // Step 2: AI analysis (70%)
        console.log('Scanner: Setting AI analysis progress to 70%');
        setScanProgress(70);
        
        // Use personalized analysis if user has completed quiz
        const result = profile.hasCompletedQuiz 
          ? await analyzeFoodImageWithPersonalization(imageUri, profile.goals)
          : await analyzeFoodImageWithPersonalization(imageUri);
        
        // Step 3: Complete (100%)
        console.log('Scanner: Setting AI analysis progress to 100%');
        setScanProgress(100);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (result.success && result.data) {
          setNutritionData(result.data);
          console.log('Analysis successful:', result.data);
          
          // Automatically add to history when scan is successful (but not for unknown items)
          if (result.data.name !== 'Unknown Food Item' && !result.data.name.includes('Unknown')) {
            try {
              await addToHistory({
                nutrition: result.data,
                imageUri: imageUri,
              });
              console.log('Scan automatically saved to history');
              
              // Update scan streak and total scans counter
              await updateScanStreak(result.data.healthScore || 0);
              console.log('Scan streak updated for AI analysis');

            } catch (historyError) {
              console.error('Error saving to history:', historyError);
              // Don't show error to user since the main scan was successful
            }
          } else {
            console.log('Unknown food item detected, not adding to history:', result.data.name);
            
            // Still update scan streak for unknown items (user attempted a scan)
            try {
              await updateScanStreak(result.data.healthScore || 0);
              console.log('Scan streak updated for unknown AI analysis item');
            } catch (streakError) {
              console.error('Error updating scan streak:', streakError);
            }
          }
          
          // AI analysis completed successfully - the LoadingScreen onComplete will handle UI transition
          console.log('AI analysis completed successfully, waiting for LoadingScreen onComplete');
        } else {
          setAnalysisError(result.error || 'Failed to analyze image');
          console.error('Analysis failed:', result.error);
          setScanProgress(0);
          setIsProcessing(false); // Set processing to false on error
        }
      }
    } catch (error) {
      console.error('Error during analysis:', error);
      setAnalysisError('An unexpected error occurred during analysis');
      setScanProgress(0);
      setIsProcessing(false); // Set processing to false on error
    } finally {
      // Only set isProcessing to false if there was an error
      // Success cases are handled by LoadingScreen onComplete
      console.log('Analysis finally block completed');
    }
  };

  const handleScanAnother = () => {
    setCapturedImage(null);
    setNutritionData(null);
    setAnalysisError(null);
    setIsProcessing(false);
    setIsScanning(false);
    setScanProgress(0);
    setIsBarcodeMode(false); // Reset barcode mode
    setLastScannedBarcode(null); // Reset last scanned barcode
    setScanCooldown(false); // Reset cooldown
  };

  const handleSaveToHistory = async () => {
    // This function is now mainly for manual re-saving if needed
    // Since we auto-save, we'll just show a confirmation
    Alert.alert(
      'Already Saved!',
      'This scan has been automatically saved to your history.',
      [{ text: 'OK' }]
    );
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === "back" ? "front" : "back"));
  };

  const toggleFlash = () => {
    const newMode = flashMode === 'off' ? 'on' : 'off';
    setFlashMode(newMode);
    console.log('Flash toggled from', flashMode, 'to', newMode);
    
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (hapticError) {
        console.log('Haptics not available:', hapticError);
      }
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
        <View style={styles.permissionCard}>
          <Camera size={48} color={Colors.primary} />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            InIt AI needs permission to access camera
          </Text>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={async () => {
              try {
                const result = await requestPermission();
                if (result.granted) {
                  setShowCamera(true);
                } else {
                  Alert.alert(
                    'Permission Denied',
                    'Camera access is required to scan food items. Please enable camera permission in your device settings.',
                    [{ text: 'OK' }]
                  );
                }
              } catch (error) {
                console.error('Error requesting camera permission:', error);
                Alert.alert(
                  'Permission Error',
                  'There was an issue requesting camera permission. Please try again.',
                  [{ text: 'OK' }]
                );
              }
            }}
          >
            <Text style={styles.primaryButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={pickImage}
          >
            <Text style={styles.secondaryButtonText}>Choose from Library</Text>
          </TouchableOpacity>
        </View>
        </View>
      </SafeAreaView>
    );
  }

  // Always show camera as the main interface
  return (
    <TabSlideView index={0} testID="tab-scanner">
      <View style={styles.cameraContainer}>
      <CameraView 
        ref={cameraRef}
        style={styles.camera} 
        facing={facing}
        flash={flashMode}
        enableTorch={flashMode === 'on'}
        barcodeScannerSettings={isBarcodeMode ? {
          barcodeTypes: ['qr', 'pdf417', 'aztec', 'ean13', 'ean8', 'upc_e', 'datamatrix', 'code128', 'code39', 'code93', 'codabar', 'itf14', 'upc_a'],
        } : undefined}
        onBarcodeScanned={isBarcodeMode ? handleBarcodeScanned : undefined}
      >
          <View style={styles.cameraOverlay}>
            
            <View style={styles.scannerContent}>
              <View style={styles.scannerHeader}>
                <Text style={styles.scannerBranding}>InIt AI</Text>
              </View>
              
              {/* API Status Display */}
              {showApiTest && apiStatus && (
                <View style={styles.apiStatusContainer}>
                  <View style={styles.apiStatusItem}>
                    {apiStatus.aiAPI ? (
                      <CheckCircle size={16} color="#4CAF50" />
                    ) : (
                      <XCircle size={16} color="#F44336" />
                    )}
                    <Text style={styles.apiStatusText}>
                      AI API: {apiStatus.aiAPI ? 'Working' : 'Failed'}
                    </Text>
                  </View>
                  <View style={styles.apiStatusItem}>
                    {apiStatus.openFoodFacts ? (
                      <CheckCircle size={16} color="#4CAF50" />
                    ) : (
                      <XCircle size={16} color="#F44336" />
                    )}
                    <Text style={styles.apiStatusText}>
                      OpenFoodFacts: {apiStatus.openFoodFacts ? 'Working' : 'Failed'}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.retestButton} onPress={testAPIs}>
                    <Text style={styles.retestButtonText}>Retest APIs</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              <View style={styles.scanFrame}>
                <View style={[styles.scanCorner, styles.scanCornerTL]} />
                <View style={[styles.scanCorner, styles.scanCornerTR]} />
                <View style={[styles.scanCorner, styles.scanCornerBL]} />
                <View style={[styles.scanCorner, styles.scanCornerBR]} />
              </View>
              
              <Text style={styles.scanHint}>
                {isBarcodeMode ? (isScanning ? 'Scanning...' : 'Position barcode within frame - automatic detection') : 'Position food item within frame'}
              </Text>
              
              {analysisError && isBarcodeMode && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{analysisError}</Text>
                </View>
              )}
              
              {isBarcodeMode && (
                <View style={styles.scanningIndicator}>
                  <View style={[styles.scanningLine, isScanning && styles.scanningLineActive]} />
                </View>
              )}
              
              <View style={styles.cameraControls}>
                <TouchableOpacity 
                  style={styles.libraryButton} 
                  onPress={pickImage}
                >
                  <LibraryIcon size={24} color={Colors.white} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.captureButton, isBarcodeMode && styles.captureButtonDisabled]} 
                  onPress={handleTakePicture}
                  disabled={isProcessing || isBarcodeMode}
                >
                  <View style={[styles.captureButtonInner, isBarcodeMode && styles.captureButtonInnerDisabled]} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.flashButton, flashMode === 'on' && styles.flashButtonActive]} 
                  onPress={toggleFlash}
                >
                  {flashMode === 'on' ? (
                    <Zap size={24} color={Colors.primary} />
                  ) : (
                    <ZapOff size={24} color={Colors.white} />
                  )}
                </TouchableOpacity>
              </View>
              
              <View style={styles.barcodeContainer}>
                <TouchableOpacity 
                  style={[styles.barcodeButton, isBarcodeMode && styles.barcodeButtonActive]}
                  onPress={() => {
                    if (!isBarcodeMode) {
                      Alert.alert(
                        'Automatic Barcode Scanning',
                        'When barcode mode is active, the camera will automatically detect and scan barcodes. No need to take a picture!',
                        [{ text: 'Got it' }]
                      );
                    }
                    setIsBarcodeMode(!isBarcodeMode);
                    setIsScanning(false); // Reset scanning state
                    setLastScannedBarcode(null); // Reset last scanned barcode
                    setScanCooldown(false); // Reset cooldown
                    
                    if (Platform.OS !== 'web') {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch (hapticError) {
                        console.log('Haptics not available:', hapticError);
                      }
                    }
                  }}
                >
                  <QrCode size={20} color={isBarcodeMode ? Colors.primary : Colors.white} />
                  <Text style={[styles.barcodeText, isBarcodeMode && styles.barcodeTextActive]}>
                    {isBarcodeMode ? 'Food Mode' : 'Scan Barcode'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </CameraView>
        
        {capturedImage && (
          <SafeAreaView style={styles.resultOverlay}>
            <View style={styles.container}>
            {isProcessing ? (
              <LoadingScreen 
                isVisible={true} 
                progress={scanProgress}
                onComplete={() => {
                  console.log('Loading screen completed, hiding processing state');
                  setIsProcessing(false);
                }}
                onCancel={() => {
                  console.log('Scan cancelled by user');
                  setIsProcessing(false);
                  setCapturedImage(null);
                  setScanProgress(0);
                }}
                onProductNotFound={() => {
                  console.log('Product not found, returning to scanner');
                  setIsProcessing(false);
                  setCapturedImage(null);
                  setScanProgress(0);
                }}
              />
            ) : analysisError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Analysis Failed</Text>
                <Text style={styles.errorText}>{analysisError}</Text>
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={handleScanAnother}
                >
                  <Text style={styles.primaryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : nutritionData ? (
              // Show the full PremiumScanFeedback component with base vs personalized score comparison
              <PremiumScanFeedback
                nutrition={nutritionData}
                imageUri={capturedImage === 'barcode-scan' ? nutritionData.imageUrl || undefined : capturedImage || undefined}
                onScanAnother={handleScanAnother}
                onSaveToHistory={handleSaveToHistory}
                isLoading={false}
                onBack={handleScanAnother}
              />
            ) : null}
            </View>
          </SafeAreaView>
        )}
      </View>
    </TabSlideView>
    );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  brandingHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  brandingText: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.primary,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 16,
  },
  apiTestButtonMain: {
    position: 'absolute',
    right: 0,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  apiTestButtonMainText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  apiStatusContainerMain: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  apiStatusTextMain: {
    color: Colors.textPrimary,
    fontSize: 14,
    marginLeft: 8,
  },
  retestButtonMain: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 8,
  },
  retestButtonTextMain: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.gray100,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  actionContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  actionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.gray100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  actionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  infoStep: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    color: Colors.white,
    textAlign: "center",
    lineHeight: 28,
    fontWeight: "bold",
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: Colors.gray700,
  },
  permissionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 32,
    margin: 16,
    alignItems: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
    marginTop: 12,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  scannerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    width: '100%',
  },
  scannerBranding: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  apiTestButton: {
    position: 'absolute',
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  apiTestButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  apiStatusContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: '90%',
  },
  apiStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  apiStatusText: {
    color: Colors.white,
    fontSize: 14,
    marginLeft: 8,
  },
  retestButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 8,
  },
  retestButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  scanFrame: {
    width: 280,
    height: 280,
    position: "relative",
    borderRadius: 24,
  },
  scanCorner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: Colors.primary,
    borderWidth: 3,
  },
  scanCornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 24,
  },
  scanCornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 24,
  },
  scanCornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 24,
  },
  scanCornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 24,
  },
  scanHint: {
    marginTop: 24,
    textAlign: "center",
    color: Colors.white,
    fontSize: 16,
    fontWeight: "500",
  },
  cameraControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
    gap: 60,
  },

  libraryButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.white,
  },
  flashButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  flashButtonActive: {
    backgroundColor: Colors.white,
  },
  barcodeContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  barcodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  barcodeText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  barcodeButtonActive: {
    backgroundColor: Colors.white,
    borderColor: Colors.primary,
  },
  barcodeTextActive: {
    color: Colors.primary,
  },
  resultContainer: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  capturedImage: {
    width: "100%",
    height: 300,
    resizeMode: "cover",
  },
  processingContainer: {
    padding: 32,
    alignItems: "center",
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  processingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.error,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    margin: 16,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.primary,
    marginBottom: 8,
  },
  resultText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  noProductContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noProductIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  noProductTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  noProductText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  noProductTips: {
    alignSelf: 'stretch',
    marginBottom: 32,
  },
  tipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  scanningIndicator: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningLine: {
    width: '80%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 1,
  },
  scanningLineActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  captureButtonDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    opacity: 0.5,
  },
  captureButtonInnerDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  errorBanner: {
    position: 'absolute',
    bottom: -60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(220, 53, 69, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorBannerText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  resultOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.backgroundSecondary,
    zIndex: 1000,
  },
});