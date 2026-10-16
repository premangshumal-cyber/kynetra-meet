import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, Mail, Video } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import './Workspace.css';

export default function Auth({ Brand }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) navigate('/app', { replace: true });
    });
  }, [navigate]);

  async function submit(event) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'signup') {
        if (password.length < 8) throw new Error('Use a password of at least 8 characters.');
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(), password,
          options: { data: { display_name: name.trim().slice(0, 60) } }
        });
        if (authError) throw authError;
        if (data.session) navigate('/app', { replace: true });
        else setMessage('Please check your email and confirm your address, then sign in.');
      } else if (mode === 'reset') {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + '/auth' });
        if (authError) throw authError;
        setMessage('If the account exists, a password reset email has been sent.');
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (authError) throw authError;
        navigate('/app', { replace: true });
      }
    } catch (err) { setError(err.message || 'Authentication failed.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="kyn-workspace-page">
      <header className="kyn-workspace-header"><Brand/><Link className="kyn-back" to="/"><ArrowLeft size={17}/> Home</Link></header>
      <main className="kyn-auth-layout">
        <div className="kyn-auth-info"><div className="kyn-auth-icon"><Video size={29}/></div><span className="section-kicker">WELCOME TO KYNETRA</span><h1>Your workspace.<br/><span>All your conversations.</span></h1><p>Plan your next meeting, organize your schedule, and bring everyone together in one beautiful place.</p></div>
        <section className="kyn-auth-card">
          {!supabase ? (
            <><LockKeyhole size={27} color="#6d72ef"/><h2>Accounts are being set up</h2><p>This feature needs a connected Supabase project. Video meeting links still work from the homepage.</p><Link className="kyn-form-btn kyn-inline-link" to="/">Return to Kynetra <ArrowRight size={17}/></Link></>
          ) : <>
            <div className="kyn-auth-tabs"><button className={mode === 'signin' ? 'selected' : ''} onClick={() => { setMode('signin'); setError(''); }} type="button">Sign in</button><button className={mode === 'signup' ? 'selected' : ''} onClick={() => { setMode('signup'); setError(''); }} type="button">Create account</button></div>
            <h2>{mode === 'signup' ? 'Join Kynetra' : mode === 'reset' ? 'Reset password' : 'Welcome back'}</h2>
            <p>{mode === 'signup' ? 'Create an account to manage your meetings.' : mode === 'reset' ? 'Enter your email to reset your password.' : 'Sign in to keep your meetings organized.'}</p>
            <form onSubmit={submit}>
              {mode === 'signup' && <label>Display name<input required maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoComplete="name"/></label>}
              <label>Email address<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></label>
              {mode !== 'reset' && <label>Password<input minLength={mode === 'signup' ? 8 : undefined} type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}/></label>}
              {error && <p className="kyn-form-error" role="alert">{error}</p>}
              {message && <p className="kyn-form-success" role="status"><CheckCircle2 size={16}/>{message}</p>}
              <button className="kyn-form-btn" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'} <ArrowRight size={17}/></button>
            </form>
            {mode !== 'reset' ? <button className="kyn-small-link" onClick={() => { setMode('reset'); setError(''); setMessage(''); }} type="button">Forgot your password?</button> : <button className="kyn-small-link" onClick={() => { setMode('signin'); setError(''); setMessage(''); }} type="button">Back to sign in</button>}
            <div className="kyn-auth-footer"><LockKeyhole size={14}/> Account authentication is provided by Supabase.</div>
          </>}
        </section>
      </main>
    </div>
  );
}
