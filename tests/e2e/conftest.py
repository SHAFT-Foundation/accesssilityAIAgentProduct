import pytest
import os
from playwright.async_api import async_playwright
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

@pytest.fixture(scope="session")
def base_url():
    """Base URL for the application"""
    return os.getenv("E2E_BASE_URL", "http://localhost:3000")

@pytest.fixture(scope="session")
def api_url():
    """API URL for the backend"""
    return os.getenv("E2E_API_URL", "http://localhost:3001")

@pytest.fixture(scope="session")
async def browser_context():
    """Create a browser context for all tests"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=os.getenv("HEADLESS", "true").lower() == "true"
        )
        context = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent="Mozilla/5.0 (compatible; AccessibilityScanner/1.0; +https://accessibility-scanner.com/bot)"
        )
        yield context
        await context.close()
        await browser.close()

@pytest.fixture
async def page(browser_context):
    """Create a new page for each test"""
    page = await browser_context.new_page()
    yield page
    await page.close()

@pytest.fixture
def test_user():
    """Test user credentials"""
    return {
        "email": "test@accessibility-scanner.com",
        "password": "TestPassword123!",
        "github_username": "test-user"
    }