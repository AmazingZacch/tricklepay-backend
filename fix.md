#343 Document the retry and backoff behaviour
Repo Avatar
TricklePay/tricklepay-backend
Summary
Repeated RPC failures are backed off rather than retried immediately, which affects how quickly the indexer recovers and how much load it puts on a provider.

Acceptance criteria
 The documentation explains the retry and backoff behaviour.
 It states the bounds applied.
 The description matches the implementation.
Getting started
Fork this repository, clone your fork, and add this repo as upstream:

git clone https://github.com/<your-username>/tricklepay-backend.git
cd tricklepay-backend
git remote add upstream https://github.com/TricklePay/tricklepay-backend.git
Create a branch for this issue:

git checkout -b docs/issue-343
Suggested commit message:

docs: document the retry and backoff behaviour
Run npm run typecheck, npm test, and npm run build before opening a pull request and linking this issue