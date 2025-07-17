# Project Structure

## Kiro Configuration
```
.kiro/
├── steering/           # AI assistant guidance documents
│   ├── product.md     # Product overview and purpose
│   ├── tech.md        # Technology stack and commands
│   └── structure.md   # Project organization guide
└── settings/          # Kiro-specific settings (when configured)
    └── mcp.json       # Model Context Protocol configuration
```

## Recommended Project Organization

### General Structure
```
project-root/
├── src/               # Source code
├── tests/             # Test files
├── docs/              # Documentation
├── config/            # Configuration files
├── scripts/           # Build and utility scripts
├── .gitignore         # Git ignore patterns
├── README.md          # Project documentation
└── package.json       # Project metadata (Node.js)
   or requirements.txt # Python dependencies
   or Cargo.toml       # Rust project file
```

### Language-Specific Conventions

#### JavaScript/TypeScript
- Use `src/` for source code
- Use `dist/` or `build/` for compiled output
- Place types in `types/` or alongside source files
- Use `__tests__/` or `.test.js` for test files

#### Python
- Use `src/` or package name for source code
- Use `tests/` for test files
- Include `requirements.txt` or `pyproject.toml`
- Use virtual environments

#### Rust
- Follow Cargo conventions (`src/main.rs`, `src/lib.rs`)
- Use `tests/` for integration tests
- Place examples in `examples/`

## File Naming Conventions
- Use kebab-case for directories and files when possible
- Use descriptive names that indicate purpose
- Group related functionality in modules/packages
- Keep configuration files at project root