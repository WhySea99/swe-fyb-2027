import archiver from 'archiver';
import { supabaseAdmin, BUCKET } from '../../../lib/supabaseAdmin';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get('ids');

  let query = supabaseAdmin
    .from('submissions')
    .select('id, full_name, photo_path, created_at')
    .order('created_at', { ascending: true });

  if (ids) {
    query = query.in('id', ids.split(','));
  }

  const { data: rows, error } = await query;

  if (error) {
    return new Response('Could not load submissions.', { status: 500 });
  }

  const archive = archiver('zip', { zlib: { level: 9 } });
  const chunks = [];
  const done = new Promise((resolve, reject) => {
    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('end', resolve);
    archive.on('error', reject);
  });

  for (const row of rows) {
    if (!row.photo_path) continue;
    const { data, error: downloadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(row.photo_path);
    if (downloadError || !data) continue;

    const buffer = Buffer.from(await data.arrayBuffer());
    const safeName = row.full_name.replace(/[^a-zA-Z0-9]/g, '_');
    const ext = row.photo_path.split('.').pop() || 'jpg';
    archive.append(buffer, { name: `${safeName}-${row.id}.${ext}` });
  }

  archive.finalize();
  await done;
  const zipBuffer = Buffer.concat(chunks);

  const label = ids ? 'selected' : 'all';

  return new Response(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="swe-fyb-2027-${label}.zip"`,
    },
  });
}
