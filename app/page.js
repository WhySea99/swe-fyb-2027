'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { supabaseBrowser } from '../lib/supabaseBrowser';
import { bgBase64 } from '../lib/heroBg';

const MAX_MB = 10;
const MAX_FILES = 5;
const DEADLINE = process.env.NEXT_PUBLIC_UPLOAD_DEADLINE;
const STORAGE_KEY = 'swe_fyb_uploader';

const LEVELS = ['100 Level', '200 Level', '300 Level', '400 Level'];
const CATEGORIES = [
  'Corporate Photos',
  'Academic Moment',
  'Department Event',
  'Project / Presentation',
  'Hackathon / Competition',
  'Field Trip / Seminar',
  'Award / Achievement',
  'Social / Hangout',
  'Random Moment',
  'Other',
];

export default function Home() {
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [level, setLevel] = useState('');
  const [category, setCategory] = useState('');
  const [caption, setCaption] = useState('');
  const [eventName, setEventName] = useState('');
  const [allowPublic, setAllowPublic] = useState(false);
  const [files, setFiles] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState([]);
  const [remembered, setRemembered] = useState(false);

  const closed = useMemo(() => {
    if (!DEADLINE) return false;
    return Date.now() > new Date(DEADLINE).getTime();
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { fullName: fn, nickname: nn } = JSON.parse(saved);
        if (fn) { setFullName(fn); setNickname(nn || ''); setRemembered(true); }
      }
    } catch (_) {}
    return () => files.forEach((f) => URL.revokeObjectURL(f.preview));
  }, []);

  function clearRemembered() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    setFullName(''); setNickname(''); setRemembered(false);
  }

  function handleFileInput(e) {
    const picked = Array.from(e.target.files || []);
    addFiles(picked);
    e.target.value = '';
  }

  function addFiles(picked) {
    const remaining = MAX_FILES - files.length;
    if (remaining <= 0) return;
    const toAdd = [], errors = [];
    for (const f of picked.slice(0, remaining)) {
      if (f.size > MAX_MB * 1024 * 1024) { errors.push(`${f.name} is over ${MAX_MB}MB — skipped.`); continue; }
      toAdd.push({ file: f, preview: URL.createObjectURL(f) });
    }
    if (picked.length > remaining) errors.push(`Only ${remaining} more photo${remaining !== 1 ? 's' : ''} allowed (max ${MAX_FILES}).`);
    setFiles((prev) => [...prev, ...toAdd]);
    if (errors.length) setStatus({ type: 'error', text: errors.join(' ') });
    else setStatus(null);
  }

  function removeFile(index) {
    URL.revokeObjectURL(files[index].preview);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (lightbox === index) setLightbox(null);
    else if (lightbox !== null && lightbox > index) setLightbox((l) => l - 1);
  }

  function openLightbox(i) { setLightbox(i); }
  function closeLightbox() { setLightbox(null); }
  function lightboxPrev() { setLightbox((i) => (i - 1 + files.length) % files.length); }
  function lightboxNext() { setLightbox((i) => (i + 1) % files.length); }

  const touchStart = useCallback((e) => { e._startX = e.touches[0].clientX; }, []);
  const touchEnd = useCallback((e) => {
    const diff = e._startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? lightboxNext() : lightboxPrev();
  }, [files.length]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!fullName.trim()) { setStatus({ type: 'error', text: 'Full name is required.' }); return; }
    if (!level) { setStatus({ type: 'error', text: 'Select your level.' }); return; }
    if (!category) { setStatus({ type: 'error', text: 'Select a category.' }); return; }
    if (files.length === 0) { setStatus({ type: 'error', text: 'Add at least one photo.' }); return; }

    setBusy(true); setStatus(null);
    setProgress(files.map(() => 'pending'));
    let anyFailed = false;

    for (let i = 0; i < files.length; i++) {
      const { file } = files[i];
      setProgress((prev) => { const n = [...prev]; n[i] = 'uploading'; return n; });
      try {
        const res = await fetch('/api/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: fullName.trim(), nickname: nickname.trim(),
            fileName: file.name, allowPublicFeature: allowPublic,
            level, category,
            caption: caption.trim(), eventName: eventName.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed.');
        const { error: uploadError } = await supabaseBrowser.storage
          .from(data.bucket).uploadToSignedUrl(data.path, data.token, file);
        if (uploadError) throw uploadError;
        setProgress((prev) => { const n = [...prev]; n[i] = 'done'; return n; });
      } catch (err) {
        setProgress((prev) => { const n = [...prev]; n[i] = 'error'; return n; });
        anyFailed = true;
      }
    }

    setBusy(false);
    if (!anyFailed) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ fullName: fullName.trim(), nickname: nickname.trim() })); } catch (_) {}
      setStatus({ type: 'success', text: 'Added to memories 🤍' });
      files.forEach((f) => URL.revokeObjectURL(f.preview));
      setFiles([]); setProgress([]); setRemembered(true);
      setLevel(''); setCategory(''); setCaption(''); setEventName(''); setAllowPublic(false);
    } else {
      setStatus({ type: 'error', text: 'Some photos failed. Check below and try again.' });
    }
  }

  const progressIcon = (s) => ({ uploading: '⏳', done: '✓', error: '✗' }[s] || null);

  return (
    <main className="wrap">
      <section className="hero" style={{ backgroundImage: `url(${bgBase64})` }}>
        <div className="hero-overlay" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        <div className="hero-content">
          <span className="class-label">SWE • CLASS OF 2027</span>
          <h1 className="hero-title">Hey, Software Engineer 👋🏽</h1>
          <p className="hero-copy-main">
            It&apos;s almost time to leave our mark. Drop your corporate-wear photo,
            whether it&apos;s a solo shot or one with your squad, and become part of
            the SWE FYB 2027 archive.
          </p>
          <p className="hero-copy-privacy">
            Your submission stays private. You can choose whether you&apos;d like it
            to be considered for public features.
          </p>
        </div>
      </section>

      {closed ? (
        <div className="closed-banner">Uploads are closed for this round. Check back for the next one.</div>
      ) : (
        <form className="panel" onSubmit={handleSubmit}>
          {/* Name */}
          <div className="field">
            <label htmlFor="fullName">
              Full name
              {remembered && (
                <button type="button" className="not-you" onClick={clearRemembered}>Not you?</button>
              )}
            </label>
            <input id="fullName" type="text" value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Otiti Chigoziem Psalm" required />
            {remembered && <p className="remembered-note">Welcome back — name pre-filled from your last visit.</p>}
          </div>

          {/* Nickname */}
          <div className="field">
            <label htmlFor="nickname">Nickname (optional)</label>
            <input id="nickname" type="text" value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g Big H" />
          </div>

          {/* Level */}
          <div className="field">
            <label htmlFor="level">Level</label>
            <select id="level" value={level} onChange={(e) => setLevel(e.target.value)} required>
              <option value="">Select your level…</option>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Category */}
          <div className="field">
            <label htmlFor="category">Category</label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} required>
              <option value="">Select a category…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Event name */}
          <div className="field">
            <label htmlFor="eventName">Event / Moment name (optional)</label>
            <input id="eventName" type="text" value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g. SIWES Defence Day" />
          </div>

          {/* Caption */}
          <div className="field">
            <label htmlFor="caption">Caption (optional)</label>
            <input id="caption" type="text" value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Something to remember this by" />
          </div>

          {/* Photos */}
          <div className="field">
            <label>Photos (max {MAX_MB}MB each · up to {MAX_FILES})</label>
            {files.length > 0 && (
              <div className="thumb-grid">
                {files.map((f, i) => (
                  <div className="thumb-wrap" key={f.preview}>
                    <img src={f.preview} alt={`Preview ${i + 1}`} className="thumb-img" onClick={() => openLightbox(i)} />
                    {progress[i] && <div className={`thumb-badge badge-${progress[i]}`}>{progressIcon(progress[i])}</div>}
                    {!busy && <button type="button" className="thumb-remove" onClick={() => removeFile(i)} aria-label="Remove">✕</button>}
                  </div>
                ))}
                {files.length < MAX_FILES && <label className="thumb-add" htmlFor="photo">+</label>}
              </div>
            )}
            {files.length === 0 && (
              <label htmlFor="photo" className="file-drop">Tap to choose up to {MAX_FILES} photos</label>
            )}
            <input id="photo" type="file" accept="image/*" multiple onChange={handleFileInput} style={{ display: 'none' }} />
            <p className="spec-note">Tap a preview to view fullscreen · tap ✕ to remove</p>
          </div>

          {/* Public feature checkbox */}
          <div className="field checkbox-field">
            <label className="checkbox-label">
              <input type="checkbox" checked={allowPublic} onChange={(e) => setAllowPublic(e.target.checked)} />
              <span>Allow this photo to be featured publicly</span>
            </label>
            <p className="checkbox-note">
              Your photo will remain private unless selected for a public feature.
              You can still submit for the class archive without enabling this.
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

      {lightbox !== null && files[lightbox] && (
        <div className="lightbox" onClick={closeLightbox} onTouchStart={touchStart} onTouchEnd={touchEnd}>
          <button className="lightbox-close" onClick={closeLightbox} type="button">✕</button>
          {files.length > 1 && <button className="lightbox-nav lightbox-prev" onClick={(e) => { e.stopPropagation(); lightboxPrev(); }} type="button">‹</button>}
          <img src={files[lightbox].preview} alt="Full preview" className="lightbox-img" onClick={(e) => e.stopPropagation()} />
          {files.length > 1 && <button className="lightbox-nav lightbox-next" onClick={(e) => { e.stopPropagation(); lightboxNext(); }} type="button">›</button>}
          <div className="lightbox-footer" onClick={(e) => e.stopPropagation()}>
            <span className="lightbox-count">{lightbox + 1} / {files.length}</span>
            <button type="button" className="lightbox-remove" onClick={() => removeFile(lightbox)}>Remove this photo</button>
          </div>
        </div>
      )}

      <div className="footer">Software Engineering FYB Class of 2027</div>
    </main>
  );
}
