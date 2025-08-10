# Shaft Accessibility AI - MCP API Specification v1.0

## Base URL
```
Production: https://api.shaft.foundation/mcp/v1
Staging: https://staging-api.shaft.foundation/mcp/v1
WebSocket: wss://mcp.shaft.foundation/v1
```

## Authentication

### API Key Authentication
```http
GET /api/mcp/v1/enrich
Authorization: Bearer YOUR_API_KEY
```

### OAuth 2.0 Flow
```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
client_id=YOUR_CLIENT_ID
client_secret=YOUR_CLIENT_SECRET
scope=mcp.accessibility
```

Response:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "mcp.accessibility"
}
```

## REST API Endpoints

### 1. Request Content Enrichment

**POST** `/enrich`

Submits visual content for accessibility enrichment using MCP agent orchestration.

#### Request Body
```json
{
  "element": {
    "type": "image|chart|table|diagram|infographic",
    "url": "https://example.com/chart.png",
    "selector": "#chart-container",
    "html": "<div>...</div>",
    "context": {
      "pageUrl": "https://example.com/analytics",
      "pageTitle": "Analytics Dashboard",
      "surroundingText": "The following chart shows..."
    }
  },
  "user": {
    "preferences": {
      "detailLevel": "minimal|moderate|comprehensive",
      "language": "en-US",
      "outputFormat": "text|structured|audio",
      "readingLevel": "basic|intermediate|advanced"
    },
    "assistiveTechnology": {
      "type": "nvda|jaws|voiceover|talkback",
      "version": "2024.4"
    }
  },
  "options": {
    "priority": "realtime|standard|batch",
    "agents": ["visual-interpreter", "data-analyst", "context-synthesizer"],
    "maxLatency": 5000,
    "includeConfidence": true,
    "includeSources": false
  }
}
```

#### Response
```json
{
  "requestId": "req_550e8400e29b41d4",
  "status": "success",
  "processingTime": 3847,
  "confidence": 0.97,
  "enrichedContent": {
    "summary": {
      "text": "This bar chart compares quarterly revenue across 4 product lines...",
      "readingTime": 120,
      "complexity": "medium",
      "keyPoints": [
        "Product A shows 35% growth",
        "Product B declined by 12%",
        "Overall revenue increased 18%"
      ]
    },
    "structured": {
      "type": "bar-chart",
      "title": "Quarterly Revenue Comparison",
      "axes": {
        "x": {
          "label": "Products",
          "values": ["Product A", "Product B", "Product C", "Product D"]
        },
        "y": {
          "label": "Revenue (USD)",
          "range": [0, 1000000]
        }
      },
      "data": [
        {"product": "Product A", "q1": 250000, "q2": 280000, "q3": 310000, "q4": 337500},
        {"product": "Product B", "q1": 180000, "q2": 175000, "q3": 165000, "q4": 158400}
      ],
      "trends": [
        {"type": "growth", "subject": "Product A", "rate": 0.35},
        {"type": "decline", "subject": "Product B", "rate": -0.12}
      ]
    },
    "navigation": {
      "shortcuts": {
        "1": "Summary overview",
        "2": "Product-by-product analysis",
        "3": "Trend analysis",
        "4": "Export data"
      },
      "landmarks": [
        {"id": "summary", "label": "Chart Summary"},
        {"id": "data-table", "label": "Data Table"},
        {"id": "insights", "label": "Key Insights"}
      ]
    },
    "interactions": {
      "voice": {
        "available": true,
        "commands": [
          "Read summary",
          "Compare products",
          "What's the trend?",
          "Export to CSV"
        ]
      },
      "keyboard": {
        "navigation": "Use arrow keys to navigate",
        "activation": "Press Enter to select",
        "help": "Press H for help"
      }
    },
    "delivery": {
      "aria": {
        "live": "polite",
        "atomic": false,
        "relevant": "additions"
      },
      "chunks": ["summary", "data", "insights"],
      "format": "progressive"
    }
  },
  "metadata": {
    "agentsUsed": [
      {"id": "visual-interpreter-001", "model": "gpt-4-vision", "contribution": 0.35},
      {"id": "data-analyst-002", "model": "claude-3-opus", "contribution": 0.40},
      {"id": "context-synthesizer-003", "model": "gpt-4-turbo", "contribution": 0.25}
    ],
    "cacheKey": "element_550e8400",
    "ttl": 3600,
    "version": "1.0.0"
  }
}
```

### 2. Get Enrichment Status

**GET** `/enrich/{requestId}/status`

Check the status of an asynchronous enrichment request.

#### Response
```json
{
  "requestId": "req_550e8400e29b41d4",
  "status": "processing|completed|failed",
  "progress": 0.75,
  "currentStage": "synthesis",
  "stages": {
    "extraction": "completed",
    "analysis": "completed",
    "synthesis": "processing",
    "delivery": "pending"
  },
  "estimatedCompletion": "2025-01-10T10:30:45Z",
  "result": null
}
```

### 3. Batch Enrichment

**POST** `/enrich/batch`

Submit multiple elements for batch processing.

#### Request Body
```json
{
  "elements": [
    {
      "id": "elem_001",
      "type": "image",
      "url": "https://example.com/image1.png"
    },
    {
      "id": "elem_002",
      "type": "chart",
      "url": "https://example.com/chart1.png"
    }
  ],
  "options": {
    "parallel": true,
    "maxConcurrent": 5,
    "priority": "batch"
  }
}
```

#### Response
```json
{
  "batchId": "batch_7f3a8b9c2d1e",
  "status": "queued",
  "totalElements": 2,
  "estimatedCompletion": "2025-01-10T10:35:00Z",
  "resultsUrl": "/enrich/batch/batch_7f3a8b9c2d1e/results"
}
```

### 4. User Preferences

**PUT** `/users/{userId}/preferences`

Update user accessibility preferences.

#### Request Body
```json
{
  "preferences": {
    "detailLevel": "comprehensive",
    "language": "en-US",
    "outputFormat": "structured",
    "readingLevel": "advanced",
    "autoEnrich": true,
    "cacheResults": true,
    "shortcuts": {
      "summary": "s",
      "navigation": "n",
      "export": "e"
    }
  },
  "assistiveTechnology": {
    "primary": "nvda",
    "secondary": "magnifier",
    "customSettings": {
      "speechRate": 1.5,
      "pitch": 1.0,
      "volume": 0.8
    }
  }
}
```

### 5. Analytics & Insights

**GET** `/analytics/usage`

Retrieve usage analytics and insights.

#### Query Parameters
- `startDate`: ISO 8601 date
- `endDate`: ISO 8601 date
- `groupBy`: hour|day|week|month
- `metrics`: requests,latency,accuracy,satisfaction

#### Response
```json
{
  "period": {
    "start": "2025-01-01T00:00:00Z",
    "end": "2025-01-10T23:59:59Z"
  },
  "metrics": {
    "totalRequests": 15234,
    "averageLatency": 3421,
    "p95Latency": 4856,
    "accuracy": 0.96,
    "userSatisfaction": 4.7
  },
  "breakdown": {
    "byContentType": {
      "image": 6543,
      "chart": 4321,
      "table": 2345,
      "diagram": 1525,
      "infographic": 500
    },
    "byAgent": {
      "visual-interpreter": 15234,
      "data-analyst": 8765,
      "context-synthesizer": 12345
    }
  },
  "trends": [
    {
      "metric": "requests",
      "change": 0.23,
      "period": "week-over-week"
    }
  ]
}
```

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('wss://mcp.shaft.foundation/v1');

ws.onopen = () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'AUTH',
    token: 'YOUR_ACCESS_TOKEN'
  }));
};
```

### Message Types

#### Request Enrichment
```json
{
  "type": "REQUEST_ENRICHMENT",
  "sessionId": "session_123",
  "payload": {
    "element": {...},
    "user": {...},
    "options": {...}
  }
}
```

#### Progress Update
```json
{
  "type": "PROGRESS_UPDATE",
  "sessionId": "session_123",
  "progress": 0.5,
  "stage": "analysis",
  "message": "Analyzing visual structure..."
}
```

#### Result Delivery
```json
{
  "type": "RESULT_DELIVERY",
  "sessionId": "session_123",
  "payload": {
    "status": "success",
    "enrichedContent": {...}
  }
}
```

#### Live Collaboration
```json
{
  "type": "COLLABORATION_REQUEST",
  "sessionId": "session_123",
  "action": "share|annotate|discuss",
  "payload": {
    "elementId": "elem_001",
    "annotation": "This chart shows...",
    "participants": ["user_456", "user_789"]
  }
}
```

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "API rate limit exceeded. Please retry after 60 seconds.",
    "details": {
      "limit": 100,
      "remaining": 0,
      "resetAt": "2025-01-10T10:31:00Z"
    },
    "requestId": "req_550e8400e29b41d4",
    "timestamp": "2025-01-10T10:30:00Z"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Malformed request body |
| `UNAUTHORIZED` | 401 | Invalid or missing authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `AGENT_UNAVAILABLE` | 503 | AI agent temporarily unavailable |
| `TIMEOUT` | 504 | Request processing timeout |
| `INTERNAL_ERROR` | 500 | Internal server error |

## Rate Limits

| Tier | Requests/Minute | Requests/Day | Concurrent | Burst |
|------|-----------------|--------------|------------|-------|
| Free | 10 | 100 | 1 | 20 |
| Pro | 60 | 5,000 | 5 | 100 |
| Team | 300 | 25,000 | 20 | 500 |
| Enterprise | Unlimited | Unlimited | Unlimited | Custom |

### Rate Limit Headers
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1704883860
X-RateLimit-Reset-After: 60
```

## Webhooks

### Configuration
```json
POST /webhooks
{
  "url": "https://your-app.com/webhook",
  "events": ["enrichment.completed", "enrichment.failed"],
  "secret": "webhook_secret_key"
}
```

### Webhook Payload
```json
{
  "event": "enrichment.completed",
  "timestamp": "2025-01-10T10:30:00Z",
  "data": {
    "requestId": "req_550e8400e29b41d4",
    "userId": "user_123",
    "element": {...},
    "enrichedContent": {...}
  },
  "signature": "sha256=abcdef..."
}
```

## SDKs & Libraries

### JavaScript/TypeScript
```bash
npm install @shaft/accessibility-mcp
```

```javascript
import { ShaftMCP } from '@shaft/accessibility-mcp';

const client = new ShaftMCP({
  apiKey: 'YOUR_API_KEY',
  environment: 'production'
});

const result = await client.enrich({
  element: { type: 'image', url: 'https://example.com/chart.png' },
  options: { priority: 'realtime' }
});
```

### Python
```bash
pip install shaft-accessibility-mcp
```

```python
from shaft_mcp import ShaftMCP

client = ShaftMCP(api_key='YOUR_API_KEY')

result = client.enrich(
    element={'type': 'image', 'url': 'https://example.com/chart.png'},
    options={'priority': 'realtime'}
)
```

### React Hook
```jsx
import { useAccessibility } from '@shaft/react-mcp';

function AccessibleImage({ src }) {
  const { enrich, isLoading, result } = useAccessibility();
  
  useEffect(() => {
    enrich({ type: 'image', url: src });
  }, [src]);
  
  return (
    <div>
      <img src={src} alt={result?.summary.text} />
      {isLoading && <LoadingSpinner />}
      {result && <AccessibilityToolbar content={result} />}
    </div>
  );
}
```

## Testing

### Sandbox Environment
```
Base URL: https://sandbox.shaft.foundation/mcp/v1
API Key: test_key_sandbox_only
Rate Limits: Relaxed for testing
Data Persistence: 24 hours
```

### Test Elements
Pre-configured test elements available for development:

| Element ID | Type | Description |
|------------|------|-------------|
| `test_chart_001` | chart | Simple bar chart |
| `test_image_002` | image | Product photo |
| `test_table_003` | table | Data comparison |
| `test_diagram_004` | diagram | Flow chart |
| `test_infographic_005` | infographic | Complex visualization |

### Example Test Request
```bash
curl -X POST https://sandbox.shaft.foundation/mcp/v1/enrich \
  -H "Authorization: Bearer test_key_sandbox_only" \
  -H "Content-Type: application/json" \
  -d '{
    "element": {
      "type": "chart",
      "url": "https://sandbox.shaft.foundation/test-assets/test_chart_001.png"
    }
  }'
```

## Compliance & Standards

### Accessibility Standards
- WCAG 2.2 Level AAA compliant
- Section 508 compliant
- ADA compliant
- EN 301 549 compliant

### Security Standards
- SOC 2 Type II certified
- ISO 27001 certified
- GDPR compliant
- CCPA compliant
- HIPAA ready (Enterprise)

### API Standards
- OpenAPI 3.0 specification
- JSON:API compliant
- REST Level 3 (HATEOAS)
- GraphQL available (Enterprise)

## Support

- **Documentation**: https://docs.shaft.foundation/mcp
- **API Status**: https://status.shaft.foundation
- **Support Portal**: https://support.shaft.foundation
- **Email**: api-support@shaft.foundation
- **Discord**: https://discord.gg/shaft-dev

## Changelog

### v1.0.0 (2025-01-10)
- Initial public release
- Core MCP protocol implementation
- 3 AI agents available
- WebSocket real-time support
- Batch processing
- 12 language support

### Upcoming (v1.1.0)
- Video content support
- Custom agent configuration
- Federated learning
- Edge computing options
- GraphQL endpoint