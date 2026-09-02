"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB — a phone photo is 3–5MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export default function ImageUpload({
  value,
  onChange,
  folder = "products",
  label = "Add image",
}: {
  value: string;
  onChange: (url: string) => void;
  folder?: "products" | "payments" | "designs";
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);

    if (!ACCEPTED.includes(file.type)) {
      setError("Please choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That image is over 10MB. Please use a smaller one.");
      return;
    }

    setUploading(true);
    try {
      // 1. Ask our server for a signature.
      const sigRes = await fetch("/api/upload-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder }),
      });
      if (!sigRes.ok) throw new Error("signature");
      const sig = await sigRes.json();

      // 2. Upload straight to Cloudinary. These fields must match what was
      //    signed, exactly, or Cloudinary rejects the request.
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sig.apiKey);
      form.append("timestamp", String(sig.timestamp));
      form.append("signature", sig.signature);
      form.append("folder", sig.folder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
        { method: "POST", body: form },
      );
      if (!uploadRes.ok) throw new Error("upload");

      const data = await uploadRes.json();
      onChange(data.secure_url);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (value) {
    return (
      <div className="flex gap-3 items-start">
        <div className="w-20 aspect-[4/5] bg-bone-deep shrink-0 overflow-hidden">
          <img src={value} alt="" className="h-full w-full object-cover" />
        </div>
        <button
          onClick={() => onChange("")}
          className="p-2 text-ink-soft hover:text-ink transition-colors"
          aria-label="Remove image"
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
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full border border-dashed border-line hover:border-ink transition-colors py-8 flex flex-col items-center gap-2 text-ink-soft hover:text-ink disabled:opacity-50"
      >
        {uploading ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            <span className="text-xs tracking-[0.15em]">UPLOADING…</span>
          </>
        ) : (
          <>
            <Upload size={20} />
            <span className="text-xs tracking-[0.15em]">
              {label.toUpperCase()}
            </span>
            <span className="text-[11px]">JPG, PNG or WebP · up to 10MB</span>
          </>
        )}
      </button>

      {error && <p className="mt-2 text-sm text-red-800">{error}</p>}
    </div>
  );
}