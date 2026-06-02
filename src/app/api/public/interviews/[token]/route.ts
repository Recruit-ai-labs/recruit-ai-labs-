import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/pocketbase-server'

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const pb = await getAdminClient()

    // Find interview by public_token
    const interviews = await pb.collection('interviews').getList(1, 1, {
      filter: `public_token = "${params.token}"`,
      expand: 'application_id.candidate_id,application_id.job_id',
    })

    if (interviews.items.length === 0) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    const interview = interviews.items[0]
    const application = interview.expand?.application_id
    const candidate = application?.expand?.candidate_id
    const job = application?.expand?.job_id

    // Format response to match original structure
    const formattedInterview = {
      ...interview,
      applications: {
        candidates: {
          name: candidate?.name,
          email: candidate?.email,
          phone: candidate?.phone,
          linkedin_url: candidate?.linkedin_url,
          github_url: candidate?.github_url,
          resume_url: candidate?.resume ? `${process.env.POCKETBASE_URL}/api/files/candidates/${candidate.id}/${candidate.resume}` : null,
          parsed_skills: candidate?.parsed_skills || [],
        },
        jobs: {
          title: job?.title,
          location: job?.location,
          description: job?.description,
          requirements: job?.requirements,
        }
      }
    }

    return NextResponse.json({ interview: formattedInterview })
  } catch (error: any) {
    console.error('Public interview GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch interview' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
