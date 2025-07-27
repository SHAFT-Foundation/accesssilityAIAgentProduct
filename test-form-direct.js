#!/usr/bin/env node

const https = require('https');
const { URL } = require('url');

console.log('🎯 DIRECT FORM TEST');
console.log('==================');

async function testFormSubmission() {
  console.log('Testing form submission with browser-like request...');
  
  const testEmail = `form-test-${Date.now()}@example.com`;
  console.log(`Using test email: ${testEmail}`);
  
  // Simulate what the browser would send
  const postData = JSON.stringify({
    email: testEmail,
    source: 'direct_form_test',
    metadata: {
      userAgent: 'Mozilla/5.0 (Test Browser)',
      referrer: 'https://accessibility2.vercel.app',
      timestamp: new Date().toISOString(),
      test: true
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
      'Prefer': 'return=minimal',
      'Origin': 'https://accessibility2.vercel.app',
      'Referer': 'https://accessibility2.vercel.app/',
      'User-Agent': 'Mozilla/5.0 (Test Browser)'
    }
  };

  return new Promise((resolve) => {
    console.log('Sending request to Supabase...');
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Response status: ${res.statusCode}`);
        console.log(`Response headers:`, res.headers);
        
        if (res.statusCode === 201) {
          console.log(`✅ SUCCESS! Email ${testEmail} added to waitlist`);
          resolve(true);
        } else if (res.statusCode === 409) {
          console.log(`⚠️ Email already exists (which means API is working!)`);
          resolve(true);
        } else {
          console.log(`❌ Failed with status ${res.statusCode}`);
          console.log(`Response body: ${data}`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Request error: ${err.message}`);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

async function checkClientSideConfig() {
  console.log('\nChecking if client-side JavaScript has correct config...');
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'accessibility2.vercel.app',
      port: 443,
      path: '/',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Test Browser)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (data.includes('uyvlawgxlzddsoikmmjm.supabase.co')) {
          console.log('✅ Found correct Supabase URL in page source');
          resolve(true);
        } else if (data.includes('placeholder.supabase.co')) {
          console.log('❌ Found placeholder Supabase URL in page source');
          resolve(false);
        } else if (data.includes('supabase')) {
          console.log('⚠️ Found "supabase" text but not our specific URL');
          // Let's see what we find
          const supabaseMatches = data.match(/[a-z0-9]+\.supabase\.co/g);
          if (supabaseMatches) {
            console.log('Found Supabase URLs:', supabaseMatches);
          }
          resolve(false);
        } else {
          console.log('❌ No Supabase configuration found in page source');
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Error fetching page: ${err.message}`);
      resolve(false);
    });

    req.end();
  });
}

async function runTest() {
  console.log('Running direct form test...\n');
  
  const results = [];
  
  results.push(await testFormSubmission());
  results.push(await checkClientSideConfig());
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n📋 DIRECT FORM TEST RESULTS');
  console.log('============================');
  console.log(`✅ Passed: ${passed}/${total} tests`);
  
  if (passed === total) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('The form should be working correctly.');
    return true;
  } else {
    console.log('\n❌ Some tests failed.');
    if (results[0] && !results[1]) {
      console.log('💡 Supabase API works but client-side config might be wrong.');
      console.log('The form might still work despite not finding config in page source.');
    }
    return false;
  }
}

runTest().then(success => {
  process.exit(success ? 0 : 1);
});