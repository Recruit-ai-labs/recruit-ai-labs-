"use client";

// ============================================================
// src/components/interview-links-display.tsx
// Shows generated interview link after job creation
// ============================================================

import React, { useState } from "react";

interface InterviewLinksDisplayProps {
  jobId: string;
  jobTitle: string;
}

export function InterviewLinksDisplay({
  jobId,
  jobTitle,
}: InterviewLinksDisplayProps) {
  const [copied, setCopied] = useState(false);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  const interviewLink = `${baseUrl}/interview/${jobId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(interviewLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = interviewLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Interview link created for{" "}
            <span className="text-indigo-600">{jobTitle}</span>
          </p>
          <p className="text-xs text-gray-500">
            Share this link with candidates to start their interview.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
        <svg
          className="w-4 h-4 text-gray-400 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
        <span className="text-xs text-gray-700 font-mono flex-1 truncate">
          {interviewLink}
        </span>
        <button
          onClick={handleCopy}
          className={`flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-md transition ${
            copied
              ? "bg-green-100 text-green-700"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }`}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <div className="flex gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full inline-block" />
          Job ID: <code className="font-mono text-gray-700">{jobId}</code>
        </span>
        <a
          href={interviewLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-indigo-600 hover:underline"
        >
          Preview link ↗
        </a>
      </div>
    </div>
  );
}