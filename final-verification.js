#!/usr/bin/env node

const https = require('https');

console.log('🔬 FINAL WAITLIST VERIFICATION TEST');
console.log('===================================');

async function checkDeployedSupabaseConfig() {
  console.log('1. Checking deployed Supabase configuration...');
  
  return new Promise((resolve) => {
    https.get('https://accessibility2.vercel.app', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (data.includes('uyvlawgxlzddsoikmmjm.supabase.co')) {
          console.log('✅ Deployed site uses correct Supabase URL');
          resolve(true);
        } else if (data.includes('placeholder.supabase.co')) {
          console.log('❌ PROBLEM: Deployed site still uses placeholder URL');
          resolve(false);
        } else {
          console.log('⚠️  Could not verify Supabase URL in deployed site');
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.log('❌ Error fetching deployed site:', err.message);
      resolve(false);
    });
  });
}

async function testSupabaseDirectly() {
  console.log('\n2. Testing Supabase API directly...');
  
  const testEmail = `final-test-${Date.now()}@example.com`;
  const postData = JSON.stringify({
    email: testEmail,
    source: 'final_verification',
    metadata: { test: true, timestamp: new Date().toISOString() }
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
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          console.log(`✅ Supabase API working! Test email ${testEmail} added successfully`);
          resolve(true);
        } else {
          console.log(`❌ Supabase API failed with status ${res.statusCode}: ${data}`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Supabase API request error: ${err.message}`);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

async function checkWaitlistCount() {
  console.log('\n3. Checking waitlist count...');
  
  const options = {
    hostname: 'uyvlawgxlzddsoikmmjm.supabase.co',
    port: 443,
    path: '/rest/v1/waitlist?select=count',
    method: 'GET',
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dmxhd2d4bHpkZHNvaWttbWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Njg1NTYsImV4cCI6MjA2OTE0NDU1Nn0.tEZ98ILmkTbm7poHwAUdK04-2Jcmfs2HghNZAo1oc2M',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dmxhd2d4bHpkZHNvaWttbWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Njg1NTYsImV4cCI6MjA2OTE0NDU1Nn0.tEZ98ILmkTbm7poHwAUdK04-2Jcmfs2HghNZAo1oc2M',
      'Range': '0-0'
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      const contentRange = res.headers['content-range'];
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)/);
        if (match) {
          const count = parseInt(match[1]);
          console.log(`✅ Waitlist has ${count} total entries`);
          resolve(true);
        }
      } else {
        console.log('⚠️  Could not get waitlist count');
      }
      resolve(false);
    });

    req.on('error', (err) => {
      console.log(`❌ Count check error: ${err.message}`);
      resolve(false);
    });

    req.end();
  });
}

async function runFinalVerification() {
  console.log('Running final verification of waitlist functionality...\n');
  
  const results = [];
  
  results.push(await checkDeployedSupabaseConfig());
  results.push(await testSupabaseDirectly());
  results.push(await checkWaitlistCount());
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n📋 FINAL VERIFICATION RESULTS');
  console.log('=============================');
  console.log(`✅ Passed: ${passed}/${total} tests`);
  
  if (passed === total) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('🚀 Waitlist form should be working on https://accessibility2.vercel.app');
    console.log('💡 Try submitting an email to test it yourself!');
    return true;
  } else {
    console.log('\n❌ Some tests failed. Issues need to be resolved.');
    return false;
  }
}

runFinalVerification().then(success => {
  process.exit(success ? 0 : 1);
});