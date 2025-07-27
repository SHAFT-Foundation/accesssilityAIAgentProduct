#!/usr/bin/env node

const { chromium } = require('playwright');

async function testWaitlistForm() {
  console.log('🎭 PLAYWRIGHT WAITLIST TEST');
  console.log('===========================');
  
  const browser = await chromium.launch({ headless: false }); // Set to true for headless
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('📱 Opening https://accessibility2.vercel.app...');
    await page.goto('https://accessibility2.vercel.app');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded successfully');
    
    // Look for the waitlist form
    console.log('🔍 Looking for waitlist form...');
    const emailInput = await page.locator('input[type="email"]').first();
    
    if (await emailInput.count() === 0) {
      throw new Error('Email input not found on page');
    }
    
    // Try multiple button selectors
    let submitButton;
    const buttonSelectors = [
      'button:has-text("Join Waitlist")',
      'button:has-text("Join")',
      'button[type="submit"]',
      'form button',
      'button:near(input[type="email"])'
    ];
    
    for (const selector of buttonSelectors) {
      submitButton = await page.locator(selector).first();
      if (await submitButton.count() > 0) {
        console.log(`✅ Found submit button using selector: ${selector}`);
        break;
      }
    }
    
    if (!submitButton || await submitButton.count() === 0) {
      // Debug: show all buttons on page
      const allButtons = await page.locator('button').all();
      console.log(`Found ${allButtons.length} buttons on page:`);
      for (let i = 0; i < allButtons.length; i++) {
        const text = await allButtons[i].textContent();
        console.log(`  Button ${i+1}: "${text}"`);
      }
      throw new Error('Submit button not found on page');
    }
    
    console.log('✅ Found waitlist form elements');
    
    // Generate test email
    const testEmail = `playwright-test-${Date.now()}@example.com`;
    console.log(`📧 Using test email: ${testEmail}`);
    
    // Listen for console messages to capture any errors
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    
    // Listen for network requests to Supabase
    page.on('request', request => {
      if (request.url().includes('supabase.co')) {
        console.log(`[NETWORK] ${request.method()} ${request.url()}`);
        const headers = request.headers();
        if (headers.apikey) {
          console.log(`[NETWORK] API key present: ${headers.apikey.substring(0, 20)}...`);
        } else {
          console.log(`[NETWORK] ❌ No API key in request headers!`);
        }
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('supabase.co')) {
        console.log(`[NETWORK] Response: ${response.status()} ${response.url()}`);
      }
    });
    
    // Fill in the form
    console.log('✏️ Filling out the form...');
    await emailInput.fill(testEmail);
    
    // Submit the form
    console.log('🚀 Submitting the form...');
    await submitButton.click();
    
    // Wait for response (either success or error)
    console.log('⏳ Waiting for form response...');
    
    try {
      // Wait for either success message or error message to appear
      await page.waitForSelector('text="You\'re on the waitlist"', { timeout: 10000 });
      console.log('🎉 SUCCESS! Waitlist form submitted successfully!');
      console.log('✅ Found success message: "You\'re on the waitlist"');
      return true;
    } catch (successError) {
      console.log('⚠️ Success message not found, checking for error messages...');
      
      try {
        // Check for duplicate email error (which is also success)
        const errorMessage = await page.locator('text*="already registered"').first();
        if (await errorMessage.count() > 0) {
          console.log('✅ Found "already registered" message - this means the API is working!');
          return true;
        }
        
        // Check for any error message
        const anyError = await page.locator('[class*="error"], [class*="Error"], .text-red-600').first();
        if (await anyError.count() > 0) {
          const errorText = await anyError.textContent();
          console.log(`❌ Found error message: "${errorText}"`);
          return false;
        }
        
        // Check if button is still loading
        const loadingSpinner = await page.locator('.animate-spin').first();
        if (await loadingSpinner.count() > 0) {
          console.log('⏳ Form is still loading, waiting longer...');
          await page.waitForTimeout(5000);
          
          // Check again for success
          if (await page.locator('text="You\'re on the waitlist"').count() > 0) {
            console.log('🎉 SUCCESS! Found success message after waiting');
            return true;
          }
        }
        
        console.log('❌ No clear success or error message found');
        
        // Take screenshot for debugging
        await page.screenshot({ path: 'waitlist-test-result.png', fullPage: true });
        console.log('📸 Screenshot saved as waitlist-test-result.png');
        
        return false;
        
      } catch (errorCheckError) {
        console.log('❌ Error while checking for error messages:', errorCheckError.message);
        return false;
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
    
    // Take screenshot for debugging
    try {
      await page.screenshot({ path: 'waitlist-test-error.png', fullPage: true });
      console.log('📸 Error screenshot saved as waitlist-test-error.png');
    } catch (screenshotError) {
      console.log('Could not save screenshot:', screenshotError.message);
    }
    
    return false;
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('Starting Playwright test of waitlist form...\n');
  
  try {
    const success = await testWaitlistForm();
    
    console.log('\n📋 PLAYWRIGHT TEST RESULTS');
    console.log('===========================');
    
    if (success) {
      console.log('🎉 TEST PASSED! Waitlist form is working correctly!');
      process.exit(0);
    } else {
      console.log('❌ TEST FAILED! Waitlist form has issues.');
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ Test runner failed:', error.message);
    process.exit(1);
  }
}

// Check if Playwright is installed
try {
  require('playwright');
  main();
} catch (error) {
  console.log('❌ Playwright not installed. Installing...');
  const { exec } = require('child_process');
  exec('npm install -D playwright', (error, stdout, stderr) => {
    if (error) {
      console.log('❌ Failed to install Playwright:', error.message);
      process.exit(1);
    }
    console.log('✅ Playwright installed. Please run the script again.');
  });
}