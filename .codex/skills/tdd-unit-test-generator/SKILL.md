---
name: tdd-unit-test-generator
description: Generate unit tests from feature requirements using a strict TDD workflow (test-first, then implementation). Use when Codex receives requests like "напиши тесты", "сгенерируй тесты", "покрой тестами", "unit тесты по фиче", "tdd first", "test first", "generate unit tests", or "write tests from requirements" and must produce positive and negative tests that respect existing project behavior, architecture, conventions, and dependency contracts.
---

# TDD Unit Test Generator

## Mandatory Rules

- Write tests before implementation logic.
- Ensure new tests enter a red phase before implementation is added.
- Accept red-phase failures only when they are structurally valid for TDD (assertion mismatch, expected `Not implemented`, contract violation), not due to broken imports, syntax errors, or unresolved references.
- Derive tests from requirement constraints and existing project context. Do not invent scenarios "just in case".

## Overview

Generate production-ready unit tests from a requirement while preserving compatibility with the existing project. Prioritize behavior coverage, including both happy-path and failure-path assertions, and align test style with the repository's established conventions.

## Workflow

1. Inspect existing implementation and tests.
2. Parse the requirement into explicit behaviors and constraints.
3. Identify test stack and project conventions.
4. Build a scenario matrix with positive and negative cases.
5. Write tests in small TDD-friendly increments.
6. Add minimal structural code (signatures/interfaces/stubs) to the project so tests compile and execute.
7. Run tests and verify red phase quality.
8. Validate coverage and consistency before finishing.

## Parse Requirement

Convert the requirement into:
- Inputs, outputs, and side effects
- Validation rules and error behavior
- Boundary and edge conditions
- Non-goals (what must not happen)

If the requirement is ambiguous or silent about error behavior, do not guess. Flag ambiguity and request clarification for undocumented constraints.

If the requirement is unambiguous but incomplete, make minimal assumptions informed by existing system behavior and document each assumption.

## Inspect Existing Code First

Before adding tests, inspect:
- Existing unit tests for style and fixture patterns
- Target module dependencies and data contracts
- Error types/messages/status conventions
- Async error handling style
- Existing mocks/stubs/helpers to reuse
- System invariants, database constraints, and business rules that may be affected
- Existing tests with regression risk

Prefer extending current test files and helpers instead of creating parallel patterns.

## Discover Test Conventions

Mirror project norms for:
- Framework and assertion library
- Test file location and naming
- Arrange/Act/Assert or Given/When/Then structure
- Mocking approach (spies, fakes, module mocks)
- Parameterized/table-driven style

Do not introduce a new test framework unless explicitly requested.

## Build Scenario Matrix

### Scenario Generation Order

Generate scenarios in this order:
1. Contract tests (inputs, outputs, signatures, return types)
2. Positive scenarios from requirement
3. Negative scenarios from requirement constraints
4. Negative scenarios from existing project context
5. Regression guards for nearby behavior

### Positive Cases

- Valid input returns expected result
- Typical business flow with representative data
- Side effects occur expected number of times
- Idempotent/repeat behavior when required

### Negative Cases - Source Rule

Negative cases are derived only from two sources.

Source 1 - Requirement document:
- Explicit validation rules
- Explicit error conditions
- Explicit boundary values
- Explicit format constraints
- Explicit preconditions

Source 2 - Existing project context:
- System invariants at risk
- Contracts of called modules/services
- Database constraints
- Existing business rules
- Known dependency failure modes

If a negative scenario is not justified by one of these sources, do not add it.

### Coverage Rule

- Each documented requirement has at least one positive test.
- Each documented constraint has at least one negative test.
- Each at-risk invariant/contract has at least one negative test.
- Negative tests assert specific error type/message/status when specified by requirement or contract.

### What Not To Add

- No generic `null/undefined/empty` negatives unless explicitly forbidden.
- No security/injection negatives unless explicitly in scope.
- No infra-failure negatives (for example, DB down) unless the project already models that behavior.

## Write Tests in TDD Style

1. Start with the most critical failing behavior.
2. Add one focused test at a time.
3. Keep names behavior-oriented: `Should_ExpectedBehavior_When_Condition`.
4. Assert observable outcomes, not private implementation details.
5. Keep setup minimal and deterministic.
6. Verify red phase before business logic implementation.

Prefer deterministic fixtures over random data. Freeze time or seed randomness when needed.

## Minimal Structural Code

Add minimal structural code to the project before implementation logic:
- Module files and exports
- Interfaces and types
- Function/class signatures
- Constructor and dependency-injection seams
- Explicit stubs (`throw new Error("Not implemented")` or equivalent)

Do not add business logic in this phase.

## Quality Gate Before Finish

Check that tests:
- Enter red phase for valid reasons before implementation logic
- Are isolated and order-independent
- Verify one behavior contract per test
- Avoid brittle snapshots unless required by project standards
- Reuse existing helpers/utilities
- Include positive and negative scenarios from matrix
- Cover documented requirements and constraints
- Avoid unjustified "just in case" scenarios

If available, run targeted test commands for changed files first, then broader suites.

## Output Format

Always include:
- Coverage Matrix
- Test Summary
- Assumptions
- Uncovered Risks

If you edited repository files directly, summarize created/updated test files and key decisions.

If the user explicitly asks for inline code in chat, include:
- Architecture code (minimal structural code only, if used)
- Test code
with each block labeled by target file path.

### Coverage Matrix

| Requirement | Type (positive/negative) | Source | Test(s) |
|-------------|--------------------------|--------|---------|
| ...         | positive/negative        | requirement/project-context | test names |

### Test Summary

- Positive tests added: N
- Negative tests added (from requirement): M
- Negative tests added (from project context): K
- Regression guards noted: R
- Total: N+M+K+R

### Assumptions

- List assumptions made due to unclear requirements.
- List unavailable project context that should be verified.

### Uncovered Risks

- Note requirement gaps, missing error specs, or untestable behavior.
- Flag requirements that need clarification before implementation.
