import 'server-only';
import { listRecords, pbFilterValue } from './pocketbase';
import { discoverCandidates } from './discovery-core.mjs';

// Bounded, paginated reads keep memory predictable on small machines. Report partial scans explicitly.
export async function loadDiscoveryCandidates(workspaceId, brief, entity, reader = listRecords) {
  const scope = `workspace = "${pbFilterValue(workspaceId)}"`;
  const candidates = []; let total = 0;
  for (let page = 1; page <= 5; page++) {
    const result = await reader('candidates', { filter: `${scope} && status = "active" && consent_status != "withdrawn"`, sort: 'id', perPage: 200, page });
    candidates.push(...(result.items || [])); total = result.totalItems || 0;
    if (page >= (result.totalPages || 1)) break;
  }
  const extractions = []; const warnings = [];
  // Scope extraction reads to candidates scanned; avoid one request per candidate.
  for (let offset = 0; offset < candidates.length; offset += 50) {
    const group = candidates.slice(offset, offset + 50);
    const selected = group.map(c => `candidate = "${pbFilterValue(c.id)}"`).join(' || ');
    try {
      const result = await reader('resume_extractions', { filter: `${scope} && status = "approved" && (${selected})`, sort: '-created', perPage: 500 });
      extractions.push(...(result.items || []));
      if (result.totalPages > 1) warnings.push('Some resume history exceeded this scan limit. Missing evidence may be due to incomplete history.');
    } catch { warnings.push('Reviewed resume evidence could not be loaded for some candidates. Profile evidence is still shown.'); }
  }
  return { candidates: discoverCandidates({ candidates, extractions, brief, entity }), scanned: candidates.length, total, partial: total > candidates.length || warnings.length > 0, warnings: [...new Set(warnings)] };
}
