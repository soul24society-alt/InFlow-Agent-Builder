// Simple test script for backend API
// Run with: node test.js

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

async function testHealthCheck() {
  console.log(`\n${colors.blue}1️⃣  Testing Health Check...${colors.reset}`);
  
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log(`${colors.green}✅ Health check passed${colors.reset}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Check contract configuration
    if (response.data.tokenFactory === '0x0000000000000000000000000000000000000000') {
      console.log(`${colors.yellow}⚠️  TokenFactory not configured${colors.reset}`);
    }
    if (response.data.nftFactory === '0x0000000000000000000000000000000000000000') {
      console.log(`${colors.yellow}⚠️  NFTFactory not configured${colors.reset}`);
    }
    
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Health check failed${colors.reset}`);
    console.error('Error:', error.message);
    return false;
  }
}

async function testBalance() {
  console.log(`\n${colors.blue}2️⃣  Testing Balance Query...${colors.reset}`);
  
  // Test with a known address (Vitalik's address as example)
  const testAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
  
  try {
    const response = await axios.get(`${BASE_URL}/balance/${testAddress}`);
    console.log(`${colors.green}✅ Balance query passed${colors.reset}`);
    console.log(`Address: ${testAddress}`);
    console.log(`Balance: ${response.data.balance} ETH`);
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Balance query failed${colors.reset}`);
    console.error('Error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log(`${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║   n8nrollup Backend Test Suite        ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════╝${colors.reset}`);
  
  const results = {
    passed: 0,
    failed: 0
  };
  
  // Test 1: Health Check
  const healthOk = await testHealthCheck();
  if (healthOk) results.passed++; else results.failed++;
  
  // Test 2: Balance Query
  const balanceOk = await testBalance();
  if (balanceOk) results.passed++; else results.failed++;
  
  // Summary
  console.log(`\n${colors.blue}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}📊 Test Summary${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}✅ Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${results.failed}${colors.reset}`);
  
  if (results.failed === 0) {
    console.log(`\n${colors.green}🎉 All tests passed!${colors.reset}`);
    console.log(`${colors.green}Your backend is ready to use.${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠️  Some tests failed.${colors.reset}`);
    console.log(`${colors.yellow}Make sure the server is running: npm start${colors.reset}`);
  }
  
  console.log(`\n${colors.blue}Next steps:${colors.reset}`);
  console.log('1. Deploy Stylus contracts (see DEPLOYMENT_GUIDE.md)');
  console.log('2. Update .env with contract addresses');
  console.log('3. Test token deployment with your private key');
  console.log('4. Test NFT collection deployment');
  console.log('');
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
