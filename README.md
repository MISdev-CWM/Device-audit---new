# Fielddrop

Fielddrop uploads images to a folder in the signed-in user's Google Drive. Google OAuth credentials and refresh tokens stay on the server; the app never makes the destination folder public.

## Configure Google OAuth

1. In Google Cloud Console, create or choose a project and enable the **Google Drive API**.
2. Configure the OAuth consent screen for an **External** app and add your personal Gmail address as a test user.
3. Create an OAuth client ID for a **Web application**. Add `http://localhost:3002/api/auth/callback` and `https://YOUR-VERCEL-DOMAIN/api/auth/callback` as authorized redirect URIs. Replace `YOUR-VERCEL-DOMAIN` with the production domain shown in Vercel project settings. The app derives its callback URL from the host where sign-in starts, so each URL must match exactly.
4. Copy `.env.example` to `.env.local`. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from the OAuth client and `DRIVE_FOLDER_ID` to a folder in your Drive.
5. Set `AUTH_SECRET` to a random secret of at least 32 characters. You can generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

The signed-in Gmail account must have edit access to the destination folder. The app stores its refresh token only in an encrypted, HTTP-only cookie. Never commit `.env.local` or share OAuth client secrets. For deployment, set these variables in the hosting provider and register the matching production callback URL.

While the OAuth consent screen is in Testing, Google may require you to reauthorize periodically. This setup is for your own use; publishing the app for other users may require Google OAuth verification because it requests Drive access.
Fielddrop saves uploaded images directly to the Drive folder owned by the server administrator. Visitors do **not** need a Google account, password, or Google sign-in.

## Configure the server Drive account

This app uses a Google OAuth refresh token belonging to the Drive owner. The Drive owner authorizes Google once; visitors never do.

Add these environment variables in **Vercel → Project → Settings → Environment Variables** for the **Production** environment:

    GOOGLE_CLIENT_ID=OAuth Web client ID from Google Cloud
    GOOGLE_CLIENT_SECRET=OAuth Web client secret from Google Cloud
    AUTH_SECRET=a random string of at least 32 characters
    DRIVE_FOLDER_ID=destination Google Drive folder ID
    GOOGLE_DRIVE_REFRESH_TOKEN=Drive owner's OAuth refresh token

Save the variables and redeploy. The variables must be added to Vercel, not committed into .env.example or Git.

The refresh token must have been created by the same OAuth client ID and must have Google Drive permission. If it is revoked or expired, create a replacement token for the Drive-owner account, update Vercel, and redeploy.

## Security

Anyone who can open this site can submit images to the configured Drive folder. Each request is limited to 10 images and 15 MB per image. Add CAPTCHA, rate limiting, or an access code before using a public link if you need to restrict who can upload.

If a client secret or refresh token is ever shared in chat, source control, or a screenshot, revoke and replace it immediately.

## Run locally

Copy .env.example to .env.local, fill in the values locally, then run:

    npm install
    npm run dev -- --port 3002

## API

POST /api/upload accepts multipart/form-data with one or more files fields. It returns uploaded and failed arrays; partial success uses HTTP 207.
