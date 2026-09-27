'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [publicFilter, setPublicFilter] = useState('all'); // 'all' | 'allowed' | 'denied'
  const [selected, setSelected] = useState(new Set());
  const [mergeFrom, setMergeFrom] = useState('');
  const [mergeTo, setMergeTo] = useState('');
  const [mergeStatus, setMergeStatus] = useState(null);
  const [showMerge, setShowMerge] = useState(false);
  const router = useRouter();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/photos');
    if (res.ok) {
      const data = await res.json();
      setSubmissions(data.submissions);
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this photo? This cannot be undone.')) return;
    await fetch('/api/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  async function handleMerge(e) {
    e.preventDefault();
    setMergeStatus(null);
    if (!mergeFrom || !mergeTo) { setMergeStatus({ type: 'error', text: 'Fill in both names.' }); return; }
    const res = await fetch('/api/rename', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromName: mergeFrom, toName: mergeTo }),
    });
    const data = await res.json();
    if (!res.ok) { setMergeStatus({ type: 'error', text: data.error || 'Failed.' }); return; }
    setMergeStatus({ type: 'success', text: `Done — ${data.updated} photo${data.updated !== 1 ? 's' : ''} moved to "${mergeTo}".` });
    setMergeFrom(''); setMergeTo('');
    load();
  }

  function toggleSelect(id) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((s) => s.id)));
  }

  function downloadUrl() {
    if (selected.size === 0) return '/api/export';
    return `/api/export?ids=${[...selected].join(',')}`;
  }

  const names = useMemo(() => [...new Set(submissions.map((s) => s.full_name))].sort(), [submissions]);

  const filtered = useMemo(() => {
    let list = submissions;
    if (search) list = list.filter((s) => s.full_name.toLowerCase().includes(search.toLowerCase()));
    if (publicFilter === 'allowed') list = list.filter((s) => s.allow_public_feature);
    if (publicFilter === 'denied') list = list.filter((s) => !s.allow_public_feature);
    return list;
  }, [submissions, search, publicFilter]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id));

  const publicCount = submissions.filter((s) => s.allow_public_feature).length;

  return (
    <main className="wrap">
      <div className="admin-topbar">
        <h1 className="admin-title">
          SWE FYB 2027 — {filtered.length} photo{filtered.length !== 1 ? 's' : ''}
          {selected.size > 0 && ` · ${selected.size} selected`}
        </h1>
        <div className="admin-actions">
          <a className="btn-ghost" href={downloadUrl()}>
            {selected.size > 0 ? `Download selected (${selected.size})` : 'Download all (.zip)'}
          </a>
          <button className="btn-ghost" onClick={() => setShowMerge((v) => !v)}>
            {showMerge ? 'Hide merge' : 'Merge names'}
          </button>
          <button className="btn-ghost" onClick={handleLogout}>Log out</button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="stats-bar">
        <span className="stat">Total: <strong>{submissions.length}</strong></span>
        <span className="stat public-yes">Public allowed: <strong>{publicCount}</strong></span>
        <span className="stat public-no">Private only: <strong>{submissions.length - publicCount}</strong></span>
      </div>

      {/* Merge panel */}
      {showMerge && (
        <form className="merge-panel" onSubmit={handleMerge}>
          <p className="merge-title">Merge duplicate names</p>
          <p className="merge-desc">Moves all photos from one name to another. Matches case-insensitively.</p>
          <div className="merge-row">
            <div className="field" style={{ flex: 1 }}>
              <label>From (wrong / duplicate)</label>
              <select value={mergeFrom} onChange={(e) => setMergeFrom(e.target.value)}>
                <option value="">Select a name…</option>
                {names.map((n) => <option key={n} value={n}>{n} ({submissions.filter(s => s.full_name === n).length})</option>)}
              </select>
            </div>
            <div className="merge-arrow">→</div>
            <div className="field" style={{ flex: 1 }}>
              <label>To (correct name)</label>
              <select value={mergeTo} onChange={(e) => setMergeTo(e.target.value)}>
                <option value="">Select a name…</option>
                {names.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <button className="primary merge-btn" type="submit">Merge</button>
          </div>
          {mergeStatus && <p className={`status ${mergeStatus.type}`}>{mergeStatus.text}</p>}
        </form>
      )}

      {/* Name filter chips */}
      <div className="filter-bar">
        <button className={`filter-chip ${!search && publicFilter === 'all' ? 'active' : ''}`}
          onClick={() => { setSearch(''); setPublicFilter('all'); }}>
          All ({submissions.length})
        </button>
        <button className={`filter-chip chip-public ${publicFilter === 'allowed' ? 'active' : ''}`}
          onClick={() => { setSearch(''); setPublicFilter(publicFilter === 'allowed' ? 'all' : 'allowed'); }}>
          Public allowed ({publicCount})
        </button>
        <button className={`filter-chip chip-private ${publicFilter === 'denied' ? 'active' : ''}`}
          onClick={() => { setSearch(''); setPublicFilter(publicFilter === 'denied' ? 'all' : 'denied'); }}>
          Private only ({submissions.length - publicCount})
        </button>
        {names.map((name) => (
          <button key={name}
            className={`filter-chip ${search === name ? 'active' : ''}`}
            onClick={() => { setSearch(search === name ? '' : name); setPublicFilter('all'); }}>
            {name} ({submissions.filter((s) => s.full_name === name).length})
          </button>
        ))}
      </div>

      {/* Select bar */}
      {!loading && filtered.length > 0 && (
        <div className="select-bar">
          <button className="select-all-btn" onClick={toggleSelectAll}>
            {allFilteredSelected ? 'Deselect all' : `Select all (${filtered.length})`}
          </button>
          {selected.size > 0 && <span className="select-hint">{selected.size} photo{selected.size !== 1 ? 's' : ''} ready to download</span>}
        </div>
      )}

      {loading ? <p>Loading…</p> : filtered.length === 0 ? <p>No uploads yet.</p> : (
        <div className="grid">
          {filtered.map((s) => (
            <div className={`card ${selected.has(s.id) ? 'card-selected' : ''}`} key={s.id} onClick={() => toggleSelect(s.id)}>
              {s.url && <img src={s.url} alt={s.full_name} />}
              <div className="card-check">{selected.has(s.id) ? '✓' : ''}</div>
              <div className={`public-badge ${s.allow_public_feature ? 'badge-public' : 'badge-private'}`}>
                {s.allow_public_feature ? 'PUBLIC ✓' : 'PRIVATE'}
              </div>
              <div className="card-body">
                <div className="card-name">{s.full_name}</div>
                {s.nickname && <div className="card-nick">{s.nickname}</div>}
                {s.level && <div className="card-meta">{s.level}{s.category ? ` · ${s.category}` : ''}</div>}
                {s.caption && <div className="card-caption">&ldquo;{s.caption}&rdquo;</div>}
                <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
