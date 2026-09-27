#346 Document the expected resource footprint
Repo Avatar
TricklePay/tricklepay-backend
Summary
Anyone deploying the service needs a rough idea of memory, connection and storage use, and there is no guidance at all today.

Acceptance criteria
 The documentation gives an indicative resource footprint.
 It states the database connection usage.
 It notes how event volume affects storage growth.
Getting started
Fork this repository, clone your fork, and add this repo as upstream:

git clone https://github.com/<your-username>/tricklepay-backend.git
cd tricklepay-backend
git remote add upstream https://github.com/TricklePay/tricklepay-backend.git
Create a branch for this issue:

git checkout -b docs/issue-346
Suggested commit message:

docs: document the expected resource footprint
Run npm run typecheck, npm test, and npm run build before opening a pull request and linking this issue.


