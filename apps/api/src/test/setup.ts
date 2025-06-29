import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load test environment variables
config({ path: resolve(__dirname, '../../.env.test') });

// Mock external services
beforeAll(() => {
  // Mock OpenAI
  vi.mock('openai', () => ({
    OpenAI: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: 'Mock AI response for testing'
                }
              }
            ],
            usage: {
              prompt_tokens: 100,
              completion_tokens: 50,
              total_tokens: 150
            }
          })
        }
      }
    }))
  }));

  // Mock Anthropic
  vi.mock('@anthropic-ai/sdk', () => ({
    Anthropic: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: 'Mock Anthropic response for testing'
            }
          ],
          usage: {
            input_tokens: 100,
            output_tokens: 50
          }
        })
      }
    }))
  }));

  // Mock Octokit (GitHub)
  vi.mock('octokit', () => ({
    Octokit: vi.fn().mockImplementation(() => ({
      rest: {
        repos: {
          get: vi.fn().mockResolvedValue({
            data: {
              id: 123456,
              name: 'test-repo',
              full_name: 'test-user/test-repo',
              private: false,
              clone_url: 'https://github.com/test-user/test-repo.git'
            }
          }),
          listForAuthenticatedUser: vi.fn().mockResolvedValue({
            data: [
              {
                id: 123456,
                name: 'test-repo',
                full_name: 'test-user/test-repo',
                private: false
              }
            ]
          })
        },
        pulls: {
          create: vi.fn().mockResolvedValue({
            data: {
              id: 789,
              number: 1,
              title: 'Accessibility fixes',
              html_url: 'https://github.com/test-user/test-repo/pull/1'
            }
          })
        }
      }
    }))
  }));

  // Mock Puppeteer
  vi.mock('puppeteer', () => ({
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        goto: vi.fn().mockResolvedValue(undefined),
        evaluate: vi.fn().mockResolvedValue({}),
        close: vi.fn().mockResolvedValue(undefined)
      }),
      close: vi.fn().mockResolvedValue(undefined)
    })
  }));

  // Mock Sharp
  vi.mock('sharp', () => ({
    default: vi.fn().mockImplementation(() => ({
      resize: vi.fn().mockReturnThis(),
      jpeg: vi.fn().mockReturnThis(),
      raw: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-image-data'))
    }))
  }));

  // Mock Docker
  vi.mock('dockerode', () => ({
    default: vi.fn().mockImplementation(() => ({
      createContainer: vi.fn().mockResolvedValue({
        id: 'mock-container-id',
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
        exec: vi.fn().mockResolvedValue({
          start: vi.fn().mockResolvedValue(undefined)
        })
      }),
      listContainers: vi.fn().mockResolvedValue([])
    }))
  }));
});

// Global test utilities
global.TEST_USER = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user'
};

global.TEST_REPOSITORY = {
  id: 'test-repo-id',
  name: 'test-repo',
  fullName: 'test-user/test-repo',
  userId: 'test-user-id'
};

global.TEST_SCAN = {
  id: 'test-scan-id',
  repositoryId: 'test-repo-id',
  status: 'completed',
  issuesFound: 5
};

// Utility functions for tests
global.createMockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: global.TEST_USER,
  ...overrides
});

global.createMockResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
  };
  return res;
};

global.createMockNext = () => vi.fn();

// Clean up mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});