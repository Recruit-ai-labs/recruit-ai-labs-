// ============================================================
// src/app/api/interview/register/route.ts
// POST - Page-1 candidate onboarding  generates candidateId
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { registerCandidate } from "@/lib/data-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, name, email, resumeText } = body as {
      jobId: string;
      name: string;
      email: string;
      resumeText: string;
    };

    if (!jobId || !name || !email) {
      return NextResponse.json(
        { error: "jobId, name, and email are required" },
        { status: 400 }
      );
    }

    const candidate = registerCandidate(jobId, name, email, resumeText ?? "");

    return NextResponse.json({
      success: true,
      candidateId: candidate.candidateId,
      candidate,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
