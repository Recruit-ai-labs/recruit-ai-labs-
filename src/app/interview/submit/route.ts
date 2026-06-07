// ============================================================
// src/app/api/interview/submit/route.ts
// POST — Submit answers → build TechDNA → NVIDIA NIM (native fetch) → inject summary
// No extra packages needed — uses built-in fetch
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  getJob,
  getCandidate,
  injectAISummary,
  patchCandidate,
  type TechDNA,
  type AISummary,
  type BehavioralCue,
} from "@/lib/data-store";

const NIM_API_KEY = process.env.NVIDIA_NIM_API_KEY ?? "";
const NIM_BASE_URL =
  process.env.NVIDIA_NIM_BASE_URL ?? "https://integrate.api.nvidia.com/v1";
const NIM_MODEL = "meta/llama-3.1-70b-instruct";

// ─── Types ────────────────────────────────────────────────────

interface AnswerPayload {
  questionId: string;
  questionText: string;
  answer: string;
  timeSpentMs: number;
  editCount: number;
  deletedWords: number;
  pasteDetected: boolean;
}

interface SubmitBody {
  jobId: string;
  candidateId: string;
  answers: AnswerPayload[];
}

// ─── TechDNA Builder ──────────────────────────────────────────

function buildTechDNA(answers: AnswerPayload[]): TechDNA {
  const behavioralCues: BehavioralCue[] = answers.map((a, i) => ({
    questionIndex: i,
    editCount: a.editCount,
    timeOnQuestion: a.timeSpentMs,
    deletedWords: a.deletedWords,
    pasteDetected: a.pasteDetected,
  }));

  const totalTimeSpentMs = answers.reduce((s, a) => s + a.timeSpentMs, 0);

  const confidenceMarkers = answers.map((a) => {
    let score = 1.0;
    if (a.editCount > 10) score -= 0.2;
    if (a.deletedWords > 20) score -= 0.2;
    if (a.pasteDetected) score -= 0.3;
    return Math.max(0, score);
  });

  const avgWords =
    answers.reduce((s, a) => s + a.answer.split(/\s+/).length, 0) /
    Math.max(answers.length, 1);
  const logicalDepthScore = Math.min(100, Math.round((avgWords / 150) * 100));

  const techKeywords = [
    "algorithm", "complexity", "O(n)", "tradeoff", "scalable",
    "database", "API", "async", "concurrent", "cache",
    "architecture", "pattern", "design", "optimize",
  ];
  const technicalDecisionPatterns = techKeywords.filter((kw) =>
    answers.some((a) => a.answer.toLowerCase().includes(kw.toLowerCase()))
  );

  return {
    behavioralCues,
    logicalDepthScore,
    technicalDecisionPatterns,
    responseVelocity: answers.map((a) => a.timeSpentMs),
    confidenceMarkers,
    totalTimeSpentMs,
  };
}

// ─── NVIDIA NIM call via native fetch ────────────────────────

async function generateAISummary(
  jobTitle: string,
  candidateName: string,
  answers: AnswerPayload[],
  techDNA: TechDNA
): Promise<AISummary> {
  const prompt = `You are an expert technical recruiter AI. Evaluate this candidate interview.

JOB: ${jobTitle}
CANDIDATE: ${candidateName}

ANSWERS:
${answers.map((a, i) => `Q${i + 1}: ${a.questionText}\nA: ${a.answer}`).join("\n\n")}

BEHAVIORAL METRICS:
- Logical Depth Score: ${techDNA.logicalDepthScore}/100
- Avg Confidence: ${(
    techDNA.confidenceMarkers.reduce((a, b) => a + b, 0) /
    Math.max(techDNA.confidenceMarkers.length, 1)
  ).toFixed(2)}
- Technical Patterns Detected: ${techDNA.technicalDecisionPatterns.join(", ") || "None"}
- Total Time: ${Math.round(techDNA.totalTimeSpentMs / 1000)}s

Respond ONLY with a raw JSON object, no markdown, no backticks:
{"overallScore":75,"strengths":["string"],"weaknesses":["string"],"hiringRecommendation":"Yes","technicalDepth":"paragraph","communicationClarity":"paragraph","detailedAnalysis":"two paragraphs"}

hiringRecommendation must be one of: "Strong Yes", "Yes", "Maybe", "No"`;

  const res = await fetch(`${NIM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${NIM_API_KEY}`,
    },
    body: JSON.stringify({
      model: NIM_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a precise technical recruiter AI. Always respond with valid raw JSON only — no markdown, no preamble.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1024,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`NIM API error ${res.status}: ${errText}`);
  }

  const data = await res.json() as {
    choices: { message: { content: string } }[];
  };

  const raw = data.choices[0]?.message?.content ?? "";

  // Strip accidental markdown fences
  const clean = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  let parsed: Omit<AISummary, "generatedAt">;
  try {
    parsed = JSON.parse(clean) as Omit<AISummary, "generatedAt">;
  } catch {
    // Fallback: extract JSON block from anywhere in string
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("NIM returned invalid JSON: " + raw.slice(0, 200));
    parsed = JSON.parse(match[0]) as Omit<AISummary, "generatedAt">;
  }

  return { ...parsed, generatedAt: new Date().toISOString() };
}

// ─── Route Handler ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SubmitBody;
    const { jobId, candidateId, answers } = body;

    if (!jobId || !candidateId || !answers?.length) {
      return NextResponse.json(
        { error: "jobId, candidateId, and answers are required" },
        { status: 400 }
      );
    }

    // Turant submitted mark karo
    patchCandidate(jobId, candidateId, { status: "submitted" });

    const job = getJob(jobId);
    const candidate = getCandidate(jobId, candidateId);
    if (!job || !candidate) {
      return NextResponse.json(
        { error: "Job or candidate not found" },
        { status: 404 }
      );
    }

    const techDNA = buildTechDNA(answers);

    const aiSummary = await generateAISummary(
      job.title,
      candidate.name,
      answers,
      techDNA
    );

    // db.json me exact candidateId node par inject — no data loss
    const updated = injectAISummary(jobId, candidateId, aiSummary, techDNA);

    return NextResponse.json({ success: true, candidate: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[interview/submit] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
