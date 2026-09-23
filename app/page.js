'use client';

import { useMemo, useState } from 'react';
import { supabaseBrowser } from '../lib/supabaseBrowser';

const MAX_MB = 10;
const DEADLINE = process.env.NEXT_PUBLIC_UPLOAD_DEADLINE;

export default function Home() {
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const closed = useMemo(() => {
    if (!DEADLINE) return false;
    return Date.now() > new Date(DEADLINE).getTime();
  }, []);

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      setStatus({ type: 'error', text: `That file is over ${MAX_MB}MB. Pick a smaller one.` });
      setFile(null);
      setPreview(null);
      return;
    }
    setFile(f);
    setStatus(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  function handleRemove() {
    setFile(null);
    setPreview(null);
    setStatus(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!fullName.trim()) {
      setStatus({ type: 'error', text: 'Full name is required.' });
      return;
    }
    if (!file) {
      setStatus({ type: 'error', text: 'Pick a photo first.' });
      return;
    }

    setBusy(true);
    setStatus(null);

    try {
      const res = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, nickname, fileName: file.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');

      const { error: uploadError } = await supabaseBrowser.storage
        .from(data.bucket)
        .uploadToSignedUrl(data.path, data.token, file);

      if (uploadError) throw uploadError;

      setStatus({ type: 'success', text: 'Added to memories 🤍' });
      setFullName('');
      setNickname('');
      setFile(null);
      setPreview(null);
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'Upload failed. Try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap">
      <p className="year">2027</p>
      <h1 className="hero-title">Hey Software Engineer👋🏽</h1>
      <p className="hero-copy">
        It&apos;s almost time to leave our mark. Drop your corporate-wear photo, whether
        it&apos;s a solo shot or one with your squad, and let&apos;s get you into the
        SWE FYB 2027 archive. Your upload stays private. You won&apos;t see anyone
        else&apos;s photo, and they won&apos;t see yours either.
      </p>

      {closed ? (
        <div className="closed-banner">
          Uploads are closed for this round. Check back for the next one.
        </div>
      ) : (
        <form className="panel" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Otiti Chigoziem Psalm"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="nickname">Nickname (optional)</label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Big H"
            />
          </div>

          <div className="field">
            <label htmlFor="photo">Photo (corporate wear, max {MAX_MB}MB)</label>

            {preview ? (
              <div className="preview-wrap">
                <img src={preview} alt="Selected photo" className="preview-img" />
                <div className="preview-meta">
                  <span className="preview-name">{file.name}</span>
                  <span className="preview-size">
                    {(file.size / (1024 * 1024)).toFixed(1)}MB
                  </span>
                </div>
                <button
                  type="button"
                  className="preview-remove"
                  onClick={handleRemove}
                >
                  Remove — pick a different one
                </button>
              </div>
            ) : (
              <>
                <label htmlFor="photo" className="file-drop">
                  Tap to choose a photo
                </label>
                <p className="spec-note">JPG or PNG · up to {MAX_MB}MB · uploaded at full quality</p>
              </>
            )}

            <input
              id="photo"
              type="file"
              accept="image/*"
              onChange={handleFile}
              style={{ display: 'none' }}
            />
          </div>

          <button className="primary" type="submit" disabled={busy}>
            {busy ? 'Uploading…' : 'Upload photo'}
          </button>

          {status && <p className={`status ${status.type}`}>{status.text}</p>}
        </form>
      )}

      <div className="footer">Software Engineering FYB Class of 2027</div>
    </main>
  );
}
