import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, Clock3, Copy, LogOut, Plus, Search, Video, X } from 'lucide-react';
import { createMeetingRoom, meetingRequest, supabase } from '../lib/supabase.js';
import './Workspace.css';

function niceDate(iso) { return new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
function nowLocal() {
  const date = new Date(Date.now() + 3600000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function MeetingCard({ item, onCancel, open }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const url = window.location.origin + '/meet/' + item.room_code;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2100); }
    catch { window.prompt('Copy meeting link', url); }
  }
  return <article className="kyn-meeting-card">
    <div className="kyn-meeting-card-title"><span className="kyn-meeting-icon"><Video size={20}/></span><div><h3>{item.title}</h3><span>{item.status === 'cancelled' ? 'Cancelled' : item.status === 'completed' ? 'Completed' : item.scheduled_at ? niceDate(item.scheduled_at) : 'Start any time'}</span></div></div>
    {item.description && <p>{item.description}</p>}
    <div className="kyn-meeting-actions">
      <button onClick={copy} type="button" title="Copy invite link">{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? 'Copied' : 'Invite'}</button>
      {item.status !== 'cancelled' && <button onClick={() => open(item.room_code)} type="button" className="kyn-go">Join <ArrowRight size={16}/></button>}
      {item.status !== 'cancelled' && <button onClick={() => onCancel(item)} type="button" className="kyn-cancel">Cancel</button>}
    </div>
  </article>;
}

export default function Dashboard({ Brand }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [start, setStart] = useState(nowLocal);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let alive = true;
    async function init() {
      const { data, error: authError } = await supabase.auth.getUser();
      if (!alive) return;
      if (authError || !data?.user) { navigate('/auth', { replace: true }); return; }
      setUser(data.user);
      const { data: rows, error: loadError } = await supabase.from('meetings').select('id,title,description,room_code,scheduled_at,status,created_at').eq('owner_id', data.user.id).order('created_at', { ascending: false }).limit(100);
      if (!alive) return;
      if (loadError) setError('Could not load meetings: ' + loadError.message);
      else setMeetings(rows || []);
      setLoading(false);
    }
    init();
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') navigate('/auth', { replace: true });
    });
    return () => { alive = false; subscription.subscription.unsubscribe(); };
  }, [navigate]);

  const filtered = useMemo(() => meetings.filter(m => (m.title + ' ' + m.room_code).toLowerCase().includes(search.toLowerCase())), [meetings, search]);
  async function newMeeting(event, instant = false) {
    if (event?.preventDefault) event.preventDefault();
    if (!supabase || !user) return;
    const cleanTitle = title.trim() || 'Untitled meeting';
    setBusy(true); setError('');
    try {
      const result = await createMeetingRoom({
        title: instant ? 'Instant meeting' : cleanTitle.slice(0, 120),
        description: instant ? '' : desc.trim().slice(0, 500),
        scheduledAt: instant ? null : new Date(start).toISOString()
      });
      setMeetings(old => [result.meeting, ...old]);
      setShowCreate(false); setTitle(''); setDesc('');
      if (instant) navigate('/meet/' + result.room);
    } catch (err) { setError(err.message || 'Meeting could not be created.'); }
    finally { setBusy(false); }
  }
  async function cancel(item) {
    if (!window.confirm('Cancel this meeting? The room will stop accepting new participants.')) return;
    if (!supabase) return;
    try {
      await meetingRequest('PATCH', { id: item.id, action: 'cancel' });
      setMeetings(old => old.map(m => m.id === item.id ? { ...m, status: 'cancelled' } : m));
    } catch (err) { setError(err.message || 'Unable to cancel meeting.'); }
  }
  async function signOut() { if (supabase) await supabase.auth.signOut(); navigate('/'); }
  return <div className="kyn-workspace-page">
    <header className="kyn-workspace-header"><Brand/><div className="kyn-workspace-actions"><Link to="/">Home</Link>{user && <span>{user.user_metadata?.display_name || user.email}</span>}<button type="button" onClick={signOut}><LogOut size={16}/> Sign out</button></div></header>
    <main className="kyn-dashboard">
      <div className="kyn-dashboard-top">
        <div><span className="section-kicker">YOUR MEETINGS, YOUR WAY</span><h1>Make space for<br/><span>great conversations.</span></h1><p>Plan, share, and keep every meeting in one place.</p></div>
        <div className="kyn-dashboard-actions"><button className="kyn-primary-action" onClick={() => newMeeting(null, true)} disabled={!user || busy}><Video size={19}/> Start now</button><button className="kyn-outline-action" onClick={() => setShowCreate(true)} disabled={!user}><Plus size={18}/> Schedule meeting</button></div>
      </div>
      {!supabase && <div className="kyn-workspace-alert">Your workspace requires Supabase configuration. <Link to="/">Return to the meeting homepage</Link>.</div>}
      {error && <div role="alert" className="kyn-workspace-alert">{error}<button aria-label="Dismiss error" onClick={() => setError('')}><X size={17}/></button></div>}
      <div className="kyn-dashboard-list-head"><div><h2>Your meetings</h2><span>{filtered.length} meeting{filtered.length === 1 ? '' : 's'}</span></div><label className="kyn-search"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a meeting"/></label></div>
      {loading ? <p className="kyn-loading">Loading your workspace…</p> : filtered.length === 0 ? <div className="kyn-empty"><CalendarDays size={39}/><h3>Nothing on the calendar yet</h3><p>Plan your first meeting or start a conversation right now.</p><button className="kyn-outline-action" onClick={() => setShowCreate(true)} disabled={!user}>Schedule your first meeting <Plus size={17}/></button></div> : <div className="kyn-meetings-grid">{filtered.map(m => <MeetingCard key={m.id} item={m} open={id => navigate('/meet/' + id)} onCancel={cancel}/>)}</div>}
    </main>
    {showCreate && <div className="kyn-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowCreate(false); }}><section className="kyn-modal" role="dialog" aria-modal="true" aria-labelledby="kyn-schedule-title"><div className="kyn-modal-head"><h2 id="kyn-schedule-title">Schedule a meeting</h2><button type="button" aria-label="Close" onClick={() => setShowCreate(false)}><X size={19}/></button></div><form onSubmit={e => newMeeting(e, false)}><label>Meeting title<input required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} placeholder="Team sync-up"/></label><label>Description (optional)<textarea value={desc} onChange={e => setDesc(e.target.value)} maxLength={500} rows={3} placeholder="What will you discuss?"/></label><label>Start date and time<input required type="datetime-local" value={start} min={nowLocal()} onChange={e => setStart(e.target.value)}/></label><div className="kyn-modal-foot"><button type="button" className="kyn-outline-action" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="kyn-primary-action" disabled={busy}>{busy ? 'Creating…' : 'Schedule'} <ArrowRight size={16}/></button></div></form></section></div>}
  </div>;
}
