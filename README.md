# Fielddrop

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
