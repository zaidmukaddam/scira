# AI Documentation

Technical documentation, analysis, and guides for the Scira self-hosted instance.

## Purpose

Comprehensive technical documentation for developers working on this self-hosted fork.

## File Organization

Documentation is organized by topic/feature:
- Architecture documents
- Setup and configuration guides
- Development guides
- Technical analysis and decisions
- API documentation

## Current Documents

### Implementation Documentation

1. **SUPERMEMORY_GRACEFUL_DEGRADATION.md**
   - Implementation of graceful degradation for Supermemory features
   - How to handle missing/placeholder API keys
   - Pattern for optional feature dependencies
   - Testing procedures

2. **MCP_SEARCH_INTEGRATION.md**
   - Re-enabling Model Context Protocol search
   - Integration with Smithery Registry
   - Usage and testing guide
   - Future enhancement ideas

3. **AI_PROVIDER_CHANGES.md**
   - Change from Anannas to xAI for scira-name model
   - Provider consolidation rationale
   - Performance and reliability improvements
   - Migration notes

4. **DEFAULT_SEARCH_PROVIDER_CHANGE.md**
   - Switch from 'parallel' to 'tavily' as default search provider
   - Performance and cost benefits
   - Provider comparison and use cases
   - Configuration requirements

### External References

- **`ai_quickstart.md`** (in project root) - Quick reference for self-hosted setup

## Guidelines for New Documentation

1. Use clear, descriptive filenames
2. Include code examples where appropriate
3. Keep documentation current with implementation
4. Link to related files and resources
5. Include troubleshooting sections

## Last Updated

2025-11-03
