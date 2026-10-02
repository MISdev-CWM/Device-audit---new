"use client";

import {
  ArrowUpFromLine,
  Check,
  ChevronRight,
  CloudUpload,
  ExternalLink,
  FileImage,
  FolderOpen,
  ImagePlus,
  LoaderCircle,
  ShieldCheck,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

type SelectedImage = { id: string; file: File; preview: string };
type UploadedImage = { index: number; name: string; id: string; url: string };
type UploadFailure = { index: number; name: string; message: string };
type DriveFolder = { name: string; url: string };

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useRef(new Set<string>());
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [uploaded, setUploaded] = useState<UploadedImage[]>([]);
  const [failures, setFailures] = useState<UploadFailure[]>([]);
  const [notice, setNotice] = useState("");
  const [folderName, setFolderName] = useState("");
  const [retryFolderId, setRetryFolderId] = useState("");
  const [destinationFolder, setDestinationFolder] = useState<DriveFolder | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const previewUrls = previews.current;
    return () => {
      previewUrls.forEach(URL.revokeObjectURL);
    };
  }, []);

  useEffect(() => {
    if (images.length === 0 && retryFolderId) {
      setRetryFolderId("");
      setFolderName("");
      setDestinationFolder(null);
    }
  }, [images.length, retryFolderId]);

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    const valid: SelectedImage[] = [];
    const issues: string[] = [];
    let slots = MAX_FILES - images.length;

    for (const file of incoming) {
      if (!ACCEPTED_TYPES.has(file.type)) {
        issues.push(`${file.name}: unsupported format`);
      } else if (file.size > MAX_FILE_SIZE) {
        issues.push(`${file.name}: over 15 MB`);
      } else if (slots <= 0) {
        issues.push(`${file.name}: maximum ${MAX_FILES} images per upload`);
      } else {
        const preview = URL.createObjectURL(file);
        previews.current.add(preview);
        valid.push({ id: crypto.randomUUID(), file, preview });
        slots -= 1;
      }
    }

    if (valid.length) setImages((current) => [...current, ...valid]);
    setNotice(issues.length ? issues.slice(0, 2).join(" · ") : "");
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeImage(id: string) {
    setImages((current) => {
      const image = current.find((item) => item.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
        previews.current.delete(image.preview);
      }
      return current.filter((item) => item.id !== id);
    });
  }

  async function uploadImages() {
    if (images.length === 0 || isUploading || (!retryFolderId && !folderName.trim())) return;

    setIsUploading(true);
    setNotice("");
    const formData = new FormData();
    images.forEach(({ file }) => formData.append("files", file));
    formData.append("folderName", folderName.trim());
    if (retryFolderId) formData.append("retryFolderId", retryFolderId);

    try {
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok && response.status !== 207) {
        throw new Error(result.error ?? "Upload could not be completed.");
      }

      const completed = (result.uploaded ?? []) as UploadedImage[];
      const failed = (result.failed ?? []) as UploadFailure[];
      const uploadedFolderId = typeof result.folderId === "string" ? result.folderId : "";
      if (uploadedFolderId) {
        setDestinationFolder({
          name: typeof result.folderName === "string" ? result.folderName : folderName,
          url: typeof result.folderUrl === "string" ? result.folderUrl : `https://drive.google.com/drive/folders/${uploadedFolderId}`,
        });
        setRetryFolderId(failed.length > 0 ? uploadedFolderId : "");
        if (failed.length === 0) setFolderName("");
      }
      setUploaded((current) => [...completed, ...current]);
      setFailures(failed);

      const failedIndexes = new Set(failed.map(({ index }) => index));
      setImages((current) => {
        const remaining = current.filter((_, index) => failedIndexes.has(index));
        const remainingIds = new Set(remaining.map(({ id }) => id));
        current.forEach((image) => {
          if (!remainingIds.has(image.id)) {
            URL.revokeObjectURL(image.preview);
            previews.current.delete(image.preview);
          }
        });
        return remaining;
      });
      if (completed.length) {
        const destination = typeof result.folderName === "string" ? ` to ${result.folderName}` : "";
        setNotice(`${completed.length} image${completed.length === 1 ? "" : "s"} sent to Drive${destination}.`);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Upload could not be completed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Fielddrop home">
          <span className="brand-mark"><ImagePlus size={17} strokeWidth={2.2} /></span>
          <span>fielddrop</span>
        </a>
        <span className="topbar-note">
          <span className="live-dot" /> GOOGLE DRIVE INBOX
        </span>
      </header>

      <div className="page-wrap" id="top">
        <div className="breadcrumb"><span>WORKSPACE</span><ChevronRight size={13} /><span className="crumb-current">IMAGE INTAKE</span></div>

        <section className="intro">
          <div>
            <p className="eyebrow">A CLEAR PATH TO THE CLOUD</p>
            <h1>Send your images<br /><span>where they belong.</span></h1>
          </div>
          <p className="intro-copy">Send images directly to the secure Drive inbox. No Google sign-in is required.</p>
        </section>

        <div className="workspace-grid">
          <section className="upload-panel" aria-labelledby="upload-heading">
            <div className="section-heading">
              <div><span className="step-number">01</span><h2 id="upload-heading">Select images</h2></div>
              <span className="selection-count">{images.length} / {MAX_FILES}</span>
            </div>

            <input
              ref={inputRef}
              className="visually-hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              multiple
              aria-hidden="true"
              onChange={(event) => { if (event.target.files) addFiles(event.target.files); }}
              tabIndex={-1}
            />
            <button
              className={`dropzone${isDragging ? " is-dragging" : ""}`}
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => { event.preventDefault(); setIsDragging(false); addFiles(event.dataTransfer.files); }}
              aria-label="Browse or drop image files"
            >
              <span className="drop-icon"><CloudUpload size={24} strokeWidth={1.7} /></span>
              <span className="drop-title">Drop images here, or <span>browse files</span></span>
              <span className="drop-hint">JPG, PNG, WEBP, GIF or AVIF <i /> Up to 15 MB each</span>
            </button>

            <div className="folder-name-field">
              <label htmlFor="folder-name">New Drive folder name</label>
              <input
                id="folder-name"
                type="text"
                value={folderName}
                maxLength={255}
                required
                disabled={isUploading || Boolean(retryFolderId)}
                placeholder="e.g. WhatsApp images - 2026-10-02"
                onChange={(event) => setFolderName(event.target.value)}
              />
              <span>{retryFolderId ? "Failed images will retry in this same folder." : "All selected images will be saved together in this new folder."}</span>
            </div>

            {notice && <p className={`notice${notice.includes("sent to Drive") ? " notice-success" : ""}`} role="status">{notice}</p>}

            {destinationFolder && (
              <a className="created-folder-link" href={destinationFolder.url} target="_blank" rel="noreferrer">
                <FolderOpen size={15} /> Open folder: {destinationFolder.name} <ExternalLink size={13} />
              </a>
            )}

            {images.length > 0 && (
              <div className="selected-section">
                <div className="list-heading"><span>READY TO SEND</span><span>{images.length} FILE{images.length === 1 ? "" : "S"}</span></div>
                <ul className="image-list">
                  {images.map((image) => (
                    <li className="image-row" key={image.id}>
                      <Image className="image-thumb" src={image.preview} alt="" width={42} height={40} unoptimized />
                      <span className="image-file-icon"><FileImage size={16} /></span>
                      <span className="image-meta"><span className="image-name">{image.file.name}</span><span className="image-size">{formatBytes(image.file.size)}</span></span>
                      <button className="icon-button remove-button" type="button" onClick={() => removeImage(image.id)} aria-label={`Remove ${image.file.name}`} title="Remove image"><X size={16} /></button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {failures.length > 0 && (
              <div className="failure-list" role="status">
                {failures.map((failure) => <p key={`${failure.index}-${failure.name}`}><span>{failure.name}</span> — {failure.message}</p>)}
              </div>
            )}

            {uploaded.length > 0 && (
              <div className="success-list" role="status">
                <div className="list-heading"><span>RECENTLY SENT</span><span>{uploaded.length} COMPLETE</span></div>
                {uploaded.slice(0, 3).map((file) => (
                  <a className="uploaded-row" href={file.url} target="_blank" rel="noreferrer" key={`${file.id}-${file.index}`}>
                    <span className="uploaded-check"><Check size={14} /></span><span>{file.name}</span><ExternalLink size={14} />
                  </a>
                ))}
              </div>
            )}

            <div className="upload-actions">
              <span className="privacy-note"><ShieldCheck size={15} /> Files are sent securely</span>
              <button className="submit-button" type="button" onClick={uploadImages} disabled={images.length === 0 || isUploading || (!retryFolderId && !folderName.trim())}>
                {isUploading ? <LoaderCircle className="spin" size={17} /> : <ArrowUpFromLine size={17} />}
                {isUploading ? "Sending images" : "Send to Drive"}
              </button>
            </div>
          </section>

          <aside className="destination-panel" aria-labelledby="destination-heading">
            <div className="destination-art" aria-hidden="true">
              <div className="sun-disc" /><div className="art-line art-line-one" /><div className="art-line art-line-two" />
              <div className="folder-illustration"><div className="folder-tab" /><div className="folder-front"><FolderOpen size={38} strokeWidth={1.4} /></div><div className="folder-shadow" /></div>
              <span className="art-stamp">01 / INBOX</span>
            </div>
            <div className="destination-details">
              <p className="eyebrow">YOUR DESTINATION</p>
              <h2 id="destination-heading">Your Google Drive folder</h2>
              <div className="destination-status"><span className="status-dot" /> Ready to receive uploads</div>
              <div className="destination-rule" />
              <div className="destination-foot"><span>IMAGES ONLY</span><span>MAX 15 MB</span></div>
            </div>
          </aside>
        </div>

        <footer className="page-footer"><span>FIELDDROP <i /> IMAGE INTAKE</span><span><span className="footer-lock"><ShieldCheck size={13} /></span> PRIVATE BY DEFAULT</span></footer>
      </div>
    </main>
  );
}
