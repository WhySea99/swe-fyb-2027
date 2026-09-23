import { NextResponse } from 'next/server';
import { supabaseAdmin, BUCKET } from '../../../lib/supabaseAdmin';

export async function POST(request) {
  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
  }

  const { data: row, error: fetchError } = await supabaseAdmin
    .from('submissions')
    .select('photo_path')
    .eq('id', id)
    .single();

  if (fetchError || !row) {
    return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
  }

  if (row.photo_path) {
    await supabaseAdmin.storage.from(BUCKET).remove([row.photo_path]);
  }

  const { error: deleteError } = await supabaseAdmin.from('submissions').delete().eq('id', id);
  if (deleteError) {
    return NextResponse.json({ error: 'Could not delete submission.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
