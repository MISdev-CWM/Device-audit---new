import { Readable } from "node:stream";
import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { createGoogleDriveServerAuth } from "../../lib/google-auth";

export const runtime = "nodejs";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

type UploadFailure = { index: number; name: string; message: string };

export async function POST(request: NextRequest) {
  const folderId = process.env.DRIVE_FOLDER_ID;

  if (!folderId) {
    return NextResponse.json({ error: "Set DRIVE_FOLDER_ID in the server environment." }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the uploaded files." }, { status: 400 });
  }

  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Choose at least one image to upload." }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Choose no more than ${MAX_FILES} images at a time.` }, { status: 400 });
  }

  const folderNameValue = formData.get("folderName");
  const folderName = typeof folderNameValue === "string" ? folderNameValue.trim() : "";
  const retryFolderValue = formData.get("retryFolderId");
  const retryFolderId = typeof retryFolderValue === "string" ? retryFolderValue.trim() : "";
  if (!retryFolderId && !folderName) {
    return NextResponse.json({ error: "Enter a name for the new Drive folder." }, { status: 400 });
  }
  if (folderName.length > 255) {
    return NextResponse.json({ error: "Folder names must be 255 characters or fewer." }, { status: 400 });
  }

  let drive;
  try {
    drive = google.drive({ version: "v3", auth: createGoogleDriveServerAuth() });
  } catch {
    return NextResponse.json(
      { error: "The server Drive inbox is not configured. Contact the administrator." },
      { status: 500 },
    );
  }
  const uploaded: Array<{ index: number; name: string; id: string; url: string }> = [];
  const failed: UploadFailure[] = [];
  const validFiles: Array<{ index: number; file: File }> = [];

  for (const [index, file] of files.entries()) {
    if (!ALLOWED_TYPES.has(file.type)) {
      failed.push({ index, name: file.name, message: "This image format is not supported." });
      continue;
    }
    if (file.size > MAX_FILE_SIZE) {
      failed.push({ index, name: file.name, message: "This image is larger than 15 MB." });
      continue;
    }
    validFiles.push({ index, file });
  }

  if (validFiles.length === 0) {
    return NextResponse.json({ uploaded, failed }, { status: 207 });
  }

  let destinationFolderId = "";
  let destinationFolderName = folderName;
  let destinationFolderUrl = "";
  try {
    if (retryFolderId) {
      const existingFolder = await drive.files.get({
        fileId: retryFolderId,
        fields: "id,name,mimeType,parents,webViewLink",
        supportsAllDrives: true,
      });
      if (existingFolder.data.mimeType !== "application/vnd.google-apps.folder" || !existingFolder.data.parents?.includes(folderId)) {
        return NextResponse.json({ error: "The retry folder is not inside the configured Drive folder." }, { status: 400 });
      }
      destinationFolderId = existingFolder.data.id ?? retryFolderId;
      destinationFolderName = existingFolder.data.name ?? folderName;
      destinationFolderUrl = existingFolder.data.webViewLink ?? `https://drive.google.com/drive/folders/${destinationFolderId}`;
    } else {
      const createdFolder = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: "application/vnd.google-apps.folder",
          parents: [folderId],
        },
        fields: "id,name,webViewLink",
        supportsAllDrives: true,
      });
      if (!createdFolder.data.id) throw new Error("Drive did not return a folder ID.");
      destinationFolderId = createdFolder.data.id;
      destinationFolderName = createdFolder.data.name ?? folderName;
      destinationFolderUrl = createdFolder.data.webViewLink ?? `https://drive.google.com/drive/folders/${destinationFolderId}`;
    }
  } catch (error) {
    console.error("Google Drive folder creation failed:", error);
    return NextResponse.json({ error: "Could not create or reopen the destination folder. Check Drive access and try again." }, { status: 502 });
  }

  for (const { index, file } of validFiles) {
    try {
      const result = await drive.files.create({
        requestBody: {
          name: file.name,
          mimeType: file.type,
          parents: [destinationFolderId],
        },
        media: {
          mimeType: file.type,
          body: Readable.from(Buffer.from(await file.arrayBuffer())),
        },
        fields: "id,name,webViewLink",
        supportsAllDrives: true,
      });

      if (!result.data.id) {
        throw new Error("Drive did not return a file ID.");
      }

      uploaded.push({
        index,
        name: result.data.name ?? file.name,
        id: result.data.id,
        url: result.data.webViewLink ?? `https://drive.google.com/file/d/${result.data.id}/view`,
      });
    } catch (error) {
      console.error("Google Drive upload failed:", error);
      failed.push({ index, name: file.name, message: "Upload failed. Check folder access and try again." });
    }
  }

  return NextResponse.json(
    { uploaded, failed, folderId: destinationFolderId, folderName: destinationFolderName, folderUrl: destinationFolderUrl },
    { status: failed.length > 0 ? 207 : 200 },
  );
}
