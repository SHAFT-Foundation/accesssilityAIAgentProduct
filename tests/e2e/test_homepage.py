import pytest
from playwright.async_api import Page, expect

class TestHomepage:
    """Test cases for the marketing homepage"""
    
    async def test_homepage_loads(self, page: Page, base_url: str):
        """Test that the homepage loads successfully"""
        await page.goto(base_url)
        await expect(page).to_have_title(/AI Accessibility Scanner/)
        
    async def test_hero_section(self, page: Page, base_url: str):
        """Test the hero section elements"""
        await page.goto(base_url)
        
        # Check main headline
        headline = page.locator("h1")
        await expect(headline).to_contain_text("We Don't Just Find Issues")
        
        # Check CTA buttons
        cta_button = page.locator('button:has-text("Start Free")')
        await expect(cta_button).to_be_visible()
        
        demo_button = page.locator('button:has-text("See Live Demo")')
        await expect(demo_button).to_be_visible()
        
    async def test_pricing_section(self, page: Page, base_url: str):
        """Test the pricing section"""
        await page.goto(base_url)
        
        # Scroll to pricing section
        await page.locator('#pricing').scroll_into_view_if_needed()
        
        # Check pricing tiers
        await expect(page.locator('text="Free"')).to_be_visible()
        await expect(page.locator('text="Pro"')).to_be_visible()
        await expect(page.locator('text="Enterprise"')).to_be_visible()
        
        # Check pricing amounts
        await expect(page.locator('text="$29.99"')).to_be_visible()
        
    async def test_security_section(self, page: Page, base_url: str):
        """Test the security section highlighting enterprise features"""
        await page.goto(base_url)
        
        # Check security badges
        await expect(page.locator('text="SOC 2 Type II"')).to_be_visible()
        await expect(page.locator('text="Zero Code Storage"')).to_be_visible()
        await expect(page.locator('text="Ephemeral Build Environments"')).to_be_visible()
        
    async def test_seo_meta_tags(self, page: Page, base_url: str):
        """Test SEO meta tags are properly set"""
        await page.goto(base_url)
        
        # Check meta description
        meta_description = await page.get_attribute('meta[name="description"]', 'content')
        assert "accessibility tool that submits PRs" in meta_description
        
        # Check Open Graph tags
        og_title = await page.get_attribute('meta[property="og:title"]', 'content')
        assert "AI Accessibility Scanner" in og_title
        
    async def test_accessibility_compliance(self, page: Page, base_url: str):
        """Test basic accessibility compliance of the homepage"""
        await page.goto(base_url)
        
        # Check for alt text on images
        images = await page.locator('img').all()
        for img in images:
            alt_text = await img.get_attribute('alt')
            assert alt_text is not None, "Image missing alt text"
            
        # Check for proper heading hierarchy
        h1_count = await page.locator('h1').count()
        assert h1_count == 1, "Should have exactly one H1 tag"
        
        # Check for focus indicators (simplified check)
        await page.keyboard.press('Tab')
        focused_element = await page.evaluate('document.activeElement.tagName')
        assert focused_element is not None
        
    async def test_mobile_responsiveness(self, page: Page, base_url: str):
        """Test mobile responsiveness"""
        # Set mobile viewport
        await page.set_viewport_size({"width": 375, "height": 667})
        await page.goto(base_url)
        
        # Check that hero text is still visible
        headline = page.locator("h1")
        await expect(headline).to_be_visible()
        
        # Check that CTA buttons are accessible
        cta_button = page.locator('button:has-text("Start Free")')
        await expect(cta_button).to_be_visible()
        
    async def test_demo_modal(self, page: Page, base_url: str):
        """Test the demo modal functionality"""
        await page.goto(base_url)
        
        # Click demo button
        await page.click('button:has-text("See Live Demo")')
        
        # Check modal appears
        modal = page.locator('[role="dialog"], .modal, text="Live Demo"')
        await expect(modal).to_be_visible()
        
        # Close modal (if close button exists)
        close_button = page.locator('button:has-text("×"), button[aria-label="Close"]')
        if await close_button.count() > 0:
            await close_button.click()
            await expect(modal).not_to_be_visible()
            
    async def test_performance_metrics(self, page: Page, base_url: str):
        """Test basic performance metrics"""
        # Start performance monitoring
        await page.goto(base_url, wait_until="networkidle")
        
        # Check that page loads within reasonable time
        performance = await page.evaluate("""
            () => {
                const navigation = performance.getEntriesByType('navigation')[0];
                return {
                    loadTime: navigation.loadEventEnd - navigation.loadEventStart,
                    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
                };
            }
        """)
        
        # Assert reasonable load times (adjust thresholds as needed)
        assert performance['loadTime'] < 3000, f"Page load time too slow: {performance['loadTime']}ms"
        assert performance['domContentLoaded'] < 2000, f"DOM load time too slow: {performance['domContentLoaded']}ms"