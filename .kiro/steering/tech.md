# Technology Stack

## Development Environment
- **AI Assistant**: Kiro with autonomous and supervised modes
- **Platform**: macOS (darwin) with zsh shell
- **Package Management**: Support for multiple package managers (npm, pip, cargo, etc.)

## Common Commands
Since this is a foundational workspace, specific build commands will depend on the technology stack chosen:

### General Development
```bash
# Initialize new projects
npm init                    # Node.js projects
python -m venv venv        # Python virtual environment
cargo init                 # Rust projects
```

### Code Quality
```bash
# Linting and formatting (when configured)
npm run lint               # JavaScript/TypeScript
black .                    # Python formatting
cargo fmt                  # Rust formatting
```

### Testing
```bash
# Run tests (when configured)
npm test                   # Node.js
pytest                     # Python
cargo test                 # Rust
```

## Best Practices
- **Use Context7 for all technical decisions** - Consult Context7 documentation for libraries, frameworks, and implementation patterns to ensure best practices
- Use version control (Git) for all projects
- Follow language-specific style guides from Context7 resources
- Implement automated testing following Context7 recommendations
- Use environment variables for configuration
- Document APIs and complex logic
- Reference Context7 for architecture decisions and design patterns