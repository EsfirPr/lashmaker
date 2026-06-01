# Test Design Checklist

## 1) Requirement Intake

- Extract explicit requirements only: behavior, constraints, boundaries, error conditions, and preconditions.
- Mark ambiguous or missing error behavior; do not guess undocumented constraints.
- Record assumptions separately and keep them minimal.

## 2) Pre-Write Scan (Project Context)

- Locate existing tests near the target module.
- Reuse project fixtures, factories, helpers, and mocks.
- Confirm naming conventions, assertion style, and test file placement.
- Confirm async error handling and exception patterns.
- Identify system invariants, business rules, and DB constraints relevant to the feature.
- Identify existing tests with regression risk.

## 3) Scenario Matrix Order

Generate scenarios strictly in this order:
1. Contract tests (inputs/outputs/signatures/return types)
2. Positive scenarios from requirement
3. Negative scenarios from requirement constraints
4. Negative scenarios from project context
5. Regression guards

## 4) Positive Case Prompts

- What is the representative valid input?
- What observable output or state transition is required?
- Which side effects are required (and how many times)?
- Which invariants must remain true after execution?

## 5) Negative Case Source Rule

Negative tests are allowed ONLY from these sources:

- Requirement document:
  - Explicit validation rules
  - Explicit error conditions
  - Explicit boundary limits
  - Explicit format constraints
  - Explicit preconditions
- Existing project context:
  - System invariants
  - Service/module contracts
  - Database constraints
  - Existing business rules
  - Known dependency failure modes

If a negative scenario is not justified by one of these sources, do not add it.

## 6) Do-Not-Add Guardrails

- No generic null/undefined/empty negatives unless explicitly forbidden by requirement or contract.
- No security/injection negatives unless sanitization/security behavior is explicitly in scope.
- No infra-failure negatives (for example, DB down) unless this failure mode already exists in project behavior.

## 7) TDD Execution Checks

- Write tests before implementation code.
- Confirm tests fail before implementation exists.
- Confirm failures are for expected reasons (assertion/contract), not setup/import/syntax errors.
- Add tests incrementally, one behavior at a time.

## 8) Anti-Brittleness Checks

- Assert observable behavior, not internal implementation details.
- Avoid overspecified mocks that prevent refactoring.
- Avoid snapshot overuse for simple scalar or structural checks.
- Keep each test focused on a single behavior contract.
- Keep setup deterministic (seed randomness, freeze time when needed).

## 9) Coverage Checks

- Every documented requirement has at least one positive test.
- Every documented constraint has at least one negative test.
- Every at-risk invariant or contract has at least one negative test.
- Positive and negative scenarios are both present in the final set.

## 10) Delivery Format Checks

Include in final output:
- Coverage Matrix with columns: Requirement, Type, Source, Test(s)
- Test Summary:
  - Positive tests added
  - Negative tests added from requirement
  - Negative tests added from project context
  - Regression guards noted
  - Total
- Assumptions
- Uncovered Risks
