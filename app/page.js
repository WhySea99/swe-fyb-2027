'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { supabaseBrowser } from '../lib/supabaseBrowser';

const MAX_MB = 10;
const MAX_FILES = 5;
const DEADLINE = process.env.NEXT_PUBLIC_UPLOAD_DEADLINE;

export default function Home() {
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [files, setFiles] = useState([]); // [{file, preview}]
  const [lightbox, setLightbox] = useState(null); // index
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState([]); // per-file status

  const closed = useMemo(() => {
    if (!DEADLINE) return false;
    return Date.now() > new Date(DEADLINE).getTime();
  }, []);

  // clean up object URLs on unmount
  useEffect(() => {
    return () => files.forEach((f) => URL.revokeObjectURL(f.preview));
  }, []);

  function handleFileInput(e) {
    const picked = Array.from(e.target.files || []);
    addFiles(picked);
    e.target.value = '';
  }

  function addFiles(picked) {
    const remaining = MAX_FILES - files.length;
    if (remaining <= 0) return;

    const toAdd = [];
    const errors = [];

    for (const f of picked.slice(0, remaining)) {
      if (f.size > MAX_MB * 1024 * 1024) {
        errors.push(`${f.name} is over ${MAX_MB}MB — skipped.`);
        continue;
      }
      toAdd.push({ file: f, preview: URL.createObjectURL(f) });
    }

    if (picked.length > remaining) {
      errors.push(`Only ${remaining} more photo${remaining !== 1 ? 's' : ''} allowed (max ${MAX_FILES}).`);
    }

    setFiles((prev) => [...prev, ...toAdd]);
    if (errors.length) setStatus({ type: 'error', text: errors.join(' ') });
    else setStatus(null);
  }

  function removeFile(index) {
    URL.revokeObjectURL(files[index].preview);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (lightbox === index) setLightbox(null);
    else if (lightbox > index) setLightbox((l) => l - 1);
  }

  function openLightbox(index) { setLightbox(index); }
  function closeLightbox() { setLightbox(null); }

  function lightboxPrev() {
    setLightbox((i) => (i - 1 + files.length) % files.length);
  }
  function lightboxNext() {
    setLightbox((i) => (i + 1) % files.length);
  }

  // swipe support
  const touchStart = useCallback((e) => {
    e._startX = e.touches[0].clientX;
  }, []);
  const touchEnd = useCallback((e) => {
    const diff = e._startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? lightboxNext() : lightboxPrev();
  }, [files.length]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!fullName.trim()) {
      setStatus({ type: 'error', text: 'Full name is required.' });
      return;
    }
    if (files.length === 0) {
      setStatus({ type: 'error', text: 'Add at least one photo.' });
      return;
    }

    setBusy(true);
    setStatus(null);
    setProgress(files.map(() => 'pending'));

    let anyFailed = false;

    for (let i = 0; i < files.length; i++) {
      const { file } = files[i];
      setProgress((prev) => { const n = [...prev]; n[i] = 'uploading'; return n; });

      try {
        const res = await fetch('/api/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName, nickname, fileName: file.name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed.');

        const { error: uploadError } = await supabaseBrowser.storage
          .from(data.bucket)
          .uploadToSignedUrl(data.path, data.token, file);
        if (uploadError) throw uploadError;

        setProgress((prev) => { const n = [...prev]; n[i] = 'done'; return n; });
      } catch (err) {
        setProgress((prev) => { const n = [...prev]; n[i] = 'error'; return n; });
        anyFailed = true;
      }
    }

    setBusy(false);

    if (!anyFailed) {
      setStatus({ type: 'success', text: 'Added to memories 🤍' });
      files.forEach((f) => URL.revokeObjectURL(f.preview));
      setFiles([]);
      setFullName('');
      setNickname('');
      setProgress([]);
    } else {
      setStatus({ type: 'error', text: 'Some photos failed to upload. Check below.' });
    }
  }

  const progressIcon = (state) => {
    if (state === 'uploading') return '⏳';
    if (state === 'done') return '✓';
    if (state === 'error') return '✗';
    return null;
  };

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
              placeholder="e.g Big H"
            />
          </div>

          <div className="field">
            <label>
              Photos (corporate wear · max {MAX_MB}MB each · up to {MAX_FILES})
            </label>

            {files.length > 0 && (
              <div className="thumb-grid">
                {files.map((f, i) => (
                  <div className="thumb-wrap" key={f.preview}>
                    <img
                      src={f.preview}
                      alt={`Preview ${i + 1}`}
                      className="thumb-img"
                      onClick={() => openLightbox(i)}
                    />
                    {progress[i] && (
                      <div className={`thumb-badge badge-${progress[i]}`}>
                        {progressIcon(progress[i])}
                      </div>
                    )}
                    {!busy && (
                      <button
                        type="button"
                        className="thumb-remove"
                        onClick={() => removeFile(i)}
                        aria-label="Remove"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {files.length < MAX_FILES && (
                  <label className="thumb-add" htmlFor="photo">
                    +
                  </label>
                )}
              </div>
            )}

            {files.length === 0 && (
              <label htmlFor="photo" className="file-drop">
                Tap to choose up to {MAX_FILES} photos
              </label>
            )}

            <input
              id="photo"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
            <p className="spec-note">
              Tap a preview to view fullscreen · tap ✕ to remove
            </p>
          </div>

          <button className="primary" type="submit" disabled={busy}>
            {busy
              ? `Uploading ${files.length} photo${files.length !== 1 ? 's' : ''}…`
              : `Upload ${files.length > 0 ? files.length + ' ' : ''}photo${files.length !== 1 ? 's' : ''}`}
          </button>

          {status && <p className={`status ${status.type}`}>{status.text}</p>}
        </form>
      )}

      {/* Lightbox */}
      {lightbox !== null && files[lightbox] && (
        <div
          className="lightbox"
          onClick={closeLightbox}
          onTouchStart={touchStart}
          onTouchEnd={touchEnd}
        >
          <button
            className="lightbox-close"
            onClick={closeLightbox}
            type="button"
          >
            ✕
          </button>

          {files.length > 1 && (
            <button
              className="lightbox-nav lightbox-prev"
              onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
              type="button"
            >
              ‹
            </button>
          )}

          <img
            src={files[lightbox].preview}
            alt="Full preview"
            className="lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />

          {files.length > 1 && (
            <button
              className="lightbox-nav lightbox-next"
              onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
              type="button"
            >
              ›
            </button>
          )}

          <div className="lightbox-footer" onClick={(e) => e.stopPropagation()}>
            <span className="lightbox-count">
              {lightbox + 1} / {files.length}
            </span>
            <button
              type="button"
              className="lightbox-remove"
              onClick={() => removeFile(lightbox)}
            >
              Remove this photo
            </button>
          </div>
        </div>
      )}

      <div className="footer">Software Engineering FYB Class of 2027</div>
    </main>
  );
}
