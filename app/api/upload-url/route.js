import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin, BUCKET } from '../../../lib/supabaseAdmin';

export async function POST(request) {
  const deadline = process.env.NEXT_PUBLIC_UPLOAD_DEADLINE;
  if (deadline && Date.now() > new Date(deadline).getTime()) {
    return NextResponse.json({ error: 'Uploads are closed for this round.' }, { status: 403 });
  }

  const body = await request.json();
  const fullName = (body.fullName || '').trim();
  const nickname = (body.nickname || '').trim();
  const fileName = (body.fileName || 'photo.jpg').trim();

  if (!fullName) {
    return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
  }

  const cap = Number(process.env.MAX_UPLOADS_PER_PERSON || 5);
  const { count, error: countError } = await supabaseAdmin
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .ilike('full_name', fullName);

  if (countError) {
    return NextResponse.json({ error: 'Could not check upload count.' }, { status: 500 });
  }
  if (count >= cap) {
    return NextResponse.json(
      { error: `${fullName} has already uploaded the max of ${cap} photos.` },
      { status: 403 }
    );
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const path = `${randomUUID()}-${safeName}`;

  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (signError) {
    return NextResponse.json({ error: 'Could not prepare upload.' }, { status: 500 });
  }

  const { error: insertError } = await supabaseAdmin.from('submissions').insert({
    full_name: fullName,
    nickname: nickname || null,
    photo_path: path,
  });

  if (insertError) {
    return NextResponse.json({ error: 'Could not save submission.' }, { status: 500 });
  }

  return NextResponse.json({ path, token: signed.token, bucket: BUCKET });
}
