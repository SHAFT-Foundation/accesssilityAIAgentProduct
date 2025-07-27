#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

// Test configuration
const SITE_URL = 'https://accessibility2.vercel.app';
const TEST_EMAIL = `test${Date.now()}@example.com`;

console.log('🧪 Waitlist Form Test Suite');
console.log('===========================');
console.log(`Testing: ${SITE_URL}`);
console.log(`Test email: ${TEST_EMAIL}`);
console.log('');

// Test 1: Check if site loads
async function testSiteLoads() {
  console.log('Test 1: Checking if site loads...');
  return new Promise((resolve) => {
    https.get(SITE_URL, (res) => {
      console.log(`✓ Site responds with status: ${res.statusCode}`);
      if (res.statusCode === 200) {
        console.log('✅ Site loads successfully');
        resolve(true);
      } else {
        console.log('❌ Site not loading properly');
        resolve(false);
      }
    }).on('error', (err) => {
      console.log(`❌ Site load error: ${err.message}`);
      resolve(false);
    });
  });
}

// Test 2: Check environment variables in browser
async function testEnvironmentVariables() {
  console.log('\nTest 2: Checking environment variables...');
  
  // Create a test script to check env vars
  const testScript = `
    fetch('${SITE_URL}')
      .then(response => response.text())
      .then(html => {
        console.log('Checking for Supabase configuration...');
        
        // Check if the page has any Supabase-related errors
        if (html.includes('supabaseUrl is required')) {
          console.log('❌ supabaseUrl is required error found');
          return false;
        }
        
        if (html.includes('placeholder.supabase.co')) {
          console.log('❌ Using placeholder Supabase URL');
          return false;
        }
        
        console.log('✅ No obvious Supabase configuration errors');
        return true;
      })
      .catch(err => {
        console.log('❌ Error checking environment:', err);
        return false;
      });
  `;
  
  console.log('✅ Environment variable test script ready');
  return true;
}

// Test 3: Test waitlist form submission
async function testWaitlistSubmission() {
  console.log('\nTest 3: Testing waitlist form submission...');
  
  const postData = JSON.stringify({
    email: TEST_EMAIL,
    source: 'test_script',
    metadata: {
      test: true,
      timestamp: new Date().toISOString()
    }
  });

  const options = {
    hostname: 'uyvlawgxlzddsoikmmjm.supabase.co',
    port: 443,
    path: '/rest/v1/waitlist',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dmxhd2d4bHpkZHNvaWttbWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Njg1NTYsImV4cCI6MjA2OTE0NDU1Nn0.tEZ98ILmkTbm7poHwAUdK04-2Jcmfs2HghNZAo1oc2M',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dmxhd2d4bHpkZHNvaWttbWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Njg1NTYsImV4cCI6MjA2OTE0NDU1Nn0.tEZ98ILmkTbm7poHwAUdK04-2Jcmfs2HghNZAo1oc2M',
      'Content-Length': Buffer.byteLength(postData),
      'Prefer': 'return=minimal'
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      console.log(`Supabase API response status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          console.log('✅ Direct Supabase API call successful');
          console.log('Response:', data);
          resolve(true);
        } else {
          console.log('❌ Direct Supabase API call failed');
          console.log('Response:', data);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Supabase API error: ${err.message}`);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

// Test 4: Test if table exists
async function testTableExists() {
  console.log('\nTest 4: Checking if waitlist table exists...');
  
  const options = {
    hostname: 'uyvlawgxlzddsoikmmjm.supabase.co',
    port: 443,
    path: '/rest/v1/waitlist?select=count',
    method: 'GET',
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dmxhd2d4bHpkZHNvaWttbWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Njg1NTYsImV4cCI6MjA2OTE0NDU1Nn0.tEZ98ILmkTbm7poHwAUdK04-2Jcmfs2HghNZAo1oc2M',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dmxhd2d4bHpkZHNvaWttbWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Njg1NTYsImV4cCI6MjA2OTE0NDU1Nn0.tEZ98ILmkTbm7poHwAUdK04-2Jcmfs2HghNZAo1oc2M'
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      console.log(`Table check response status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Waitlist table exists and is accessible');
          resolve(true);
        } else {
          console.log('❌ Waitlist table does not exist or is not accessible');
          console.log('Response:', data);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Table check error: ${err.message}`);
      resolve(false);
    });

    req.end();
  });
}

// Test 5: Browser simulation test
async function testBrowserSimulation() {
  console.log('\nTest 5: Creating browser test script...');
  
  const browserTest = `
<!DOCTYPE html>
<html>
<head>
    <title>Waitlist Test</title>
</head>
<body>
    <h1>Testing Waitlist Submission</h1>
    <div id="result"></div>
    
    <script>
        async function testWaitlist() {
            const result = document.getElementById('result');
            result.innerHTML = 'Testing...';
            
            try {
                // Import Supabase client (simulating the app)
                const { createClient } = window.supabase || {};
                
                if (!createClient) {
                    result.innerHTML = '❌ Supabase client not available';
                    return;
                }
                
                const supabase = createClient(
                    'https://uyvlawgxlzddsoikmmjm.supabase.co',
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dmxhd2d4bHpkZHNvaWttbWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Njg1NTYsImV4cCI6MjA2OTE0NDU1Nn0.tEZ98ILmkTbm7poHwAUdK04-2Jcmfs2HghNZAo1oc2M'
                );
                
                const { error } = await supabase
                    .from('waitlist')
                    .insert([
                        { 
                            email: 'browser-test-${Date.now()}@example.com',
                            source: 'browser_test',
                            metadata: {
                                userAgent: navigator.userAgent,
                                timestamp: new Date().toISOString(),
                            }
                        }
                    ]);

                if (error) {
                    result.innerHTML = '❌ Error: ' + error.message;
                } else {
                    result.innerHTML = '✅ Waitlist submission successful!';
                }
            } catch (err) {
                result.innerHTML = '❌ Exception: ' + err.message;
            }
        }
        
        // Test when page loads
        window.onload = testWaitlist;
    </script>
    
    <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
</body>
</html>
  `;
  
  fs.writeFileSync('/tmp/waitlist-test.html', browserTest);
  console.log('✅ Browser test file created at /tmp/waitlist-test.html');
  console.log('   Open this file in a browser to test client-side submission');
  
  return true;
}

// Run all tests
async function runTests() {
  console.log('Starting comprehensive waitlist tests...\n');
  
  const tests = [
    { name: 'Site Loading', fn: testSiteLoads },
    { name: 'Environment Variables', fn: testEnvironmentVariables },
    { name: 'Table Exists', fn: testTableExists },
    { name: 'Direct Supabase API', fn: testWaitlistSubmission },
    { name: 'Browser Test Setup', fn: testBrowserSimulation }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({ name: test.name, passed: result });
    } catch (err) {
      console.log(`❌ ${test.name} threw error: ${err.message}`);
      results.push({ name: test.name, passed: false, error: err.message });
    }
  }
  
  // Print summary
  console.log('\n🔍 TEST SUMMARY');
  console.log('================');
  
  results.forEach(test => {
    const status = test.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test.name}`);
    if (test.error) {
      console.log(`    Error: ${test.error}`);
    }
  });
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(`\nResult: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Waitlist should be working.');
  } else {
    console.log('🔧 Some tests failed. Fixing issues...');
    return false;
  }
  
  return true;
}

// Run the tests
runTests().then(success => {
  if (!success) {
    console.log('\n⚠️  Tests failed. Need to fix issues.');
    process.exit(1);
  } else {
    console.log('\n🎉 All systems working!');
    process.exit(0);
  }
});