# CLAUDE.md - Lucidia Agents

This file provides guidance for AI assistants working with the Lucidia Agents codebase.

## Project Overview

Lucidia Agents is an AI agents framework designed to create, orchestrate, and deploy intelligent autonomous agents. The project aims to provide a modular, extensible architecture for building agent-based systems.

## Current State

**Repository Status**: Greenfield project - initial setup required.

**What exists now:**
- This CLAUDE.md file (project guidance)
- Git repository initialized

**What needs to be created:**
- Project scaffolding (package.json, tsconfig.json, etc.)
- Source directory structure
- Core framework components
- Testing infrastructure
- Documentation

## Planned Project Structure

When fully scaffolded, the project should follow this structure:

```
lucidia-agents/
├── src/                    # Source code
│   ├── agents/             # Agent implementations
│   ├── core/               # Core framework components
│   ├── memory/             # Memory and context management
│   ├── tools/              # Tool definitions and implementations
│   ├── orchestration/      # Multi-agent orchestration
│   └── utils/              # Utility functions
├── tests/                  # Test files
│   ├── unit/               # Unit tests
│   └── integration/        # Integration tests
├── docs/                   # Documentation
├── examples/               # Example implementations
├── config/                 # Configuration files
└── scripts/                # Build and deployment scripts
```

## Technology Stack

- **Language**: TypeScript (strict mode enabled)
- **Runtime**: Node.js >= 18.x
- **Package Manager**: npm or pnpm
- **Testing**: Vitest (preferred) or Jest
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier

## Initial Setup Tasks

For AI assistants bootstrapping this project, follow these steps:

### 1. Initialize Node.js Project

```bash
npm init -y
```

### 2. Install Core Dependencies

```bash
# TypeScript and build tools
npm install -D typescript tsx @types/node

# Linting and formatting
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier

# Testing
npm install -D vitest @vitest/coverage-v8
```

### 3. Create Configuration Files

Required configuration files:
- `tsconfig.json` - TypeScript configuration (strict mode)
- `.eslintrc.json` or `eslint.config.js` - ESLint configuration
- `.prettierrc` - Prettier configuration
- `.gitignore` - Git ignore patterns
- `.env.example` - Environment variable template

### 4. Create Directory Structure

```bash
mkdir -p src/{agents,core,memory,tools,orchestration,utils}
mkdir -p tests/{unit,integration}
mkdir -p docs examples config scripts
```

## Development Commands

Once set up, use these standard commands:

```bash
npm install          # Install dependencies
npm run dev          # Run development server
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run build        # Build for production
npm run lint         # Lint code
npm run format       # Format code
npm run typecheck    # Type check
```

## Code Conventions

### TypeScript Guidelines

1. **Strict mode enabled** - Use `"strict": true` in tsconfig.json
2. **Explicit types** - Avoid `any`; use proper interfaces and type definitions
3. **Interface-driven design** - Define clear interfaces for agent capabilities
4. **Immutability preferred** - Use `readonly` and `const` where appropriate

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `my-agent.ts` |
| Classes | PascalCase | `class MyAgent` |
| Functions/Variables | camelCase | `const myFunction` |
| Constants | UPPER_SNAKE_CASE | `const MAX_RETRIES` |
| Interfaces | PascalCase (no I prefix) | `interface Agent` |
| Types | PascalCase | `type AgentConfig` |

### Directory Conventions

- Agent implementations: `src/agents/`
- Shared tools: `src/tools/`
- Core framework: `src/core/`
- Tests: `tests/unit/` and `tests/integration/` (or co-located `*.test.ts`)
- Configuration schemas: `src/config/` or `config/`

## Agent Development Patterns

### Base Agent Interface

All agents should implement a common interface:

```typescript
interface Agent {
  readonly id: string;
  readonly name: string;
  execute(input: AgentInput): Promise<AgentOutput>;
}
```

### Tool Registration

Tools should be registered with type-safe schemas:

```typescript
interface Tool<TInput, TOutput> {
  name: string;
  description: string;
  schema: ZodSchema<TInput>;
  execute(input: TInput): Promise<TOutput>;
}
```

### Memory Architecture

- **Short-term Memory**: Conversation/task context
- **Long-term Memory**: Persistent knowledge
- **Working Memory**: Current task state

## Testing Requirements

1. **Unit Tests**: Required for utility functions and core logic
2. **Integration Tests**: Required for agent workflows and tool integrations
3. **Coverage Target**: >80% on core modules
4. **Test Naming**: `*.test.ts` or `*.spec.ts`

```bash
npm test                    # Run all tests
npm test -- path/to/test    # Run specific test
npm test -- --coverage      # Run with coverage
```

## Git Workflow

### Branch Naming

- Features: `feature/description`
- Bug fixes: `fix/description`
- Refactoring: `refactor/description`
- Documentation: `docs/description`

### Commit Messages

Use conventional commits:

```
type(scope): description

[optional body]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Security Considerations

1. **Input Validation**: Always validate and sanitize inputs
2. **Secret Management**: Use environment variables, never hardcode
3. **Least Privilege**: Agents request minimal permissions
4. **Audit Logging**: Log security-relevant actions

## Environment Variables

Create `.env` from `.env.example`:

```bash
# API Keys
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Configuration
LOG_LEVEL=info
NODE_ENV=development
```

## AI Assistant Guidelines

### Do

- Read existing code before making changes
- Follow established patterns in the codebase
- Write tests for new functionality
- Use TypeScript types properly
- Keep changes focused and minimal
- Commit with descriptive messages following conventional commits

### Don't

- Make changes without understanding context
- Introduce dependencies without justification
- Skip error handling
- Ignore existing conventions
- Over-engineer solutions
- Leave debug code or console.logs in production code

### Pre-Commit Checklist

- [ ] Code compiles without errors (`npm run typecheck`)
- [ ] All tests pass (`npm test`)
- [ ] New code has test coverage
- [ ] No security vulnerabilities introduced
- [ ] Documentation updated if needed
- [ ] Follows project conventions

---

*Last updated: January 2026*
*Status: Greenfield project awaiting initial scaffolding*
