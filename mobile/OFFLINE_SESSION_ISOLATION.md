# Offline Session Isolation

## Storage and Ownership

- New SQLite tables use the `_v2` suffix. Data, subscription access, CALE questions/checkpoints and pending commands are partitioned by user, school, branch and role. The profile bootstrap cache is keyed only by its exact authenticated user.
- Logout invalidates the active scope and unmounts account-owned screen state. It does not erase pending work. Logging into the same account and access scope makes that work available again.
- Pending commands keep their original owner, payload and command ID. Blank IDs in new forms generate distinct IDs; duplicate existing commands cannot overwrite one another. Snapshot refreshes overlay unapplied commands.
- Old unscoped tables remain untouched and are never read or synchronized. They are quarantined, not migrated into the next user's account. Recovery requires an explicit, audited determination of ownership; no automatic reassignment or deletion is safe.
- A school/branch/role change leaves the old scope's commands intact but unavailable to the new scope. Their recovery is a separate administrative decision.

## Authentication and Replay

- Auth callbacks perform synchronous state changes only. Loads run in React effects outside Supabase's auth lock.
- Data clients pin the captured access token and check the session/scope immediately before dispatch and after the response. Late results cannot populate a replacement session's state or cache.
- Replay requires a fresh online profile and is serialized per scope. A failure stops the batch to preserve command ordering. Interrupted commands remain retryable with the original idempotency key; an unknown command is never marked applied.
- Offline logout removes the persisted SDK credentials and writes a durable logout marker. Online logout also requests local-session revocation. SDK/storage errors propagate to the caller, even after local isolation. A later explicit login clears the marker only after credential cleanup.
- An expired persisted session can identify the same offline account after a connectivity failure. It cannot bypass a logout marker or an authorization error, and cached profiles never authorize online replay.

## Verification

From the repository root, using the existing root Vitest installation:

```sh
npx vitest run --config mobile/vitest.offline.config.ts
npm --prefix mobile run typecheck
npx eslint mobile/src/lib/offline.ts mobile/src/lib/data.ts mobile/src/lib/session-scope.ts mobile/src/lib/local-auth.ts mobile/src/context/app-context.tsx mobile/offline-tests mobile/vitest.offline.config.ts --max-warnings 0
```

Tests use Node's `node:sqlite` in-memory database, the installed Supabase SDK with mocked HTTP/native storage, and React provider regression tests. Node 22.13+ is needed for `node:sqlite`; verification used Node 24. No new dependencies, remote database changes or deployments are required.

## Remaining Release Checks

- Validate the actual Android build on a device: create two offline records as A, log out in airplane mode, restart, log in as B and confirm A's data/counts are absent, then return as A and synchronize each command once. Repeat with CALE and with a school/role change.
- Force-stop during an in-flight command, then retry as the original user and verify the server's idempotency behavior. This work preserves IDs but cannot retract a request already received by the server.
- Offline logout cannot revoke tokens on an unreachable server. Local credentials/access are removed; server-side authorization and token lifetime remain server responsibilities.
- These tests do not certify native SQLite/SecureStore behavior, Android backup/encryption policy, server RLS/RPC authorization, or Google Play approval. No Android versions/build files or store declarations were changed here.
