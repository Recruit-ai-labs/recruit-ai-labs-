import { NextResponse } from 'next/server';
import { extractJdDetails } from '../../../../lib/discovery-simple.mjs';

export async function POST(req) {
  try {
    const { jdText } = await req.json();
    if (!jdText || typeof jdText !== 'string') {
      return NextResponse.json({ error: 'jdText is required' }, { status: 400 });
    }
    const extracted = await extractJdDetails(jdText);
    return NextResponse.json({ success: true, data: extracted });
  } catch (e) {
    console.error('JD extraction error:', e);
    return NextResponse.json({ error: e.message || 'JD extraction failed' }, { status: 500 });
  }
}
