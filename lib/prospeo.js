import 'server-only';

const PROSPEO_ENDPOINT = 'https://api.prospeo.io/bulk-enrich-person';
const EMAIL_PATTERN = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

function verifiedEmail(person) {
  const email = person?.email;
  const value = String(typeof email === 'string' ? email : email?.email || '').trim().toLowerCase();
  const status = String(typeof email === 'object' ? email?.status || '' : '').toUpperCase();
  const revealed = typeof email === 'string' || email?.revealed === true || email?.revealed === 'true';
  if (status && status !== 'VERIFIED') return null;
  if (!revealed || value.length > 254 || !EMAIL_PATTERN.test(value)) return null;
  return value;
}

function verifiedPhone(person) {
  const mobile = person?.mobile || {};
  const value = String(mobile?.mobile_international || mobile?.mobile || mobile?.mobile_national || person?.phone || person?.phone_number || '').trim();
  const status = String(mobile?.status || '').toUpperCase();
  const revealed = mobile?.revealed === true || mobile?.revealed === 'true';
  return (!status || status === 'VERIFIED') && revealed && value.length >= 7 && value.length <= 30 ? value : null;
}

export async function enrichDiscoveryEmails(results) {
  const rows = Array.isArray(results) ? results : [];
  const apiKey = process.env.PROSPEO_API_KEY;
  if (!apiKey || !rows.length) return rows;

  const data = rows.slice(0, 50).map((item, index) => ({
    identifier: String(index),
    linkedin_url: item?.candidate?.url,
    full_name: item?.candidate?.name || undefined,
    company_name: item?.candidate?.company || undefined,
  })).filter(item => item.linkedin_url);
  if (!data.length) return rows;

  try {
    const response = await fetch(PROSPEO_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-KEY': apiKey },
      body: JSON.stringify({ only_verified_email: false, enrich_mobile: true, only_verified_mobile: false, data }),
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
    const body = await response.json().catch(() => null);
    const matched = Array.isArray(body?.matched) ? body.matched : Array.isArray(body?.data?.matched) ? body.data.matched : [];
    if (!response.ok || body?.error === true || !matched.length) {
      console.warn('[Prospeo] no enrichment matches', { status: response.status, error: body?.error_code || body?.error || null, matched: matched.length, notMatched: body?.not_matched?.length || 0, invalid: body?.invalid_datapoints?.length || 0 });
      return rows;
    }

    const contacts = new Map(matched.flatMap(match => {
      const email = verifiedEmail(match?.person);
      const phone = verifiedPhone(match?.person);
      if (!email && !phone) return [];
      return [[String(match.identifier), { email, phone }]];
    }));
    return rows.map((item, index) => {
      const contact = contacts.get(String(index));
      return contact ? { ...item, candidate: { ...item.candidate, contact: { ...(contact.email ? { workEmail: contact.email } : {}), ...(contact.phone ? { phone: contact.phone } : {}), status: 'verified', source: 'Prospeo' } } } : item;
    });
  } catch (error) {
    console.error('[Prospeo] enrichment request failed:', error?.message || error);
    return rows;
  }
}
