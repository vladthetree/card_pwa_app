# Security card review incident — 2026-08-15

## Result

- Profile: `Vlad`
- Active cards: 1,075
- Exact current review records: 1,075
- Approved unchanged: 882
- Corrected/restored: 177
- Kept in the explicit not-relevant archive: 16
- Missing, duplicate, stale, or invalid reviews: 0
- Pending proposals: 0

The result is recorded in `vlad-card-review-registry.json` and verified by
`vlad-card-review-report.json`. Every decision is bound to the exact semantic
content hash of note ID, deck, front, back, tags, and extra content. Learner
scheduling metadata is deliberately excluded from this hash.

## Reported card 1772578430967

Verified result:

- Stem: consensus plus hash-linked blocks whose later modification breaks the
  subsequent chain
- Correct answer: `B — Blockchain`
- Requirement: `req:sy0701:v7:1.4:blockchain`
- Verdict: `corrected`

CompTIA lists Hashing, Salting, Digital signatures, Key stretching, and
Blockchain as distinct Objective 1.4 concepts. NIST defines blockchain through
distributed ledgers, validation/consensus, cryptographically linked blocks, and
tamper evidence. NIST defines a salt as a separate value used in a cryptographic
process; its password guidance uses salts as inputs to password hashing.

Primary references:

- [CompTIA Security+ SY0-701 V7 objectives](https://lecbyo.files.cmp.optimizely.com/download/cf25ec24b8a511ef9ecbb69c0f9687be)
- [NIST blockchain definition](https://csrc.nist.gov/glossary/term/blockchain)
- [NISTIR 8202 — Blockchain Technology Overview](https://doi.org/10.6028/NIST.IR.8202)
- [NIST salt definition](https://csrc.nist.gov/glossary/term/salt)
- [NIST SP 800-63B password verifier requirements](https://pages.nist.gov/800-63-4/sp800-63b.html#passwordver)

The operation history proves that two revisions were mixed:

1. The earlier card asked which item was *not* a blockchain transaction step;
   its keyed answer was `A`, “The value of the block is determined.”
2. On 2026-08-12, the reviewed style revision changed the stem to the current
   concept-description question and correctly keyed `B — Blockchain`, with a
   matching explanation.
3. Client operation `01a0070f-eb90-7bdd-9786-647dccdf6843` on 2026-08-15 wrote
   the current stem together with the stale explanation from the old question.
   The user's manual edit restored the `B` key, but the explanation remained
   unrelated until this incident repair.
4. Gateway operation
   `security-card-review-gateway-v1:card.update:1772578430967:2284a8a5aab329ae`
   restored the coherent reviewed revision.

The exact pre-incident study state was compared with the repaired row. All
FSRS/scheduling fields, answer-timing metadata, and review history remained
unchanged; only reviewed authoring content, its timestamp, and publisher changed.

## Root cause

The normal sync endpoint and especially bootstrap upload previously applied a
whole client card under reps-first/LWW conflict resolution. Higher learner
progress could therefore make an old local front/back revision overwrite newer
reviewed server content. The old QA also treated structural validity, a reviewer
label, and attached source URLs as sufficient for approval; it did not prove
that the exact front, key, explanation, and distractors formed one semantically
correct revision.

## Permanent controls

1. For Vlad, untrusted changes to note ID, deck, front, back, tags, extra content,
   or deletion are now inserted into `content_review_queue` as proposals.
2. Existing reviewed content stays active and learnable while the proposal is
   reviewed. Scheduling, FSRS state, answer timing, and review history continue
   to sync normally.
3. Bootstrap upload follows the same boundary and cannot publish a stale card
   merely because it has higher reps.
4. Only `security-card-review-gateway-v1` is authoritative in the PWA. The old
   self-approving QA and general maintenance publisher no longer have that
   privilege.
5. Publication requires explicit evidence, official source URLs, a verdict,
   reviewer, timestamp, requirement mapping, exact keyed answer, and an exact
   semantic content hash. A SQLite backup is created before writes.
6. The personal Codex skill `review-security-cards` requires semantic review of
   every in-scope card and forbids approval based on structure, URLs, labels, or
   equality with another profile.

## Verification

```text
Gateway: 1075 active / 1075 current reviews / 0 errors / 0 pending
Server tests: 86 passed (including 4 new gateway tests)
PWA sync tests: 31 passed
Production build: passed
Skill validation: passed
```

Backups:

- `backups/content-review-gateway/sync.db.before-content-review-20260815T214433Z.sqlite`
- `backups/content-review-gateway/sync.db.before-content-review-20260815T214659Z.sqlite`
