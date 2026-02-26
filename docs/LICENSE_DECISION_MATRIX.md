# Onyx License Decision Matrix (MIT vs GPL-3.0 vs Dual-License)

**Date:** 2026-02-26  
**Project:** Onyx  
**Current license:** GPL-3.0-or-later

## Decision Status
On 2026-02-26, the project decision was made to license Onyx under **GPL-3.0-or-later**.
This matrix is retained as background rationale for that decision.

## Goal
Provide a quick, practical framework to decide whether Onyx should stay MIT, switch to GPL-3.0, or adopt a dual-license model.

## Executive Summary
- **Decision implemented:** **GPL-3.0-or-later**.
- **Rationale:** prioritize reciprocal open-source obligations for distributed derivative works.
- **Implication:** higher compliance obligations for redistributors compared with MIT.
- **Alternative path:** dual licensing remains possible later if commercial flexibility becomes a strategic requirement.

---

## Option Comparison

| Dimension | MIT | GPL-3.0 | Dual-License (e.g., GPL + Commercial) |
|---|---|---|---|
| Adoption friction | Low | Medium/High | Medium |
| Commercial friendliness | High | Lower (copyleft obligations) | High (via commercial terms) |
| Derivative code must remain open | No | Yes (when distributed) | Yes under GPL branch; no under commercial branch |
| Ecosystem compatibility | Very broad | More constrained | Depends on branch used |
| Enforcement complexity | Low | Medium | High |
| Contributor expectations | Permissive | Copyleft | Mixed/needs clarity |
| Legal/admin overhead | Low | Medium | High |

---

## Decision Criteria (Weighted)
Use this to score what matters most for Onyx.

Rate each criterion 1–5 for importance, then assign each license a fit score 1–5.

| Criterion | Weight (1–5) | MIT Fit | GPL-3.0 Fit | Dual Fit |
|---|---:|---:|---:|---:|
| Maximize user/developer adoption |  |  |  |  |
| Allow closed-source/commercial integrations |  |  |  |  |
| Force derivatives to remain open |  |  |  |  |
| Keep governance/legal overhead minimal |  |  |  |  |
| Encourage contributions from companies |  |  |  |  |
| Preserve future monetization options |  |  |  |  |

**Formula:** Weighted total = Σ(Weight × Fit).  
Choose the highest score, then validate against strategic and legal constraints.

---

## Practical Guidance for Onyx

### If the goal is to replicate functionality from GPL projects (e.g., Nyrna)
- You **do not** need to switch Onyx to GPL just to implement similar features.
- Copyright covers specific expression (code/text/assets), not abstract functionality.
- Build independently: avoid copying GPL source, comments, docs text, tests, UI assets.

### If the goal is copyleft enforcement
- GPL-3.0 is a valid strategic choice if you want derivatives that are distributed to also provide source under GPL terms.
- Expect reduced compatibility with some commercial and proprietary integrations.

### If uncertain between growth and control
- Stay MIT now and revisit in a defined review window (e.g., 6 months) with measurable criteria.
- Consider CLA/contributor policy updates before any future dual-license model.

---

## Recommendation Path (Fast)
1. Keep repository metadata and distribution artifacts aligned with **GPL-3.0-or-later**.
2. Document an internal policy for “clean-room feature parity” when referencing GPL competitors.
3. Reassess licensing only if product strategy changes (e.g., explicit move to dual-license).

---

## Risks by Choice
- **MIT risks:** third parties can ship proprietary forks.
- **GPL-3.0 risks:** lower adoption in proprietary ecosystems; more compliance burden.
- **Dual-license risks:** highest operational/legal complexity; requires clear contributor rights management.

---

## Notes
This document is a product/legal strategy aid, not legal advice. For final decisions, have counsel review distribution model, dependency licenses, and contributor IP flow.