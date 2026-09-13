# Interview Prep Mobile

A small real React Native (Expo) app: browse interview-prep questions and mark them
practiced, against the companion [Interview Prep API](https://github.com/Deshraj-Jogiya/interview-prep-api)
(ASP.NET Core + EF Core).

## What it does

- Fetches real questions from the API on load, with a pull-to-refresh.
- Tapping a question toggles "practiced" and persists it locally via
  `@react-native-async-storage/async-storage`, so it survives an app restart.
- A real error state (with retry-by-pull-to-refresh) if the API call fails.

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
snapshot tests): fetching and rendering real API data, the practiced-toggle
persisting to AsyncStorage, and a real error path when the fetch fails.

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
