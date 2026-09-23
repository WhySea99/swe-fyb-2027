'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) {
      setError('Wrong password.');
      return;
    }
    router.push('/admin');
  }

  return (
    <main className="login-wrap">
      <h1 className="admin-title">Admin</h1>
      <form className="panel" onSubmit={handleSubmit} style={{ marginTop: 20 }}>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Checking…' : 'Log in'}
        </button>
        {error && <p className="status error">{error}</p>}
      </form>
    </main>
  );
}
