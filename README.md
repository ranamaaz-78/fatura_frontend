# YK Digital Solutions Frontend

React + Vite web app, packaged for Android and iOS with Capacitor.

Requires **Node 20+**.

## Install

```bash
cd fatura_frontend
npm install
```

## Environment

Copy `.env.example` to `.env` if `.env` does not exist:

```env
VITE_API_URL=http://localhost:8000/api
```

Keep the Laravel API running on port 8000 while developing.

## Run (web)

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The home page calls `GET /health` and should show **Backend connected**.

## Mobile apps

```bash
npm run cap:android
npm run cap:ios
```

`cap:ios` only works on macOS with Xcode and CocoaPods. On Windows, Android is available; iOS was not added.

These scripts build the web app, run `npx cap sync`, then open Android Studio or Xcode.

You can also sync without opening an IDE:

```bash
npm run cap:sync
```

### Development HTTP (must be removed for production)

The local API uses plain `http`. For development only:

- Capacitor `android.allowMixedContent` is enabled in `capacitor.config.json`
- Android `android:usesCleartextTraffic="true"` is set in `android/app/src/main/AndroidManifest.xml`

Remove both once the API is served over HTTPS in production.

## Mobile network note

`localhost` inside a phone or emulator means the device itself, not the computer. For device testing set `VITE_API_URL` to the computer's LAN IP, for example `http://192.168.1.10:8000/api`. The Android emulator can also use `http://10.0.2.2:8000/api`. Then rebuild:

```bash
npm run cap:sync
```
