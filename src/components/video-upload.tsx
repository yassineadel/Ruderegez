"use client";

import { useRef, useState } from "react";
import { Film, X } from "lucide-react";
import { cloudinaryVideoPoster } from "@/lib/cloudinary";

// Cloudinary's free plan caps a single video at 100MB.
const MAX_BYTES = 100 * 1024 * 1024;
const ACCEPTED = ["video/mp4", "video/quicktime", "video/webm"];

/**
 * One video, uploaded straight to Cloudinary like the photos are - the file
 * never passes through our server. Videos are big, so this shows real upload
 * progress (XHR, which reports it; fetch doesn't).
 */
export default function VideoUpload({
  value,
  onChange,
  folder = "products",
}: {
  value: string;
  onChange: (url: string) => void;
  folder?: "products";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);

    if (!ACCEPTED.includes(file.type)) {
      setError("Please choose an MP4, MOV or WebM video.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That video is over 100MB. Please trim it or export it smaller.");
      return;
    }

    setProgress(0);
    try {
      const sigRes = await fetch("/api/upload-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder }),
      });
      if (!sigRes.ok) throw new Error("signature");
      const sig = await sigRes.json();

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sig.apiKey);
      form.append("timestamp", String(sig.timestamp));
      form.append("signature", sig.signature);
      form.append("folder", sig.folder);

      // Same signature as an image - resource type is part of the URL, not
      // of what is signed.
      const url = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${sig.cloudName}/video/upload`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText).secure_url);
          } else reject(new Error("upload"));
        };
        xhr.onerror = () => reject(new Error("upload"));
        xhr.send(form);
      });

      onChange(url);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (value) {
    return (
      <div className="flex gap-4 items-start border border-line p-4">
        <div className="relative w-20 aspect-[4/5] bg-bone-deep shrink-0 overflow-hidden">
          <img
            src={cloudinaryVideoPoster(value, { width: 160 })}
            alt=""
            className="h-full w-full object-cover"
          />
          <Film size={14} className="absolute bottom-1.5 left-1.5 text-bone drop-shadow" />
        </div>
        <div className="flex-1 text-sm">
          <p>Video added</p>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-ink-soft underline underline-offset-4 hover:text-ink"
          >
            Watch it
          </a>
        </div>
        <button
          type="button"
          onClick={() => onChange("")}
          className="p-2 text-ink-soft hover:text-ink transition-colors"
          aria-label="Remove video"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={progress !== null}
        className="w-full border border-dashed border-line hover:border-ink transition-colors py-8 flex flex-col items-center gap-2 text-ink-soft hover:text-ink disabled:opacity-60"
      >
        <Film size={20} />
        {progress !== null ? (
          <>
            <span className="text-xs tracking-[0.15em]">UPLOADING… {progress}%</span>
            <span className="w-40 h-0.5 bg-line overflow-hidden">
              <span className="block h-full bg-ink transition-all" style={{ width: `${progress}%` }} />
            </span>
          </>
        ) : (
          <>
            <span className="text-xs tracking-[0.15em]">UPLOAD A VIDEO</span>
            <span className="text-[11px]">MP4, MOV or WebM · up to 100MB</span>
          </>
        )}
      </button>

      {error && <p className="mt-2 text-sm text-red-800">{error}</p>}
    </div>
  );
}
