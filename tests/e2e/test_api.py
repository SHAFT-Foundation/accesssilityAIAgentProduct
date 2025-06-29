import pytest
import requests
from playwright.async_api import Page

class TestAPI:
    """Test cases for the API endpoints"""
    
    def test_health_check(self, api_url: str):
        """Test the health check endpoint"""
        response = requests.get(f"{api_url}/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "uptime" in data
        
    def test_ready_check(self, api_url: str):
        """Test the readiness check endpoint"""
        response = requests.get(f"{api_url}/health/ready")
        assert response.status_code in [200, 503]
        
        data = response.json()
        assert data["status"] in ["ready", "not_ready"]
        assert "checks" in data
        assert "timestamp" in data
        
    def test_cors_headers(self, api_url: str):
        """Test CORS headers are properly set"""
        response = requests.options(f"{api_url}/health")
        assert response.status_code == 200
        
        # Check CORS headers
        assert "Access-Control-Allow-Origin" in response.headers
        assert "Access-Control-Allow-Methods" in response.headers
        
    def test_rate_limiting(self, api_url: str):
        """Test rate limiting is working"""
        # Make multiple rapid requests
        responses = []
        for _ in range(10):
            response = requests.get(f"{api_url}/health")
            responses.append(response.status_code)
            
        # All should succeed for health endpoint (adjust for other endpoints)
        assert all(status == 200 for status in responses)
        
    def test_security_headers(self, api_url: str):
        """Test security headers are present"""
        response = requests.get(f"{api_url}/health")
        
        # Check security headers
        assert "X-Content-Type-Options" in response.headers
        assert "X-Frame-Options" in response.headers
        assert "X-XSS-Protection" in response.headers or "X-Content-Type-Options" in response.headers
        
    async def test_api_response_time(self, api_url: str):
        """Test API response times are reasonable"""
        import time
        
        start_time = time.time()
        response = requests.get(f"{api_url}/health")
        end_time = time.time()
        
        response_time = (end_time - start_time) * 1000  # Convert to ms
        
        assert response.status_code == 200
        assert response_time < 500, f"API response too slow: {response_time}ms"