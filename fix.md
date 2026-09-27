Summary
When indexing stalls an operator needs a checklist: what to look at, which metric confirms it, and what to do. That knowledge is not written down anywhere.

Acceptance criteria
 A runbook describes how to diagnose a stalled indexer.
 It names the metrics and log lines to check.
 It lists the recovery steps in order.
Getting started
Fork this repository, clone your fork, and add this repo as upstream:

git clone https://github.com/<your-username>/tricklepay-backend.git
cd tricklepay-backend
git remote add upstream https://github.com/TricklePay/tricklepay-backend.git
Create a branch for this issue:

git checkout -b docs/issue-344
Suggested commit message:

docs: add a runbook for a stalled indexer
Run npm run typecheck, npm test, and npm run build before opening a pull request and linking this issue.