const puppeteer = require('puppeteer');

async function testStyling() {
  console.log('🧪 Testing if Tailwind CSS is working...');
  
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  try {
    // Go to the local dev server
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
    
    // Check if Tailwind classes are applied
    const headerBg = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return null;
      return window.getComputedStyle(header).backgroundColor;
    });
    
    const heroText = await page.evaluate(() => {
      const hero = document.querySelector('h1');
      if (!hero) return null;
      return window.getComputedStyle(hero).fontSize;
    });
    
    const gradientText = await page.evaluate(() => {
      const gradient = document.querySelector('.bg-gradient-to-r, .bg-clip-text');
      if (!gradient) return null;
      return window.getComputedStyle(gradient).backgroundImage;
    });
    
    console.log('📊 Test Results:');
    console.log('Header background:', headerBg);
    console.log('Hero font size:', heroText);
    console.log('Gradient text:', gradientText ? 'Found' : 'Not found');
    
    // Take screenshot
    await page.screenshot({ path: 'styling-test.png', fullPage: true });
    console.log('📸 Screenshot saved as styling-test.png');
    
    if (headerBg && headerBg !== 'rgba(0, 0, 0, 0)' && heroText && heroText !== '16px') {
      console.log('✅ Tailwind CSS is working!');
    } else {
      console.log('❌ Tailwind CSS is not working properly');
    }
    
  } catch (error) {
    console.log('❌ Error testing:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testStyling();