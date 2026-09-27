import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function POST(request) {
  const { fromName, toName } = await request.json();

  if (!fromName || !toName) {
    return NextResponse.json({ error: 'Both names required.' }, { status: 400 });
  }
  if (fromName.trim().toLowerCase() === toName.trim().toLowerCase()) {
    return NextResponse.json({ error: 'Names are the same.' }, { status: 400 });
  }

  const { error, count } = await supabaseAdmin
    .from('submissions')
    .update({ full_name: toName.trim() })
    .ilike('full_name', fromName.trim())
    .select('id', { count: 'exact' });

  if (error) {
    return NextResponse.json({ error: 'Rename failed.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: count });
}
