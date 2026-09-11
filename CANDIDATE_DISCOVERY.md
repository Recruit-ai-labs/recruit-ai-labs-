# Candidate discovery

Open `/dashboard/discovery` or **Discovery** in the dashboard sidebar. Owners, admins and recruiters can run discovery. Existing Clerk workspace authorization protects every server action.

## Working flow

1. Select a saved job, enter an editable role brief, or upload/paste a JD. TXT/PDF/DOCX uploads are limited to 750 KB; pasted/extracted JD text to 20,000 characters. Scanned PDFs without selectable text need a pasted transcription. Extracted skills include source excerpts and must be reviewed.
2. Enter a place or organisation. Search resolves possible cities, areas, states, countries, institutions and companies. Suggestions cite search snippets. Explicit search knowledge-graph types and direct “X is a city/institute/company” source statements resolve without an LLM; otherwise hosted AI proposes grounded interpretations. The recruiter selects the intended meaning or sets a manual scope.
3. Scan workspace profiles and approved resume extractions. With a selected scope, public discovery now returns a nested funnel: indexed LinkedIn profiles connected to the scope, the subset with JD evidence, and the best-evidenced subset ready for Tech DNA review. Candidate search paginates Serper in supported batches: up to five scope pages, three JD pages, one GitHub page and one project-evidence page; entity resolution uses one call.
4. Open **Build detailed Tech DNA** on a shortlisted public profile to run two candidate-specific searches and a grounded AI review. It shows requirement-by-requirement evidence, technical signals, identity/evidence risks and verification steps. It never assumes that a same-name GitHub account belongs to the LinkedIn person.
5. Review **Documented requirements**, **Needs more evidence**, **Experience review**, and **Web leads**. Missing information creates collection steps, not a failed-skill verdict. Add a workspace candidate to a selected job and open the existing full job-match evaluation workflow.
6. Save search criteria for the workspace. Saved criteria are stored as `discovery.search_saved` activity records; refreshing shows the latest 12. Results are recomputed when the search is rerun.

## Scope and evidence semantics

- Geographic scopes check candidate location; institutions check approved education fields; companies check current/past employment fields. A free-text event mention does not establish institutional membership.
- Resolver validation checks real source IDs, exact source excerpts, entity names and relationship to the original query. The host city of an institution is not a valid replacement for the institution. Ambiguous names retain location distinctions.
- A selected geographic disambiguator must occur in candidate location evidence. An incomplete location remains unconfirmed rather than being treated as disproven. This is text-based matching, not geospatial radius search or a complete geographic hierarchy.
- Required-skill coverage is the share of criteria with documented skill claims. It is **not a competence, probability, or hiring score**. Structured skill labels and a small explicit alias dictionary are used; free-text summaries are not interpreted as proof of skills. Skill assessment and semantic job evaluation remain separate review steps.
- Profile and reviewed-resume claims retain their source. Reviewed resume text is not independently verified work. Replaced resume files do not reuse extractions tied to the old filename. Existing manually/profile-approved skill fields remain profile claims until updated.
- No LinkedIn account, public GitHub repository, posting history, follower count or portfolio is required for workspace discovery. Unknown candidates remain visible in the evidence-collection group, alphabetically like the other groups.
- Private and unindexed portfolios cannot be found by public search. Use direct applications, candidate intake and provided project evidence. Any ordinary public portfolio URL, including Azure-hosted sites, can be recorded through the existing candidate form.
- Web results are unverified links, not verified people or proof of skills. Only identical normalized URLs are deduplicated. Profiles are never merged by name. No background scraping, identity inference or automatic messaging is performed.

## Configuration

No model weights or new runtime dependencies are installed on the laptop.

- Existing `NVIDIA_NIM_API_KEY` and `NVIDIA_NIM_BASE_URL` power hosted extraction/resolution.
- Optional `DISCOVERY_LLM_MODEL` defaults to `meta/llama-3.1-8b-instruct`. On an API/JSON failure, there is one fallback to the existing `NIM_FAST_LLM_MODEL` or `NIM_LLM_MODEL`. Each attempt has a 30-second timeout. GPT-OSS requests use low reasoning effort for these short tasks. Actual successful model is returned in provider results.
- `SERPER_API_KEY` enables public search and scope resolution.
- Provider flags mean configured, not guaranteed healthy. Timeouts, quota errors, unavailable services and partial results are surfaced. Manual brief/scope entry and workspace search do not require external providers.
- Only the JD is sent to the LLM for extraction; scope queries and search snippets are sent for entity resolution. Candidate database records are processed locally by discovery. Public search receives selected role/skills/scope when requested. Existing downstream job evaluation has its own data flow.

## Boundaries before a larger pilot

Workspace scans page through up to 1,000 active, non-withdrawn profiles; partial scans are labelled. Approved resume history is loaded in batches of 50 candidate IDs, with at most 500 extraction records per batch. Truncated history and failed reads are labelled incomplete. The saved-job picker shows up to 100 recently updated available jobs. These limits bound memory and request work; this is not exhaustive sourcing at arbitrary scale.

The short server-action cooldown is per process/user and prevents accidental repeated calls. Production deployments with multiple processes need a shared rate limiter and provider budget controls. No model can guarantee that all good candidates were discovered. Validate candidate recall and useful-shortlist precision against a consented, independently assessed cohort, including candidates with little online presence and candidates the search did not shortlist. The included fixtures are engineering tests, not a hiring-quality benchmark.

## Verification commands

```powershell
node --test tests/discovery.test.mjs tests/discovery-actions.test.mjs
node --env-file=.env.local tests/discovery-pocketbase.integration.mjs
node --env-file=.env.local tests/discovery.live.mjs
# Set PLAYWRIGHT_MODULE to an existing Playwright package if it is not installed in this project.
node tests/discovery-browser.cjs
npm.cmd run build
```

The database integration test creates isolated local fixtures and removes them. The opt-in provider smoke test sends only a synthetic JD and public place queries; it checks provider operation and resolution, not candidate quality. Browser actions are fixture-backed and run in actual Chromium, including ambiguity selection, missing-evidence paths, saving, pipeline actions, recovery, and 320/390/768/1440-pixel layouts.

Provider references: [Serper search API](https://serper.dev/), [NVIDIA Llama 3.1 8B endpoint](https://docs.api.nvidia.com/nim/reference/meta-llama-3_1-8b-infer), [NVIDIA GPT-OSS endpoint and reasoning settings](https://docs.api.nvidia.com/nim/re/reference/openai-gpt-oss-20b-infer).
