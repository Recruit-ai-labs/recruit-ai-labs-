interface AdzunaJob {
  id: string
  title: string
  description: string
  location: { area: string[]; display_name: string }
  salary_min: number | null
  salary_max: number | null
  created: string
  company: { display_name: string }
  category: { label: string }
  redirect_url: string
}

interface JSearchJob {
  job_id: string
  employer_name: string
  employer_logo: string | null
  job_title: string
  job_description: string
  job_city: string
  job_state: string
  job_country: string
  job_posted_at_datetime_utc: string
  job_salary_min: number | null
  job_salary_max: number | null
  job_apply_link: string
}

export interface AggregatedJob {
  id: string
  title: string
  description: string
  company: string
  location: string
  salaryMin: number | null
  salaryMax: number | null
  postedAt: string
  applyUrl: string
  source: 'adzuna' | 'jsearch'
  externalId: string
}

export async function fetchAdzunaJobs(params: {
  query: string
  location: string
  page?: number
  resultsPerPage?: number
}): Promise<AggregatedJob[]> {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_API_KEY
  
  if (!appId || !appKey) {
    console.warn('Adzuna credentials not configured')
    return []
  }
  
  const url = `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(params.query)}&where=${encodeURIComponent(params.location)}&results_per_page=${params.resultsPerPage || 20}&page=${params.page || 1}`
  
  const response = await fetch(url)
  
  if (!response.ok) {
    return []
  }
  
  const data = await response.json()
  
  return (data.results || []).map((job: AdzunaJob) => ({
    id: job.id,
    title: job.title,
    description: job.description,
    company: job.company?.display_name || 'Unknown',
    location: job.location?.display_name || 'Remote',
    salaryMin: job.salary_min || null,
    salaryMax: job.salary_max || null,
    postedAt: job.created,
    applyUrl: job.redirect_url,
    source: 'adzuna',
    externalId: job.id,
  }))
}

export async function fetchJSearchJobs(params: {
  query: string
  location: string
  page?: number
  numPages?: number
}): Promise<AggregatedJob[]> {
  const apiKey = process.env.JSEARCH_API_KEY
  
  if (!apiKey) {
    console.warn('JSearch API key not configured')
    return []
  }
  
  const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(params.query)}&location=${encodeURIComponent(params.location)}&page=${params.page || 1}&num_pages=${params.numPages || 1}`
  
  const response = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
    },
  })
  
  if (!response.ok) {
    return []
  }
  
  const data = await response.json()
  
  return (data.data || []).map((job: JSearchJob) => ({
    id: job.job_id,
    title: job.job_title,
    description: job.job_description,
    company: job.employer_name || 'Unknown',
    location: [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', ') || 'Remote',
    salaryMin: job.job_salary_min || null,
    salaryMax: job.job_salary_max || null,
    postedAt: job.job_posted_at_datetime_utc,
    applyUrl: job.job_apply_link,
    source: 'jsearch',
    externalId: job.job_id,
  }))
}

export async function searchJobs(params: {
  query: string
  location: string
}): Promise<AggregatedJob[]> {
  const [adzunaJobs, jsearchJobs] = await Promise.all([
    fetchAdzunaJobs(params),
    fetchJSearchJobs(params),
  ])
  
  return [...adzunaJobs, ...jsearchJobs]
}

export async function syndicateJobToBoards(params: {
  title: string
  description: string
  requirements: string
  location: string
  company: string
  salaryMin?: number
  salaryMax?: number
}): Promise<{ adzunaId?: string; jsearchId?: string }> {
  // Note: Actual syndication requires specific API endpoints for each board
  // This is a placeholder for the syndication logic
  console.log('Syndicating job:', params.title)
  
  return {}
}
