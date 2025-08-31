#!/usr/bin/env node

// This script helps fix React version compatibility issues
// Run this with: node fix-react.js

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing React version compatibility...');

try {
  // Read package.json
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Update React versions
  if (packageJson.dependencies) {
    if (packageJson.dependencies.react === '19.0.0') {
      packageJson.dependencies.react = '18.3.1';
      console.log('✅ Updated React to 18.3.1');
    }
    
    if (packageJson.dependencies['react-dom'] === '19.0.0') {
      packageJson.dependencies['react-dom'] = '18.3.1';
      console.log('✅ Updated React DOM to 18.3.1');
    }
  }
  
  // Write back to package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  console.log('✅ Package.json updated successfully!');
  console.log('📱 Now run: bun install');
  console.log('🚀 Then restart your development server');
  
} catch (error) {
  console.error('❌ Error updating package.json:', error.message);
}