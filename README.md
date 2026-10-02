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

## Run locally

```bash
npm install
npm run dev -- --port 3002
```

Open [http://localhost:3002](http://localhost:3002), connect your Google account, select up to 10 images, and enter a name for the new Drive subfolder. All images in that batch are uploaded into that folder. Supported formats are JPG, PNG, WEBP, GIF, and AVIF, up to 15 MB each. Successful uploads appear as links; failed files remain selected for retry in the same folder.

## API

`POST /api/upload` accepts `multipart/form-data` with one or more `files` fields. It returns `uploaded` and `failed` arrays; partial success uses HTTP 207. The server validates file count, size, and image MIME type before uploading.
