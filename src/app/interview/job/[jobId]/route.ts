// ============================================================
// src/app/api/interview/job/[jobId]/route.ts
// GET — Fetch job + questions for the interview page
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/data-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const job = getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    // Don't expose other candidates' data
    const { candidates: _candidates, ...safeJob } = job;
    return NextResponse.json({ job: safeJob });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}