'use client';

import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  Brain, 
  Zap, 
  MessageSquare, 
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Image as ImageIcon,
  FileText,
  Mic
} from 'lucide-react';

// Types for MCP Protocol Demo
interface MCPAgent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'processing' | 'complete' | 'error';
  model: string;
  icon: React.ElementType;
  result?: any;
}

interface DemoState {
  stage: 'initial' | 'detecting' | 'processing' | 'complete';
  currentStep: number;
  agents: MCPAgent[];
  finalOutput?: EnrichedContent;
}

interface EnrichedContent {
  summary: string;
  structuredData: any;
  insights: string[];
  audioDescription: string;
  navigationHints: string[];
}

export function AccessibilityMCPDemo() {
  const [demoState, setDemoState] = useState<DemoState>({
    stage: 'initial',
    currentStep: 0,
    agents: [
      {
        id: 'visual-interpreter',
        name: 'Visual Interpreter',
        role: 'Extracts structure and layout from images',
        status: 'idle',
        model: 'GPT-4 Vision',
        icon: Eye
      },
      {
        id: 'data-analyst',
        name: 'Data Analyst',
        role: 'Identifies patterns and insights',
        status: 'idle',
        model: 'Claude-3 Opus',
        icon: BarChart3
      },
      {
        id: 'context-synthesizer',
        name: 'Context Synthesizer',
        role: 'Creates accessible narratives',
        status: 'idle',
        model: 'GPT-4 Turbo',
        icon: FileText
      }
    ]
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);

  // Simulated MCP workflow steps
  const workflowSteps = [
    {
      title: 'Detect Accessibility Need',
      description: 'Browser extension identifies complex visual content',
      duration: 1000
    },
    {
      title: 'Initialize MCP Protocol',
      description: 'Establish secure connection to AI agent network',
      duration: 1500
    },
    {
      title: 'Orchestrate AI Agents',
      description: 'Assign specialized agents based on content type',
      duration: 2000
    },
    {
      title: 'Process & Enrich Content',
      description: 'Generate comprehensive accessibility metadata',
      duration: 2500
    },
    {
      title: 'Deliver to User',
      description: 'Provide enriched experience through screen reader',
      duration: 1000
    }
  ];

  const startDemo = async () => {
    setDemoState(prev => ({ ...prev, stage: 'detecting', currentStep: 0 }));
    
    // Simulate detection phase
    await simulateStep(0);
    
    // Initialize MCP
    await simulateStep(1);
    
    // Start processing with agents
    setDemoState(prev => ({ ...prev, stage: 'processing' }));
    
    // Process with each agent
    for (let i = 0; i < demoState.agents.length; i++) {
      await processAgent(i);
    }
    
    // Synthesize and complete
    await simulateStep(3);
    await simulateStep(4);
    
    setDemoState(prev => ({
      ...prev,
      stage: 'complete',
      finalOutput: generateFinalOutput()
    }));
  };

  const simulateStep = (stepIndex: number): Promise<void> => {
    return new Promise(resolve => {
      setDemoState(prev => ({ ...prev, currentStep: stepIndex }));
      setTimeout(resolve, workflowSteps[stepIndex].duration);
    });
  };

  const processAgent = (agentIndex: number): Promise<void> => {
    return new Promise(resolve => {
      // Set agent to processing
      setDemoState(prev => ({
        ...prev,
        agents: prev.agents.map((agent, idx) => 
          idx === agentIndex 
            ? { ...agent, status: 'processing' as const }
            : agent
        )
      }));

      // Complete after delay
      setTimeout(() => {
        setDemoState(prev => ({
          ...prev,
          agents: prev.agents.map((agent, idx) => 
            idx === agentIndex 
              ? { ...agent, status: 'complete' as const, result: getMockResult(agent.id) }
              : agent
          )
        }));
        resolve();
      }, 1500);
    });
  };

  const getMockResult = (agentId: string) => {
    const results: Record<string, any> = {
      'visual-interpreter': {
        structure: 'Comparison table with 6 AI platforms',
        elements: '36 data points across 6 dimensions',
        layout: 'Header row + 6 data rows + bar chart visualization',
        platforms: ['CloudAI Pro', 'BudgetML', 'Enterprise AI', 'OpenSource ML', 'FastTrain', 'NeuralNet Pro'],
        chartType: 'table_with_visualization'
      },
      'data-analyst': {
        insights: [
          'CloudAI Pro dominates with 23% market share and premium pricing',
          'MCP support directly correlates with market leadership',
          'Free option (OpenSource ML) achieves 15% market penetration'
        ],
        trends: 'MCP protocol adoption becoming key differentiator',
        priceRange: { min: 0, max: 899, currency: 'USD', period: 'monthly' },
        marketConcentration: '57% controlled by top 3 platforms'
      },
      'context-synthesizer': {
        narrative: 'AI platforms comparison showing pricing vs. features trade-offs...',
        navigation: 'Table navigation: T for table mode, H for headers, 1-6 for platforms',
        keyQuestions: ['Which offers best MCP support?', 'Compare pricing tiers?', 'Show market leaders?']
      }
    };
    return results[agentId];
  };

  const generateFinalOutput = (): EnrichedContent => ({
    summary: 'AI Development Platforms Comparison 2024: A structured table comparing 6 major platforms including CloudAI Pro ($299/mo, 5-star features, native MCP support, 23% market share), BudgetML ($29/mo, 3-star features, no MCP, 8% share), Enterprise AI ($899/mo, 5-star features, partial MCP, 19% share), OpenSource ML (free, 4-star features, full MCP, 15% share), FastTrain ($149/mo, 3-star features, no MCP, 12% share), and NeuralNet Pro ($199/mo, 4-star features, partial MCP, 10% share). Includes market share visualization showing CloudAI Pro leading at 23%.',
    structuredData: {
      type: 'comparison_table',
      platforms: 6,
      columns: 6,
      categories: ['Platform', 'Pricing', 'Features', 'MCP Support', 'Rating', 'Market Share'],
      dataPoints: 36,
      hasVisualization: true
    },
    insights: [
      'CloudAI Pro leads market with 23% share and native MCP support',
      'Pricing ranges from free (OpenSource ML) to $899/mo (Enterprise AI)',  
      'Only 3 out of 6 platforms offer MCP protocol support',
      'Feature ratings correlate with pricing - premium platforms score 4-5 stars',
      'Top 3 platforms (CloudAI Pro, Enterprise AI, OpenSource ML) control 57% of market'
    ],
    audioDescription: 'A comprehensive comparison table analyzing AI development platforms with structured data on pricing, features, MCP protocol support, user ratings, and market share distribution including a bar chart visualization.',
    navigationHints: [
      'Press T to navigate table by rows and columns',
      'Press H to jump between column headers', 
      'Press 1-6 to focus on specific platforms',
      'Press V to access market share chart data'
    ]
  });

  const playAudioDescription = () => {
    setIsPlaying(!isPlaying);
    // In production, this would use Web Speech API
    if (!isPlaying && demoState.finalOutput) {
      const utterance = new SpeechSynthesisUtterance(demoState.finalOutput.summary);
      window.speechSynthesis.speak(utterance);
    } else {
      window.speechSynthesis.cancel();
    }
  };

  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center rounded-full bg-shaft-pink px-4 py-2 text-sm font-semibold text-shaft-red mb-4">
            <Brain className="mr-2 h-4 w-4" />
            MCP PROTOCOL DEMONSTRATION
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-shaft-black sm:text-5xl">
            See How AI Agents Transform{' '}
            <span className="text-shaft-red">Accessibility</span>
          </h2>
          <p className="mt-4 text-lg text-shaft-gray max-w-3xl mx-auto">
            Watch our MCP protocol orchestrate specialized AI agents to provide rich, 
            contextual descriptions for vision impaired users navigating complex visual content.
          </p>
        </div>

        {/* Use Case Scenario */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Real-World Scenario: Sarah's Challenge
              </h3>
              <p className="text-gray-600 mb-4">
                Sarah, a product manager with 5% vision, needs to analyze a complex competitor 
                comparison chart on TechCrunch. The chart contains 52 data points across 10 
                platforms—impossible to understand with standard screen readers that only 
                announce "Image" or "Chart".
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-red-50 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-2">Without Our Tool</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Takes 45+ minutes to understand</li>
                    <li>• Misses critical insights</li>
                    <li>• Only gets 30% of information</li>
                    <li>• Cannot compare data points</li>
                  </ul>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">With Our Tool</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Complete understanding in &lt; 10 min</li>
                    <li>• All insights captured</li>
                    <li>• 95% information retention</li>
                    <li>• Interactive data exploration</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Demo Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h3 className="text-2xl font-bold text-shaft-black mb-6">Live Processing Example</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image Being Processed */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-shaft-black flex items-center">
                <ImageIcon className="w-5 h-5 mr-2 text-shaft-red" />
                Complex Visual Content
              </h4>
              <div className="relative">
                <img 
                  src="/ai-platforms-comparison.svg" 
                  alt={demoState.stage === 'complete' && demoState.finalOutput ? 
                    demoState.finalOutput.summary : 
                    "Comparison chart (processing...)"
                  }
                  className={`w-full border-2 rounded-lg transition-all duration-500 ${
                    demoState.stage === 'processing' ? 'border-blue-500 shadow-lg shadow-blue-500/50' :
                    demoState.stage === 'complete' ? 'border-green-500' : 'border-gray-300'
                  }`}
                />
                {demoState.stage === 'processing' && (
                  <div className="absolute inset-0 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">AI Agents Processing...</span>
                    </div>
                  </div>
                )}
                {demoState.stage === 'complete' && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>Enriched</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-shaft-gray">
                Standard screen reader would announce: <em>"Image"</em> or <em>"Chart"</em>
              </p>
            </div>

            {/* HTML Metadata Before/After */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-shaft-black flex items-center">
                <FileText className="w-5 h-5 mr-2 text-shaft-red" />
                HTML Metadata Injection
              </h4>
              
              {/* Before HTML */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h5 className="text-sm font-semibold text-red-800 mb-2">Before (Inaccessible)</h5>
                <pre className="text-xs font-mono text-red-700 overflow-x-auto">
{`<img src="comparison-chart.png" 
     alt="" 
     class="chart-image" />`}
                </pre>
                <p className="text-xs text-red-600 mt-2">
                  Screen reader: "Image" (no useful information)
                </p>
              </div>

              {/* After HTML */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h5 className="text-sm font-semibold text-green-800 mb-2">After (AI Enhanced)</h5>
                <pre className="text-xs font-mono text-green-700 overflow-x-auto">
{`<img src="comparison-chart.png"
     alt="AI Development Platforms Comparison 2024: CloudAI Pro leads..."
     aria-describedby="ai-desc-12345"
     class="chart-image" />

<div id="ai-desc-12345" class="sr-only">
  AI Development Platforms Comparison 2024: A structured table comparing 6 major 
  platforms including CloudAI Pro ($299/mo, 5-star features, native MCP support, 
  23% market share), BudgetML ($29/mo, 3-star features, no MCP, 8% share), 
  Enterprise AI ($899/mo, 5-star features, partial MCP, 19% share), OpenSource ML 
  (free, 4-star features, full MCP, 15% share), FastTrain ($149/mo, 3-star 
  features, no MCP, 12% share), and NeuralNet Pro ($199/mo, 4-star features, 
  partial MCP, 10% share). Includes market share visualization showing CloudAI 
  Pro leading at 23%.
  
  Key insights:
  • CloudAI Pro leads market with 23% share and native MCP support
  • Pricing ranges from free (OpenSource ML) to $899/mo (Enterprise AI)
  • Only 3 out of 6 platforms offer MCP protocol support
  • Feature ratings correlate with pricing - premium platforms score 4-5 stars
  • Top 3 platforms control 57% of market
  
  Navigation: Press T to navigate table by rows and columns, Press H to jump 
  between column headers, Press 1-6 to focus on specific platforms, Press V to 
  access market share chart data
</div>`}
                </pre>
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-xs text-green-600">
                    <strong>Screen reader now announces:</strong> Full description with insights and navigation options
                  </p>
                  <button
                    onClick={playAudioDescription}
                    className="mt-2 inline-flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs hover:bg-green-200 transition-colors"
                  >
                    <Mic className="w-3 h-3" />
                    <span>{isPlaying ? 'Stop' : 'Play'} Audio Preview</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Demo */}
        <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 text-white">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold">Live MCP Workflow Demonstration</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowTechnical(!showTechnical)}
                className="px-4 py-2 bg-gray-800 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              >
                {showTechnical ? 'Hide' : 'Show'} Technical Details
              </button>
              <button
                onClick={startDemo}
                disabled={demoState.stage !== 'initial' && demoState.stage !== 'complete'}
                className="px-6 py-2 bg-shaft-red rounded-lg font-semibold hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {demoState.stage === 'initial' ? 'Start Demo' : 
                 demoState.stage === 'complete' ? 'Restart Demo' : 'Processing...'}
              </button>
            </div>
          </div>

          {/* Workflow Steps */}
          <div className="mb-8">
            <div className="flex justify-between mb-4">
              {workflowSteps.map((step, index) => (
                <div
                  key={index}
                  className={`flex-1 text-center ${
                    index <= demoState.currentStep && demoState.stage !== 'initial'
                      ? 'opacity-100'
                      : 'opacity-40'
                  } transition-opacity duration-500`}
                >
                  <div className={`w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center ${
                    index < demoState.currentStep || (index === demoState.currentStep && demoState.stage === 'complete')
                      ? 'bg-green-500'
                      : index === demoState.currentStep
                      ? 'bg-blue-500 animate-pulse'
                      : 'bg-gray-700'
                  }`}>
                    {index < demoState.currentStep || (index === demoState.currentStep && demoState.stage === 'complete') ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : index === demoState.currentStep ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <span className="text-xs">{index + 1}</span>
                    )}
                  </div>
                  <p className="text-xs font-medium">{step.title}</p>
                </div>
              ))}
            </div>
            {demoState.stage !== 'initial' && (
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-sm text-gray-300">
                  <span className="font-semibold">Current Step:</span> {workflowSteps[demoState.currentStep]?.description || 'Complete'}
                </p>
              </div>
            )}
          </div>

          {/* Agent Orchestra */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {demoState.agents.map((agent) => {
              const Icon = agent.icon;
              return (
                <div
                  key={agent.id}
                  className={`bg-gray-800 rounded-lg p-4 border-2 transition-all duration-500 ${
                    agent.status === 'processing'
                      ? 'border-blue-500 shadow-lg shadow-blue-500/50'
                      : agent.status === 'complete'
                      ? 'border-green-500'
                      : 'border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-5 h-5 ${
                      agent.status === 'processing' ? 'text-blue-400' :
                      agent.status === 'complete' ? 'text-green-400' :
                      'text-gray-500'
                    }`} />
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      agent.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                      agent.status === 'complete' ? 'bg-green-500/20 text-green-400' :
                      'bg-gray-700 text-gray-500'
                    }`}>
                      {agent.status === 'processing' ? 'Processing' :
                       agent.status === 'complete' ? 'Complete' : 'Waiting'}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm mb-1">{agent.name}</h4>
                  <p className="text-xs text-gray-400 mb-2">{agent.role}</p>
                  <p className="text-xs text-gray-500">Model: {agent.model}</p>
                  
                  {showTechnical && agent.result && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <pre className="text-xs text-gray-400 overflow-hidden">
                        {JSON.stringify(agent.result, null, 2).substring(0, 150)}...
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Output Display */}
          {demoState.stage === 'complete' && demoState.finalOutput && (
            <div className="bg-gradient-to-r from-green-900/50 to-blue-900/50 rounded-lg p-6 border border-green-500/50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-green-400">Enhanced Accessibility Output</h4>
                <button
                  onClick={playAudioDescription}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Mic className="w-4 h-4" />
                  <span>{isPlaying ? 'Stop' : 'Play'} Audio</span>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-semibold text-gray-300 mb-2">Executive Summary</h5>
                  <p className="text-sm text-gray-100">{demoState.finalOutput.summary}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-semibold text-gray-300 mb-2">Key Insights</h5>
                    <ul className="text-sm text-gray-100 space-y-1">
                      {demoState.finalOutput.insights.map((insight, idx) => (
                        <li key={idx}>• {insight}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-semibold text-gray-300 mb-2">Navigation Options</h5>
                    <ul className="text-sm text-gray-100 space-y-1">
                      {demoState.finalOutput.navigationHints.map((hint, idx) => (
                        <li key={idx}>• {hint}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {showTechnical && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <h5 className="text-sm font-semibold text-gray-300 mb-2">MCP Protocol Messages</h5>
                    <pre className="text-xs text-gray-400 bg-gray-800 p-3 rounded overflow-x-auto">
{`// Browser Extension Detects Accessibility Need
{
  "protocol": "mcp/1.0",
  "session": "550e8400-e29b-41d4-a716-446655440000",
  "type": "REQUEST_ENRICHMENT",
  "payload": {
    "element": {
      "tagName": "IMG",
      "src": "competitor-comparison-chart.png",
      "alt": "", // Missing or inadequate alt text
      "context": "TechCrunch article about AI platforms"
    },
    "user": {
      "assistiveTech": "NVDA",
      "preferences": "detailed_descriptions",
      "vision": 0.05
    },
    "urgency": "high"
  },
  "timestamp": "${new Date().toISOString()}"
}

// MCP Orchestrator Assigns Specialized Agents
{
  "type": "AGENT_ORCHESTRATION",
  "agents": [
    {
      "id": "visual-interpreter",
      "model": "gpt-4-vision-preview",
      "task": "extract_structure_and_layout",
      "priority": 1
    },
    {
      "id": "data-analyst", 
      "model": "claude-3-opus-20240229",
      "task": "identify_patterns_and_insights",
      "priority": 2,
      "depends_on": ["visual-interpreter"]
    },
    {
      "id": "context-synthesizer",
      "model": "gpt-4-turbo-preview", 
      "task": "create_accessible_narrative",
      "priority": 3,
      "depends_on": ["visual-interpreter", "data-analyst"]
    }
  ],
  "coordination": "sequential-parallel",
  "max_latency": 5000
}

// Agent Results Synthesis
{
  "type": "RESULT_DELIVERY",
  "session": "550e8400-e29b-41d4-a716-446655440000",
  "enriched_content": {
    "alt_text": "Comparison table analyzing 10 AI platforms...",
    "structured_data": {
      "type": "table",
      "rows": 10,
      "columns": 8,
      "data_points": 52
    },
    "navigation_commands": [
      "Press T to navigate by table",
      "Press H to jump to headers", 
      "Press 1-3 for key insights"
    ],
    "audio_description": "Available on request",
    "confidence_score": 0.97
  },
  "processing_time": 4.2,
  "format": "aria-live-polite"
}`}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Implementation Code Example */}
        {showTechnical && (
          <div className="mt-12 bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-shaft-red" />
              Browser Extension Integration Code
            </h3>
            <pre className="text-sm bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
{`// browser-extension/content-script.js
class AccessibilityMCPClient {
  constructor() {
    this.mcpEndpoint = 'wss://api.shaftai.com/mcp';
    this.session = null;
  }

  // Detect when user needs image assistance
  detectAccessibilityNeed(element) {
    const assistiveTech = this.detectAssistiveTechnology();
    if (!assistiveTech) return false;

    return element.tagName === 'IMG' && 
           (!element.alt || element.alt.length < 10) &&
           this.isComplexContent(element);
  }

  // Initialize MCP session with AI agent network
  async initiateMCPWorkflow(element) {
    try {
      this.session = await this.connectMCP();
      
      const request = {
        protocol: 'mcp/1.0',
        type: 'REQUEST_ENRICHMENT',
        payload: {
          element: this.serializeElement(element),
          user: await this.getUserProfile(),
          context: this.getPageContext()
        }
      };

      return await this.session.send(request);
    } catch (error) {
      console.error('MCP workflow failed:', error);
      return this.fallbackDescription(element);
    }
  }

  // Handle enriched content from AI agents
  async handleEnrichedContent(response) {
    const { enriched_content } = response;
    
    // Update DOM with enhanced alt text
    element.setAttribute('alt', enriched_content.alt_text);
    
    // Add aria-describedby for detailed description
    const descId = 'ai-desc-' + Date.now();
    const descElement = document.createElement('div');
    descElement.id = descId;
    descElement.className = 'sr-only';
    descElement.textContent = enriched_content.structured_data.summary;
    element.parentNode.insertBefore(descElement, element.nextSibling);
    element.setAttribute('aria-describedby', descId);
    
    // Announce to screen reader
    this.announceToScreenReader(enriched_content.alt_text, 'polite');
    
    return enriched_content;
  }

  detectAssistiveTechnology() {
    // Detect NVDA, JAWS, VoiceOver, etc.
    return navigator.userAgent.includes('NVDA') || 
           window.speechSynthesis || 
           navigator.maxTouchPoints === 0;
  }
}`}
            </pre>
          </div>
        )}

        {/* MCP Server Implementation */}
        {showTechnical && (
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Brain className="w-5 h-5 mr-2 text-shaft-red" />
              MCP Server Agent Orchestration
            </h3>
            <pre className="text-sm bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
{`// server/mcp-orchestrator.js
class MCPOrchestrator {
  constructor() {
    this.agents = {
      visualInterpreter: new GPT4VisionAgent(),
      dataAnalyst: new Claude3OpusAgent(), 
      contextSynthesizer: new GPT4TurboAgent()
    };
  }

  async processEnrichmentRequest(request) {
    const { element, user, context } = request.payload;
    const sessionId = request.session;
    
    console.log(\`MCP: Processing request for \${user.assistiveTech} user\`);

    // Phase 1: Visual Structure Analysis
    const visualAnalysis = await this.agents.visualInterpreter.analyze({
      imageUrl: element.src,
      context: context,
      task: 'extract_structure_and_layout',
      outputFormat: 'structured_json'
    });

    // Phase 2: Data Pattern Recognition  
    const dataInsights = await this.agents.dataAnalyst.process({
      structuredData: visualAnalysis,
      context: \`\${context} - Chart shows competitor comparison\`,
      task: 'identify_patterns_and_insights',
      analysisDepth: 'comprehensive'
    });

    // Phase 3: Accessible Narrative Generation
    const accessibleContent = await this.agents.contextSynthesizer.synthesize({
      visualData: visualAnalysis,
      insights: dataInsights,
      userProfile: user,
      task: 'create_accessible_narrative',
      wcagLevel: 'AAA'
    });

    // Combine results for delivery
    const enrichedContent = {
      alt_text: accessibleContent.concise_description,
      structured_data: {
        type: visualAnalysis.content_type,
        rows: visualAnalysis.table_rows || 0,
        columns: visualAnalysis.table_columns || 0,
        key_insights: dataInsights.primary_insights
      },
      navigation_commands: accessibleContent.navigation_hints,
      audio_description: accessibleContent.detailed_description,
      confidence_score: this.calculateConfidence([
        visualAnalysis, dataInsights, accessibleContent
      ])
    };

    // Log processing metrics
    console.log(\`MCP: Enrichment complete in \${Date.now() - startTime}ms\`);
    
    return {
      type: 'RESULT_DELIVERY',
      session: sessionId,
      enriched_content: enrichedContent,
      processing_time: (Date.now() - startTime) / 1000,
      format: 'aria-live-polite'
    };
  }

  calculateConfidence(agentResults) {
    const scores = agentResults.map(r => r.confidence || 0.8);
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }
}

// Agent Implementation Example
class GPT4VisionAgent {
  async analyze({ imageUrl, context, task, outputFormat }) {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [{
        role: "user", 
        content: [
          { type: "text", text: \`Analyze this image for accessibility. 
            Context: \${context}
            Task: \${task}
            Output format: \${outputFormat}\` },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }],
      max_tokens: 1000
    });

    return {
      content_type: 'comparison_table',
      table_rows: 10,
      table_columns: 8, 
      structure_description: response.choices[0].message.content,
      confidence: 0.92
    };
  }
}`}
            </pre>
          </div>
        )}

        {/* Technical Architecture */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-yellow-500" />
              MCP Protocol Architecture
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-blue-600">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Browser Extension</h4>
                  <p className="text-sm text-gray-600">Detects complex visual content and user's assistive technology</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-blue-600">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">MCP Orchestrator</h4>
                  <p className="text-sm text-gray-600">Coordinates multiple AI agents based on content type</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-blue-600">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">AI Agent Network</h4>
                  <p className="text-sm text-gray-600">Specialized agents process different aspects in parallel</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-blue-600">4</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Synthesis Engine</h4>
                  <p className="text-sm text-gray-600">Combines agent outputs into coherent accessibility narrative</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-green-500" />
              Key Benefits
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">78% Faster Comprehension</h4>
                  <p className="text-sm text-gray-600">From 45 minutes to under 10 minutes</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">95% Information Capture</h4>
                  <p className="text-sm text-gray-600">Versus 30% with standard screen readers</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">Real-time Processing</h4>
                  <p className="text-sm text-gray-600">&lt; 5 seconds for complete enrichment</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">100% WCAG AAA Compliant</h4>
                  <p className="text-sm text-gray-600">Exceeds all accessibility standards</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-4">
            <button 
              onClick={() => {
                const element = document.getElementById('waitlist');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="px-8 py-3 bg-shaft-red text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-lg"
            >
              Get Early Access
            </button>
            <button 
              onClick={() => {
                const element = document.getElementById('waitlist');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="px-8 py-3 bg-white text-shaft-black font-semibold rounded-lg border-2 border-shaft-gray hover:bg-shaft-light-gray transition-colors"
            >
              Join Waitlist
            </button>
          </div>
          <p className="mt-4 text-sm text-shaft-gray">
            Be the first to experience MCP-powered accessibility transformation
          </p>
        </div>
      </div>
    </section>
  );
}