# Interview Prep Mobile

A real React Native (Expo) app for spaced-repetition interview practice, against the
companion [Interview Prep API](https://github.com/Deshraj-Jogiya/interview-prep-api)
(ASP.NET Core + EF Core, real SM-2 scheduling).

## What it does

- Shows only the questions genuinely due for practice right now (via the API's real
  SM-2 scheduling), with a live streak/mastery summary at the top.
- Tapping a question reveals a real 1-5 self-rating flow; the rating is sent to the API
  as a real practice attempt, which reschedules the question for its next real review
  date.
- **Works offline.** Interview practice happens on trains, in waiting rooms, wherever
  connectivity is unreliable -- an attempt made with no network is saved locally
  immediately, never lost, and synced automatically the next time a real request
  succeeds (on app load or pull-to-refresh). This is the actual reason this needs to be
  a native client rather than a thin wrapper around the web API.
- A real error state (with retry-by-pull-to-refresh) if the initial API call fails, and
  a friendly empty state when nothing is due.

## Running it

```bash
npm install
export EXPO_PUBLIC_API_URL=http://localhost:5000   # or wherever the API is running
npm start
```

## Testing

```bash
npm test
```

Real tests (`@testing-library/react-native`, mocked `fetch`/`AsyncStorage`, not
snapshot tests): fetching and rendering real due questions plus real stats, the full
rate-a-question flow posting a real attempt and removing it from the due list, the
offline path queuing a failed attempt locally instead of losing it, the error path when
the initial fetch fails, and the empty-state when nothing is due. A separate suite
covers the offline queue hook directly: a successful POST is never queued, a failed one
is queued and preserved, and `flushQueue` retries each queued attempt for real,
clearing the ones that succeed and leaving the ones that still fail queued rather than
dropping them.

## Verifying a real build

This environment has no Android/iOS emulator, and this author's build host is
ARM64 Linux, where Hermes' prebuilt bytecode compiler has no Linux/arm64 build
(a real, reproducible failure — not an app bug). The app was instead verified
via a real Metro **web** export (`expo export --platform web`), served over
nginx, loaded in a real headless Chromium (Playwright) on the same Docker
network as a real running instance of the companion API, and confirmed to
render all 4 real seeded questions fetched live over the network with zero
console errors. Metro bundling itself is platform-agnostic; only the final
native bytecode step is Hermes/architecture-specific.

## Tech

React Native, Expo, TypeScript, AsyncStorage, React Native Testing Library.
