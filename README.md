# Divine Counter - Android App with Google Drive Backup

This project is a hybrid Android application built with **Capacitor**, **Vite**, and **Tailwind CSS**. It features offline capability and Google Drive backup/restore functionality using the Google Drive API (App Data folder).

## Features

-   **Mantra Counter:** Track your daily rounds (108 chants) and lifetime total.
-   **Offline First:** Works completely offline (CSS/JS bundled).
-   **Google Drive Sync:** Backup your progress to a hidden app folder in your Google Drive.
-   **Dark/Light Mode:** Automatic or manual theme switching.
-   **Stats & History:** View your practice history and weekly insights.

## Prerequisites

-   **Node.js** (v18 or later recommended)
-   **Android Studio** (for building the APK)
-   **Google Cloud Console Account** (for API credentials)

## Setup Instructions

### 1. Install Dependencies

Open a terminal in the project root and run:

```bash
npm install
```

### 2. Configure Google Cloud Credentials

To enable Google Drive Sync, you need to create a project in the Google Cloud Console.

1.  Go to [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project (e.g., "Divine Counter").
3.  **Enable APIs:**
    -   Go to **APIs & Services > Library**.
    -   Search for **Google Drive API** and enable it.
4.  **Configure OAuth Consent Screen:**
    -   Go to **APIs & Services > OAuth consent screen**.
    -   Select **External** (unless you have a Google Workspace organization).
    -   Fill in the app name, email, etc.
    -   **Scopes:** Add `.../auth/drive.appdata` scope.
    -   **Test Users:** Add your email address (important for testing before verification).
5.  **Create Credentials:**
    -   Go to **APIs & Services > Credentials**.
    -   Click **Create Credentials > OAuth client ID**.
    -   **Application Type:** Select **Web application**.
    -   **Authorized JavaScript origins:**
        -   For local development: `http://localhost:5173` (or your local port).
        -   For the Android app: You might need to add `http://localhost` or `capacitor://localhost` depending on how the webview is treated, but typically for the implicit flow in a hybrid app without a backend, you might use the web client ID.
    -   **API Key:** Also create an **API Key** (restrict it to Google Drive API if possible).
6.  **Update Source Code:**
    -   Open `src/js/drive.js`.
    -   Replace `YOUR_GOOGLE_CLIENT_ID` with your Client ID.
    -   Replace `YOUR_GOOGLE_API_KEY` with your API Key.

### 3. Build the Web Assets

Compile the project for production:

```bash
npm run build
```

This generates the `dist` folder.

### 4. Sync with Android

Copy the web assets to the Android platform:

```bash
npx cap sync
```

### 5. Build the APK

Open the Android project in Android Studio:

```bash
npx cap open android
```

1.  In Android Studio, wait for Gradle sync to complete.
2.  Connect your Android device or use an emulator.
3.  Click the **Run** button (green play icon) to install the app on your device.
4.  To generate a signed APK for release:
    -   Go to **Build > Generate Signed Bundle / APK**.
    -   Follow the wizard to create a key store and build the APK.

## Development

To run the web app locally for testing:

```bash
npm run dev
```

## Troubleshooting

-   **Google Sign-In Error:** Ensure your "Authorized JavaScript origins" match the URL you are running the app on.
-   **Offline CSS Missing:** Make sure you ran `npm run build` before `npx cap sync`.
-   **Backup Not Found:** The backup is stored in the hidden `appDataFolder`. You won't see it in your main Drive file list.
