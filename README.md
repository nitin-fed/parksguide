# ParksGuide

An iOS-first React Native app for exploring U.S. National Park Service sites, built with Expo (SDK 57), Expo Router and TypeScript on the [NPS data API](https://www.nps.gov/subjects/developer/api-documentation.htm). Android works from the same code when you're ready.

## Features

- **Explore**: search all ~470 NPS sites by name or keyword, filter by state, infinite scroll.
- **Map**: every park pinned on Apple Maps; tap a pin's callout to open the park.
- **Park page**: photos, description, current alerts, location map, hours, entrance fees, campgrounds (with reservation links), weather, activities, directions in Apple Maps.
- **Alerts**: live alerts for the parks in your trips, or for any state, filterable by Danger, Park Closure, Caution and Information.
- **Trips**: create trips with dates, add parks from any park page, reorder stops, set visit dates and notes, see the route on a map and any closures or danger alerts along the way. Trips are saved on the device.
- **Chat**: ask an AI assistant about parks, get recommendations, and plan your visits. The assistant has context about your trips and active park alerts (powered by Groq free tier).

## Run it

1. Get a free NPS API key: https://www.nps.gov/subjects/developer/get-started.htm
2. Set it up:
   ```bash
   cp .env.example .env
   # edit .env and paste your key after EXPO_PUBLIC_NPS_API_KEY=
   npm install
   ```
3. (Optional) Set up the chat feature:
   - Deploy the proxy server from `server/` (see `server/README.md`)
   - Add chat API config to `.env` (see `.env.example`)
   - Or skip this for now; the chat tab will show a config error until you set it up
4. Start it:
   ```bash
   npx expo start
   ```
   Scan the QR code with the Camera app to open it in **Expo Go** on your iPhone, or press `i` to open the iOS Simulator (needs Xcode on a Mac).

Maps, images, storage, and chat all work in Expo Go (chat requires a deployed proxy server). No Xcode build is needed to try it.

## Build for the App Store

See [EAS_SETUP.md](./EAS_SETUP.md) for a complete step-by-step guide to building and submitting to the App Store.

Quick summary:
```bash
npm install -g eas-cli@latest
eas login
eas init
eas env:create  # Set up EXPO_PUBLIC_CHAT_API_URL and EXPO_PUBLIC_CHAT_APP_TOKEN
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

The bundle identifier is `com.nitinfed.parksguide` in `app.json`; change it before your first build if you want a different one.

## Android later

`app.json` already has an Android package name. Maps on Android use Google Maps, which needs a Google Maps API key added under `android.config.googleMaps.apiKey` in `app.json` for store builds. Then run `npx expo start` and press `a`, or `npx eas-cli@latest build --platform android`.

## Project layout

```
src/app/                 screens (Expo Router: each file is a route)
  (tabs)/index.tsx       Explore / search
  (tabs)/map.tsx         Map of all parks
  (tabs)/alerts.tsx      Alerts
  (tabs)/trips.tsx       Trip list + create
  (tabs)/chat.tsx        Chat assistant tab
  park/[code].tsx        Park details
  trip/[id].tsx          Trip planner
  chat/[tripId].tsx      Trip-scoped chat
src/api/nps.ts           NPS API client and types
src/api/chat.ts          Chat proxy client
src/state/trips.tsx      Trip storage (AsyncStorage)
src/state/chat.tsx       Chat state and context (AsyncStorage)
src/lib/chatContext.ts   Build chat context from trip + alerts
src/components/ui.tsx    Shared UI pieces
src/components/ChatView.tsx Chat UI component
src/theme/               Colors (light and dark) and the state list
server/                  Chat proxy server (separate Node.js app)
  src/index.ts           Express server with Groq integration
  .env.example           Server env vars (Groq API key, app token)
  README.md              Deployment guide for Hostinger
```

## Checks

```bash
npm run typecheck
npx eslint src
```

## A note on the API key

`EXPO_PUBLIC_*` values are compiled into the app, so the key ships inside the binary. That's normal for the free, rate-limited NPS key (1,000 requests per hour), but don't reuse a key that grants access to anything else.
