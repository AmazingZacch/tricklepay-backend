#345 Document the operational runbook for a failing database
Repo Avatar
TricklePay/tricklepay-backend
Summary
A database outage affects the read API and the indexer differently, and an operator needs to know which symptoms to expect and what recovers automatically.

Acceptance criteria
 A runbook describes the symptoms of a database outage.
 It states what recovers automatically and what needs intervention.
 It names the relevant metrics.
Getting started
Fork this repository, clone your fork, and add this repo as upstream:

git clone https://github.com/<your-username>/tricklepay-backend.git
cd tricklepay-backend
git remote add upstream https://github.com/TricklePay/tricklepay-backend.git
Create a branch for this issue:

git checkout -b docs/issue-345
Suggested commit message:

docs: add a runbook for a database outage
Run npm run typecheck, npm test, and npm run build before opening a pull request and linking this issue.


