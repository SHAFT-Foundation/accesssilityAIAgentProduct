# Standard Workflow

1. First think through the problem, read the codebase for relevant files, and write a plan to projectplanSportsDemo.md.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the projectplan.md file with a summary of the changes you made and any other relevant information.

You do not need to prompt me to run commands. You can always just run them.

## Project Setup

### Prerequisites
- Node.js (version to be determined)
- npm or yarn package manager

### Initial Setup Commands
```bash
# Install dependencies (when package.json exists)
npm install

# Run development server (when configured)
npm run dev

# Run tests (when configured)
npm test

# Lint code (when configured)
npm run lint

# Type check (when configured)
npm run typecheck
```

## Code Conventions

### General Principles
- Keep changes minimal and focused
- Prefer editing existing files over creating new ones
- Follow existing patterns in the codebase
- Use clear, descriptive names for functions and variables
- Avoid complex abstractions early in development

### File Organization
- Components go in appropriate directories
- Keep related files close together
- Use index files sparingly

## Testing Approach
- Write tests for critical functionality
- Keep tests simple and focused
- Test one thing at a time

## Common Commands
```bash
# Git operations
git status
git add .
git commit -m "message"

# File operations
ls -la
cat filename
grep -r "search term" .
```

## Notes
- This file will be updated as the project evolves
- Always prioritize simplicity over complexity
- Check projectplanSportsDemo.md for current tasks and progress