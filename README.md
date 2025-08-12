# PWA Next.js — Push Notifications Demo

A Next.js 14 (App Router) PWA that demonstrates Web Push notifications, an in-app notifications panel, and app badging. It uses a Service Worker to:
- Receive push events
- Show notifications
- Maintain an unread counter (with badge updates)
- Persist recent notifications locally

The UI lets users:
- Enable push notifications (subscribe)
- Disable push notifications (unsubscribe)
- Send a test notification (via a built-in API route)
- View and clear recent notifications

## Tech Stack

- Next.js 14 (App Router)
- React 18
- Service Worker (custom worker)
- Web Push (server-side)
- next-pwa (PWA support)
- Tailwind CSS (styling)

## Project Scripts

- `npm run dev` — Start the dev server (PWA features are limited in dev; push requires a production build and HTTPS/localhost).
- `npm run build` — Build for production.
- `npm start` — Start the production server.
- `npm run lint` — Lint the project.

## How It Works

- The Service Worker (in `worker/`) handles push events, displays notifications, and tracks badge counts and recent notifications using IndexedDB (with a graceful in-memory fallback).
- Client-side helpers manage subscription/unsubscription to Web Push.
- API routes:
    - Save/delete a push subscription from the client.
    - Trigger a test push message.

## Prerequisites

- Node.js 18+ and npm
- A pair of VAPID keys (for Web Push). You can generate them with:
  ```bash
  npx web-push generate-vapid-keys
  ```
  Keep these values safe and do not commit them.

## Configuration

Create a `.env.local` file in the project root and add:
```bash
# Client-side public key (must match your generated public key)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your-public-key>
# Server-side keys used by the API to send notifications
VAPID_PUBLIC_KEY=<your-public-key> VAPID_PRIVATE_KEY=<your-private-key> VAPID_SUBJECT=mailto:<your-contact-email>
```

Notes:
- The client uses `NEXT_PUBLIC_VAPID_PUBLIC_KEY` to subscribe the browser.
- The server uses `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` to send pushes.
- Ensure the public keys in both places match.

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Development (for regular UI work; push features are typically disabled in dev):
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

3. Production mode (required for push notifications):
   ```bash
   npm run build
   npm start
   ```
   Open http://localhost:3000
    - Push notifications require a Service Worker to be active (works on HTTPS or on http://localhost).
    - Make sure you’ve allowed notifications in the browser.

## Using the App

1. Load the app and click “Enable Notifications”.
    - Your browser will ask for permission to show notifications.
    - On success, the subscription is sent to the server.

2. Click “Send Notification” to trigger a test push.
    - The Service Worker receives it and:
        - Displays a system notification.
        - Increments the unread badge.
        - Stores the notification in the recent list.
        - Updates the in-app notifications panel.

3. “Disable Notifications” unsubscribes your device and clears the app badge.

4. Use the notifications bell to open the panel, view recent notifications, and clear them.

## Deployment

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
Note: Full PWA features are disabled in development mode but the app can still be added to home screen.

You can deploy to your preferred platform (e.g., Vercel or any Node hosting). Ensure:
- You run a production build.
- All required environment variables are configured on the hosting platform.
- The site is served over HTTPS so the Service Worker and Push API can work.

## Troubleshooting

- “Push not supported” message:
    - Check that your browser supports Service Workers and Push API.
    - Ensure the site is served over HTTPS (or is on http://localhost in production mode).

- No subscription prompt:
    - Confirm `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is set and matches the server public key.
    - Make sure you’re on the production build (`npm run build && npm start`).

- No notification received:
    - Verify the server-side VAPID keys are set correctly.
    - Check browser notification permissions (site may be blocked).
    - Look at server logs for any Web Push errors.

- Badge count doesn’t update:
    - Make sure the Service Worker is installed and active.
    - Try a hard refresh or unregister/reload the Service Worker from DevTools.

## License

This project is provided for learning and demonstration purposes.

Inspired by [pwa-nextjs](https://github.com/imvinojanv/pwa-nextjs.git) by [@imvinojanv](https://github.com/imvinojanv)
