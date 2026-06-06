import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { answer, expectedAnswer, question, evaluationCriteria } = body

  if (!answer || !question) {
    return NextResponse.json({ error: 'Missing answer or question' }, { status: 400 })
  }

  const normalizedAnswer = answer.trim().toLowerCase()
  const normalizedExpected = (expectedAnswer || '').toLowerCase()
  const baseScore = normalizedAnswer.length > 50 ? 70 : 50
  const keywordBonus = normalizedExpected.split(' ').filter(word => word && normalizedAnswer.includes(word)).length
  const score = Math.min(100, baseScore + Math.min(30, keywordBonus * 3))

  const strengths = ['Clear structure', 'Relevant examples']
  const weaknesses = normalizedAnswer.length < 150 ? ['Answer is brief'] : []
  const feedback = `The answer scored ${score}/100. Focus on adding more detail and using concrete examples.`
  const recommendation = score >= 75 ? 'hire' : score >= 55 ? 'consider' : 'reject'

  return NextResponse.json({ score, strengths, weaknesses, feedback, recommendation, evaluationCriteria })
}
