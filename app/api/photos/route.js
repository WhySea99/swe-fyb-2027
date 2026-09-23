import { NextResponse } from 'next/server';
import { supabaseAdmin, BUCKET } from '../../../lib/supabaseAdmin';

export async function GET() {
  const { data: rows, error } = await supabaseAdmin
    .from('submissions')
    .select('id, full_name, nickname, photo_path, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Could not load submissions.' }, { status: 500 });
  }

  const withUrls = await Promise.all(
    rows.map(async (row) => {
      if (!row.photo_path) return { ...row, url: null };
      const { data } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(row.photo_path, 120);
      return { ...row, url: data?.signedUrl || null };
    })
  );

  return NextResponse.json({ submissions: withUrls });
}
