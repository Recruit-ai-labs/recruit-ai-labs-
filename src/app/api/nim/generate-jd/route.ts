import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { role, seniority, skills = [], location } = body

  if (!role) {
    return NextResponse.json({ error: 'Role is required' }, { status: 400 })
  }

  const description = `We are looking for a ${seniority || 'mid-level'} ${role} to join our team in ${location || 'a hybrid environment'}. The ideal candidate will deliver high-quality software, collaborate with product and design, and help scale our platform. You will work with ${skills.length > 0 ? skills.join(', ') : 'modern web technologies'} to build customer-facing features and internal tooling.`
  const requirements = `Requirements:\n- Strong experience with ${skills.length > 0 ? skills.join(', ') : 'software engineering best practices'}\n- Excellent communication and collaboration skills\n- Proven ability to ship products and solve complex problems\n- Familiarity with Agile development and code review process.`

  return NextResponse.json({ description, requirements })
}
