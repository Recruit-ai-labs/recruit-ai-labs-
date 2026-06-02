import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { auth } from '@clerk/nextjs/server'
import { nimChatCompletion } from '@/lib/nim'
import { NIM_MODELS } from '@/config/nim-models'

export async function POST(request: Request) {
  try {
    const { userId, orgId } = await auth()
    
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { interviewId } = await request.json()

    if (!interviewId) {
      return NextResponse.json({ error: 'Interview ID required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Fetch interview with all data
    const { data: interview, error: fetchError } = await supabase
      .from('interviews')
      .select(`
        *,
        applications (
          candidates (
            name,
            email,
            resume_text,
            parsed_skills,
            parsed_experience
          ),
          jobs (
            title,
            description,
            requirements
          )
        ),
        cheating_events (
          event_type,
          timestamp
        )
      `)
      .eq('id', interviewId)
      .single()

    if (fetchError || !interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    const interviewData = interview as any
    const answers = interviewData.answers || []
    const cheatingEvents = interviewData.cheating_events || []
    const candidate = interviewData.applications?.candidates
    const job = interviewData.applications?.jobs

    // Generate comprehensive AI analysis
    const analysisPrompt = `You are an expert HR interviewer and psychologist. Analyze this interview comprehensively.

CANDIDATE INFORMATION:
- Name: ${candidate?.name || 'Unknown'}
- Position Applied: ${job?.title || 'Unknown'}
- Skills: ${(candidate?.parsed_skills || []).join(', ')}

JOB REQUIREMENTS:
${job?.requirements || 'N/A'}

INTERVIEW PERFORMANCE:
${(answers as any[]).map((a: any, i: number) => `
Question ${i + 1}: ${a.question}
Candidate Answer: ${a.answer}
Score: ${a.score}/100
Strengths: ${(a.strengths || []).join(', ')}
Weaknesses: ${(a.weaknesses || []).join(', ')}
Feedback: ${a.feedback}
`).join('\n')}

CHEATING EVENTS:
${cheatingEvents.length > 0 
  ? (cheatingEvents as any[]).map((e: any) => `${e.event_type} at ${e.timestamp}`).join('\n')
  : 'No cheating events detected'
}

SCORES:
- Technical Score: ${interviewData.technical_score || 'N/A'}
- Communication Score: ${interviewData.communication_score || 'N/A'}
- Confidence Score: ${interviewData.confidence_score || 'N/A'}
- Body Language Score: ${interviewData.body_language_score || 'N/A'}

Please provide a comprehensive analysis in JSON format with this exact structure:
{
  "professional_summary": "2-3 paragraph professional summary of the candidate's performance, strengths, and overall fit for the role",
  "tech_dna": {
    "core_competencies": ["skill1", "skill2"],
    "technical_depth": "beginner|intermediate|advanced|expert",
    "problem_solving_ability": "poor|fair|good|excellent",
    "learning_agility": "low|medium|high",
    "technology_stack": ["tech1", "tech2"],
    "areas_of_excellence": ["area1", "area2"],
    "areas_for_improvement": ["area1", "area2"]
  },
  "behavioral_analysis": {
    "communication_style": "description",
    "problem_solving_approach": "description",
    "stress_management": "poor|fair|good|excellent",
    "teamwork_indicators": "description",
    "leadership_potential": "low|medium|high",
    "cultural_fit": "poor|fair|good|excellent",
    "key_strengths": ["strength1", "strength2"],
    "development_areas": ["area1", "area2"]
  },
  "body_language_analysis": {
    "eye_contact": "poor|fair|good|excellent",
    "posture": "poor|fair|good|excellent",
    "confidence_level": "low|medium|high",
    "engagement": "low|medium|high",
    "nervousness_indicators": ["indicator1", "indicator2"],
    "overall_presentation": "description"
  },
  "overall_recommendation": "hire|consider|reject",
  "final_score": 85,
  "key_takeaways": ["takeaway1", "takeaway2", "takeaway3"],
  "risk_factors": ["factor1", "factor2"]
}

Be thorough, objective, and provide actionable insights.`

    const response = await nimChatCompletion(
      orgId,
      NIM_MODELS.LLM_405B,
      [
        { role: 'system', content: 'You are an expert HR analyst and interviewer.' },
        { role: 'user', content: analysisPrompt }
      ]
    )

    // Parse the AI response
    const responseText = typeof response === 'string' ? response : JSON.stringify(response)
    let analysis
    try {
      analysis = JSON.parse(responseText)
    } catch (e) {
      // If JSON parsing fails, try to extract JSON from text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Failed to parse AI analysis')
      }
    }

    // Update interview with analysis
    const { error: updateError } = await (supabase as any)
      .from('interviews')
      .update({
        professional_summary: analysis.professional_summary,
        tech_dna: analysis.tech_dna,
        behavioral_analysis: analysis.behavioral_analysis,
        body_language_analysis: analysis.body_language_analysis,
        overall_recommendation: analysis.overall_recommendation,
        technical_score: analysis.final_score || interviewData.technical_score,
      })
      .eq('id', interviewId)

    if (updateError) {
      console.error('Update error:', updateError)
    }

    return NextResponse.json({
      message: 'Analysis generated successfully',
      analysis,
    })
  } catch (error: any) {
    console.error('Generate analysis error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate analysis' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
