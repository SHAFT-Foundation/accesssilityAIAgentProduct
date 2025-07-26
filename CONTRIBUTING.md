# Contributing to AI Accessibility Scanner

First off, thank you for considering contributing to AI Accessibility Scanner! It's people like you that make AI Accessibility Scanner such a great tool for making the web more accessible.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title** for the issue to identify the problem.
* **Describe the exact steps which reproduce the problem** in as many details as possible.
* **Provide specific examples to demonstrate the steps**. Include links to files or GitHub projects, or copy/pasteable snippets.
* **Describe the behavior you observed after following the steps** and point out what exactly is the problem with that behavior.
* **Explain which behavior you expected to see instead and why.**
* **Include screenshots and animated GIFs** which show you following the described steps and clearly demonstrate the problem.

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title** for the issue to identify the suggestion.
* **Provide a step-by-step description of the suggested enhancement** in as many details as possible.
* **Provide specific examples to demonstrate the steps**.
* **Describe the current behavior** and **explain which behavior you expected to see instead** and why.
* **Explain why this enhancement would be useful** to most AI Accessibility Scanner users.

### Pull Requests

Please follow these steps to have your contribution considered by the maintainers:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Development Process

1. **Setup your development environment**
   ```bash
   git clone https://github.com/SHAFT-Foundation/accesssilityAIAgentProduct.git
   cd accesssilityAIAgentProduct
   npm install
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clean, maintainable code
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

4. **Run tests and linting**
   ```bash
   npm run test
   npm run lint
   npm run typecheck
   ```

5. **Commit your changes**
   - Use clear and meaningful commit messages
   - Follow conventional commit format: `type(scope): description`
   - Types: feat, fix, docs, style, refactor, test, chore

6. **Push to your fork and submit a pull request**

## Style Guides

### Git Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line

### JavaScript/TypeScript Style Guide

* Use ES modules (import/export) syntax
* Destructure imports when possible
* Use TypeScript for all new code
* Follow existing naming conventions
* Add JSDoc comments for public APIs
* Use async/await instead of Promise chains
* Prefer const/let over var

### Testing

* Write unit tests for all new functionality
* Ensure all tests pass before submitting PR
* Aim for high test coverage
* Test edge cases and error conditions

## Project Structure

```
accesssilityAIAgentProduct/
├── apps/
│   ├── api/          # Backend API service
│   ├── web/          # Frontend Next.js application
│   └── pr-generator/ # PR generation service
├── packages/         # Shared packages (if any)
├── docs/            # Documentation
└── scripts/         # Build and deployment scripts
```

## Additional Notes

### Issue and Pull Request Labels

* `bug` - Something isn't working
* `enhancement` - New feature or request
* `documentation` - Improvements or additions to documentation
* `good first issue` - Good for newcomers
* `help wanted` - Extra attention is needed
* `question` - Further information is requested

## Recognition

Contributors who submit accepted pull requests will be added to our contributors list. We value all contributions, whether they're bug fixes, features, or documentation improvements!

Thank you for contributing to making the web more accessible! 🎉