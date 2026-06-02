import { nimChatCompletion } from './nim'
import { NIM_MODELS } from '@/config/nim-models'

export async function generateInterviewQuestions(
  orgId: string,
  params: {
    role: string
    seniority: string
    skills: string[]
    questionType?: 'technical' | 'behavioral' | 'mixed'
    count?: number
  }
): Promise<Array<{
  question: string
  type: 'technical' | 'behavioral'
  difficulty: 'easy' | 'medium' | 'hard'
  expectedAnswer: string
  evaluationCriteria: string[]
}>> {
  const type = params.questionType || 'mixed'
  const count = params.count || 10
  
  const prompt = `Generate ${count} ${type} interview questions for a ${params.seniority} ${params.role} position.

Required Skills: ${params.skills.join(', ')}

Return a JSON array of objects with this exact structure:
[
  {
    "question": "The interview question",
    "type": "technical" or "behavioral",
    "difficulty": "easy", "medium", or "hard",
    "expectedAnswer": "What a good answer would include",
    "evaluationCriteria": ["criteria1", "criteria2", "criteria3"]
  }
]

Make questions practical and relevant to the role. Include a mix of difficulty levels.`

  const response = await nimChatCompletion(
    orgId,
    NIM_MODELS.LLM_405B,
    [
      { role: 'system', content: 'You are an expert interviewer creating assessment questions.' },
      { role: 'user', content: prompt }
    ],
    0.5,
    4096
  )
  
  const content = response.choices[0]?.message?.content
  if (!content) return []
  
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []
    
    return JSON.parse(jsonMatch[0])
  } catch (e) {
    return []
  }
}

export async function analyzeCandidateAnswer(
  orgId: string,
  params: {
    question: string
    answer: string
    expectedAnswer: string
    evaluationCriteria: string[]
  }
): Promise<{
  score: number
  strengths: string[]
  weaknesses: string[]
  feedback: string
  recommendation: 'hire' | 'consider' | 'reject'
}> {
  const prompt = `Analyze this candidate's answer to an interview question.

Question: ${params.question}
Expected Answer: ${params.expectedAnswer}
Evaluation Criteria: ${params.evaluationCriteria.join(', ')}

Candidate's Answer:
${params.answer}

Provide a detailed analysis including:
1. Overall score (1-100)
2. Strengths of the answer (2-3 points)
3. Weaknesses or gaps (2-3 points)
4. Constructive feedback
5. Recommendation: "hire", "consider", or "reject"

Return as JSON with this structure:
{
  "score": number (1-100),
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "feedback": "detailed feedback string",
  "recommendation": "hire" | "consider" | "reject"
}`

  const response = await nimChatCompletion(
    orgId,
    NIM_MODELS.LLM_405B,
    [
      { role: 'system', content: 'You are an expert at evaluating interview answers.' },
      { role: 'user', content: prompt }
    ],
    0.3,
    2048
  )
  
  const content = response.choices[0]?.message?.content
  if (!content) {
    return {
      score: 50,
      strengths: [],
      weaknesses: [],
      feedback: 'Analysis failed',
      recommendation: 'consider'
    }
  }
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        score: 50,
        strengths: [],
        weaknesses: [],
        feedback: 'Failed to parse analysis',
        recommendation: 'consider'
      }
    }
    
    return JSON.parse(jsonMatch[0])
  } catch (e) {
    return {
      score: 50,
      strengths: [],
      weaknesses: [],
      feedback: 'Error in analysis',
      recommendation: 'consider'
    }
  }
}

export async function generateInterviewFeedback(
  orgId: string,
  params: {
    candidateName: string
    role: string
    interviewRound: string
    answers: Array<{ question: string; answer: string; score: number }>
    overallImpression: string
  }
): Promise<string> {
  const prompt = `Write a comprehensive interview feedback summary for ${params.candidateName}.

Role: ${params.role}
Interview Round: ${params.interviewRound}

Q&A Summary:
${params.answers.map((a, i) => `Q${i + 1}: ${a.question}\nScore: ${a.score}/100\n`).join('\n')}

Overall Impression: ${params.overallImpression}

Write a structured feedback report including:
- Executive Summary
- Technical Assessment
- Communication Skills
- Cultural Fit
- Strengths
- Areas for Improvement
- Final Recommendation

Keep it professional and actionable. 200-400 words.`

  const response = await nimChatCompletion(
    orgId,
    NIM_MODELS.LLM_405B,
    [
      { role: 'system', content: 'You are writing interview feedback for hiring managers.' },
      { role: 'user', content: prompt }
    ],
    0.5,
    2048
  )
  
  return response.choices[0]?.message?.content || 'Feedback generation failed'
}

export async function generateBehavioralQuestions(
  orgId: string,
  role: string,
  competencies: string[]
): Promise<string[]> {
  const prompt = `Generate 5 behavioral interview questions for a ${role} position assessing these competencies: ${competencies.join(', ')}.

Use the STAR method framework (Situation, Task, Action, Result).

Return as a JSON array of strings.`

  const response = await nimChatCompletion(
    orgId,
    NIM_MODELS.LLM_70B,
    [
      { role: 'system', content: 'You are an expert in behavioral interview design.' },
      { role: 'user', content: prompt }
    ],
    0.5,
    2048
  )
  
  const content = response.choices[0]?.message?.content
  if (!content) return []
  
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []
    
    return JSON.parse(jsonMatch[0])
  } catch (e) {
    return []
  }
}

export async function generateTechDNA(
  orgId: string,
  params: {
    candidateName: string
    role: string
    answers: Array<{
      question: string
      answer: string
      score: number
      strengths: string[]
      weaknesses: string[]
    }>
    confidenceScore: number
    bodyLanguageScore: number
    communicationScore: number
  }
): Promise<{
  technical_score: number
  communication_score: number
  confidence_score: number
  body_language_score: number
  strengths: string[]
  weaknesses: string[]
  key_skills: string[]
  experience_level: string
  cultural_fit: string
  overall_recommendation: 'hire' | 'consider' | 'reject'
  detailed_feedback: string
}> {
  const avgTechnicalScore = params.answers.reduce((sum, a) => sum + a.score, 0) / params.answers.length
  
  const prompt = `Generate a comprehensive Technical DNA profile for a candidate.

Candidate: ${params.candidateName}
Position: ${params.role}

Interview Performance:
- Technical Score: ${avgTechnicalScore.toFixed(0)}/100
- Communication Score: ${params.communicationScore}/100
- Confidence Score: ${params.confidenceScore}/100
- Body Language Score: ${params.bodyLanguageScore}/100

Q&A Summary:
${params.answers.map((a, i) => `Q${i + 1}: ${a.question}
Score: ${a.score}/100
Strengths: ${a.strengths.join(', ')}
Weaknesses: ${a.weaknesses.join(', ')}`).join('\n\n')}

Generate a detailed Technical DNA profile including:
1. Overall technical score (0-100)
2. Communication skills score (0-100)
3. Confidence level score (0-100)
4. Body language score (0-100)
5. Key strengths (3-5 points)
6. Key weaknesses or areas for improvement (3-5 points)
7. Detected key skills (5-10 skills)
8. Experience level assessment (junior/mid/senior/lead)
9. Cultural fit assessment
10. Overall recommendation (hire/consider/reject)
11. Detailed feedback summary (200-300 words)

Return as JSON with this exact structure:
{
  "technical_score": number,
  "communication_score": number,
  "confidence_score": number,
  "body_language_score": number,
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "key_skills": ["skill1", "skill2"],
  "experience_level": "junior|mid|senior|lead",
  "cultural_fit": "description of cultural fit",
  "overall_recommendation": "hire|consider|reject",
  "detailed_feedback": "comprehensive feedback text"
}`

  const response = await nimChatCompletion(
    orgId,
    NIM_MODELS.LLM_70B,
    [
      { role: 'system', content: 'You are an expert technical interviewer creating comprehensive candidate profiles.' },
      { role: 'user', content: prompt }
    ],
    0.3,
    4096
  )
  
  const content = response.choices[0]?.message?.content
  if (!content) {
    return {
      technical_score: Math.round(avgTechnicalScore),
      communication_score: params.communicationScore,
      confidence_score: params.confidenceScore,
      body_language_score: params.bodyLanguageScore,
      strengths: [],
      weaknesses: [],
      key_skills: [],
      experience_level: 'mid',
      cultural_fit: 'Unable to assess',
      overall_recommendation: 'consider',
      detailed_feedback: 'Tech DNA generation failed'
    }
  }
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        technical_score: Math.round(avgTechnicalScore),
        communication_score: params.communicationScore,
        confidence_score: params.confidenceScore,
        body_language_score: params.bodyLanguageScore,
        strengths: [],
        weaknesses: [],
        key_skills: [],
        experience_level: 'mid',
        cultural_fit: 'Unable to assess',
        overall_recommendation: 'consider',
        detailed_feedback: 'Failed to parse Tech DNA'
      }
    }
    
    return JSON.parse(jsonMatch[0])
  } catch (e) {
    return {
      technical_score: Math.round(avgTechnicalScore),
      communication_score: params.communicationScore,
      confidence_score: params.confidenceScore,
      body_language_score: params.bodyLanguageScore,
      strengths: [],
      weaknesses: [],
      key_skills: [],
      experience_level: 'mid',
      cultural_fit: 'Unable to assess',
      overall_recommendation: 'consider',
      detailed_feedback: 'Error generating Tech DNA'
    }
  }
}
