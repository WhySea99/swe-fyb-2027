'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
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
    await fetch('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((s) => s.id)));
    }
  }

  function downloadUrl() {
    if (selected.size === 0) return '/api/export';
    return `/api/export?ids=${[...selected].join(',')}`;
  }

  const names = useMemo(() => {
    return [...new Set(submissions.map((s) => s.full_name))].sort();
  }, [submissions]);

  const filtered = useMemo(() => {
    if (!search) return submissions;
    return submissions.filter((s) =>
      s.full_name.toLowerCase().includes(search.toLowerCase())
    );
  }, [submissions, search]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id));

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
          <button className="btn-ghost" onClick={handleLogout}>Log out</button>
        </div>
      </div>

      <div className="filter-bar">
        <button
          className={`filter-chip ${!search ? 'active' : ''}`}
          onClick={() => setSearch('')}
        >
          All ({submissions.length})
        </button>
        {names.map((name) => (
          <button
            key={name}
            className={`filter-chip ${search === name ? 'active' : ''}`}
            onClick={() => setSearch(search === name ? '' : name)}
          >
            {name} ({submissions.filter((s) => s.full_name === name).length})
          </button>
        ))}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="select-bar">
          <button className="select-all-btn" onClick={toggleSelectAll}>
            {allFilteredSelected ? 'Deselect all' : `Select all (${filtered.length})`}
          </button>
          {selected.size > 0 && (
            <span className="select-hint">
              {selected.size} photo{selected.size !== 1 ? 's' : ''} ready to download
            </span>
          )}
        </div>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : filtered.length === 0 ? (
        <p>No uploads yet.</p>
      ) : (
        <div className="grid">
          {filtered.map((s) => (
            <div
              className={`card ${selected.has(s.id) ? 'card-selected' : ''}`}
              key={s.id}
              onClick={() => toggleSelect(s.id)}
            >
              {s.url && <img src={s.url} alt={s.full_name} />}
              <div className="card-check">{selected.has(s.id) ? '✓' : ''}</div>
              <div className="card-body">
                <div className="card-name">{s.full_name}</div>
                {s.nickname && <div className="card-nick">{s.nickname}</div>}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
