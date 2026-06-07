// ============================================================
// src/app/api/jobs/create/route.ts
// POST — Create a new job with questions → returns jobId + link
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createJob } from "@/lib/data-store";
import type { InterviewQuestion } from "@/lib/data-store";

interface CreateJobBody {
  title: string;
  description: string;
  questions: Omit<InterviewQuestion, "id">[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateJobBody;
    const { title, description, questions } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Job title is required" }, { status: 400 });
    }
    if (!questions?.length) {
      return NextResponse.json(
        { error: "At least one interview question is required" },
        { status: 400 }
      );
    }

    const job = createJob(title, description ?? "", questions);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const interviewLink = `${baseUrl}/interview/${job.jobId}`;

    return NextResponse.json({
      success: true,
      job,
      interviewLink,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}