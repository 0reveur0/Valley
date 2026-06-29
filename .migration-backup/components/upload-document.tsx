"use client";

import { useState, useRef } from 'react';

export default function UploadDocument() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setMessage('Only PDF files are allowed.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setMessage('File must be 20MB or smaller.');
      return;
    }

    setIsUploading(true);
    setProgress(10);
    setMessage('Uploading to Cloudinary...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace(/\.pdf$/i, ''));

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setProgress(100);

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed.');
      }

      setMessage(`Uploaded successfully. Document ID: ${data.document.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(0), 1200);
    }
  };

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void handleFiles(event.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
          isDragging ? 'border-sky-500 bg-slate-800' : 'border-slate-700 bg-slate-950'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(event) => void handleFiles(event.target.files)}
        />
        <p className="text-lg font-semibold">Drag & drop your PDF here</p>
        <p className="mt-2 text-sm text-slate-400">Only PDF files, max 20MB.</p>
      </div>

      {isUploading && (
        <div className="mt-4">
          <div className="h-2 w-full rounded-full bg-slate-800">
            <div className="h-2 rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-300">Uploading...</p>
        </div>
      )}

      {message && <p className="mt-4 text-sm text-slate-300">{message}</p>}
    </div>
  );
}
