# CLAUDE.md — Vaishu (Current Affairs Daily) Orchestrator
# Read this file at the start of every session. Follow every step exactly.
# One task per session. Fresh session per phase. Never continue last phase's session.

---

## THE 3-STAGE PIPELINE

Every task follows exactly this sequence. Never skip a stage. Never reorder.

  Stage 1: spec-writer  → produces frozen XML spec
  Stage 2: builder      → executes spec, writes code, fills checklist, runs tests
  Stage 3: security-auditor → verifies diff against checklist (rare loop if issues found)

The orchestrator (this file / you) handles all context injection and routing.
Subagents only see what is explicitly injected. They have no other context.

---

## STEP 0 — SESSION START (every session, no exceptions)

1. Confirm you are on a feature branch — never main.
   Run: git branch --show-current
   If on main: stop. Create feature branch first.

2. Read context/progress.md to determine current phase and pipeline checkpoint.

3. If pipeline checkpoint shows a stage already completed (session resume):
   skip to the next incomplete stage — do not re-run completed stages.

---

## STEP 1 — CLASSIFY THE TASK

Read the raw task guidance from the Guide. Classify as exactly one of:

| Classification | Criteria |
|---|---|
| AUTH | touches Firebase Auth, Google OAuth, email login, user session, protected routes |
| FIREBASE | touches Firestore reads/writes, rules, data schema — no frontend UI |
| FRONTEND | frontend-only React components, hooks, UI — no new Firestore schema changes |
| FULLSTACK | both new Firestore schema/rules AND frontend components in scope |
| AI | touches Gemini API integration, prompt engineering, response parsing |

Write the classification down. It determines Step 2.

---

## STEP 2 — ASSEMBLE CONTEXT PACKAGE

Read each file listed below and hold its contents in memory for injection.
Never inject a file that is not listed for this classification.

### Always read (every task, every classification):
  context/core.md
  context/schema.md
  context/progress.md
  context/security/golden-rules.md
  context/security/phase-{N}.md        ← current phase only

### Read additionally for FIREBASE, AUTH, FULLSTACK, AI:
  context/firebase.md

### Read additionally for FRONTEND, FULLSTACK, AI:
  context/frontend.md
  src/DESIGN_SYSTEM.md

### Never inject:
  context/firebase.md     for pure FRONTEND tasks (no schema changes)
  src/DESIGN_SYSTEM.md    for AUTH or FIREBASE-only tasks
  context/security/phase-{M}.md  for any phase other than current phase N

---

## STEP 3 — CALL SPEC-WRITER (Stage 1)

Inject the assembled context package into the spec-writer agent call.
Pass the raw task guidance as the task input.

Format of the call:

  <context>
  [paste full contents of each file from Step 2, labelled by filename]
  </context>

  <task>
  [raw task guidance from the Guide — verbatim]
  </task>

The spec-writer produces a complete XML spec.

Immediately after receiving the spec:
  Save to: .claude/specs/phase-{N}-{feature-name}.xml
  Update context/progress.md: Stage 1 complete ✓

The spec is now frozen. It cannot be changed by the builder.
If the spec is missing required fields: send it back to spec-writer with the specific gap.
Do not proceed to Stage 2 until the spec is complete.

---

## STEP 4 — RUN AUTOMATED PRE-BUILD CHECKS

Before calling the builder, run these deterministic checks.
These are grep/bash — zero LLM cost. If any fails, surface and stop.

```bash
# Confirm on feature branch
git branch --show-current | grep -v main || echo "ERROR: on main branch"

# Check for API key hardcoded in source
grep -rn "AIza\|gemini\|GEMINI" src/ | grep -v "process.env\|import.meta.env\|#\|//" \
  && echo "ERROR: possible hardcoded API key in source"

# Check for Firebase config hardcoded (should be in env vars)
grep -rn "apiKey\|authDomain\|projectId" src/ | grep -v "process.env\|import.meta.env\|firebaseConfig\|// " \
  && echo "WARNING: check Firebase config is from env, not hardcoded"

# Check for localStorage usage for auth tokens
grep -rn "localStorage" src/ | grep -iE "token|auth|key|uid|user" \
  && echo "ERROR: auth data in localStorage"

# Check for console.log with user data
grep -rn "console\.log" src/ | grep -iE "user|uid|email|key|token|phone" \
  && echo "WARNING: possible PII in console.log"

# Check for dangerouslySetInnerHTML
grep -rn "dangerouslySetInnerHTML" src/ \
  && echo "ERROR: dangerouslySetInnerHTML found"

# Confirm .env is in .gitignore
grep -q "^\.env" .gitignore || echo "ERROR: .env not in .gitignore"
```

All clean → proceed to Step 5.
Any hit → fix before calling builder. Do not proceed with a known red-flag.

---

## STEP 5 — CALL BUILDER (Stage 2)

Inject the following into the builder agent call:

  <context>
  [paste full contents of context files from Step 2]
  </context>

  <spec>
  [paste full contents of .claude/specs/phase-{N}-{feature-name}.xml]
  </spec>

The builder:
  - Declares scope before writing any code
  - Writes all files listed in spec.scope
  - Marks each security checklist item addressed=true as it is implemented
  - Writes all tests from spec.tests
  - Runs tests: npm run test (Vitest) or confirms build passes: npm run build
  - Outputs STAGE 2 COMPLETE with file list, checklist, test results

After receiving STAGE 2 COMPLETE:
  Update context/progress.md: Stage 2 complete ✓

---

## STEP 6 — CALL SECURITY AUDITOR (Stage 3)

Inject only the following — nothing else:

  <diff>
  [output of: git diff main..HEAD]
  </diff>

  <security_checklist>
  [paste full contents of .claude/agents/security-auditor.md]
  </security_checklist>

  <phase_security>
  [paste full contents of context/security/phase-{N}.md]
  </phase_security>

  <builder_checklist>
  [paste the completed checklist section from the builder's STAGE 2 COMPLETE output]
  </builder_checklist>

The auditor receives the diff only — not full files, not product context.
This is verification, not discovery.

### If STATUS: PASSED:
  Update context/progress.md: Stage 3 complete ✓
  Proceed to Step 7.

### If STATUS: ISSUES FOUND:
  Fix every issue listed — exactly as specified in the Fix snippet.
  Do not partially fix. Do not skip any issue.
  Re-run automated pre-build checks (Step 4).
  Re-call security auditor with the new diff.
  Repeat until STATUS: PASSED.

---

## STEP 7 — DONE

Notify Venkatesh. Output exactly:

  PHASE {N} COMPLETE — READY FOR REVIEW

  What was built:
  [summary of what was implemented — 3–5 sentences]

  Files created:
  [list with full paths]

  Files modified:
  [list with full paths]

  Build / Tests:
  [build green / test count passing]

  Security audit: PASSED

  Notes before you review the diff:
  [new env vars needed, Firebase rules to deploy, anything requiring manual action]

  To commit:
  git add -p   ← review each hunk
  git commit -m "phase-{N}: {description}"

Never run git commit. Never run git push.
Venkatesh reviews the diff and commits manually, always.

Update context/progress.md:
  - Sprint table: mark phase {N} status as Done
  - Replace CURRENT TASK + PIPELINE CHECKPOINT with phase {N+1} (all boxes unchecked)
  - Do NOT add completed phase detail to progress.md

Write completed phase detail to context/completed/phase-{N}.md:
  - Full checkbox list with all items marked [x]
  - Branch name, spec file name, build/test result, audit result
  - Any known deviations or accepted gaps

---

## ABSOLUTE RULES

1. Never write a single line of code before the spec is complete (spec-writer output received)
2. Never skip the automated pre-build checks (Step 4)
3. Never call the security auditor with full files — diff only
4. Never finish before security audit STATUS: PASSED
5. Never run git commit or git push — manual commit by Venkatesh only
6. Never work on the main branch
7. Never inject context/firebase.md into pure FRONTEND tasks
8. Never inject src/DESIGN_SYSTEM.md into AUTH or FIREBASE-only tasks
9. Never re-use a previous session's context for a new phase's task — fresh session always
10. Update context/progress.md at the end of every stage — crash recovery depends on it
11. Never store Gemini API key in code, localStorage, or any client-accessible location not guarded by Firebase Auth
12. Never write Firestore rules that allow unauthenticated reads on user data
