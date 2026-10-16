import LiveKitCall from './components/LiveKitCall.jsx';
import { supabase } from './lib/supabase.js';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, Check, ChevronRight, CircleHelp, Clock3, Copy,
  ExternalLink, Headphones, Keyboard, Link2, LockKeyhole, Menu, MessageCircle,
  Mic, MicOff, MonitorUp, Plus, Settings2, ShieldCheck, Sparkles, Users, Video,
  VideoOff, Wifi, X, Zap
} from 'lucide-react';

const IS_LIVEKIT = import.meta.env.VITE_MEETING_ENGINE === 'livekit';
async function startNewMeeting(navigate) {
  if (!IS_LIVEKIT) return navigate('/meet/' + makeRoom());
  try {
    if (!supabase) {
      navigate('/auth');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      navigate('/auth');
      return;
    }
    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
      body: '{}'
    });
    const data = await response.json();
    if (!response.ok || !data.room || !data.hostKey) throw new Error(data.error || 'Meeting creation failed.');
    try { localStorage.setItem('kynetra-host:' + data.room, data.hostKey); } catch {}
    navigate('/meet/' + data.room);
  } catch (error) { window.alert(error.message || 'Unable to create a meeting.'); }
}

const DEFAULT_DOMAIN = 'meet.jit.si';
const RAW_DOMAIN = import.meta.env.VITE_JITSI_DOMAIN || DEFAULT_DOMAIN;
const JITSI_DOMAIN = /^[a-z0-9.-]+(?::[0-9]+)?$/i.test(RAW_DOMAIN) ? RAW_DOMAIN : DEFAULT_DOMAIN;
const isDemo = JITSI_DOMAIN === DEFAULT_DOMAIN;
const RECENT_KEY = 'kynetra-recent-v1';
const NAME_KEY = 'kynetra-display-name';

function makeRoom() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return 'kyn-' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function parseRoom(value) {
  let raw = (value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      raw = url.pathname.replace(/^\/meet\//, '').replace(/^\/+/, '').split('/')[0];
    } catch { return ''; }
  }
  raw = raw.replace(/^\/meet\//, '').replace(/\s+/g, '');
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,63}$/.test(raw) ? raw.toLowerCase() : '';
}

function roomLink(room) {
  return window.location.origin + '/meet/' + encodeURIComponent(room);
}

function getRecent() {
  try {
    const data = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(data) ? data.filter((x) => x && parseRoom(x.id)).slice(0, 4) : [];
  } catch { return []; }
}

function saveRecent(room) {
  const list = getRecent().filter((x) => x.id !== room);
  list.unshift({ id: room, date: new Date().toISOString() });
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 4))); } catch { /* optional storage */ }
}

async function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const el = document.createElement('textarea');
  el.value = value;
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  const success = document.execCommand('copy');
  el.remove();
  if (!success) throw new Error('Copy was blocked by your browser');
}

function Brand({ light = false }) {
  return (
    <Link to="/" className={'brand' + (light ? ' brand-light' : '')} aria-label="Kynetra home">
      <span className="brand-mark"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M12 8v24M14 20 29 8M14 20l16 13" fill="none" stroke="currentColor" strokeWidth="5.3" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
      <span>Kynetra<span className="brand-dot">.</span></span>
    </Link>
  );
}

function CopyLinkButton({ room, className = '', children, icon = true }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  async function onCopy() {
    try {
      await copyText(roomLink(room));
      setCopied(true);
      setFailed(false);
    } catch {
      setFailed(true);
      setCopied(false);
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setCopied(false); setFailed(false); }, 2600);
  }
  return (
    <button type="button" className={className} onClick={onCopy} title={failed ? 'Copy unavailable; use the browser address bar' : 'Copy invitation link'}>
      {icon && (copied ? <Check size={17} /> : <Copy size={17} />)}
      {failed ? 'Copy unavailable' : copied ? 'Copied!' : children || 'Copy link'}
    </button>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <header className="site-header">
      <div className="page-container nav-inner">
        <Brand />
        <nav className={'main-nav' + (open ? ' nav-open' : '')} aria-label="Main navigation">
          <a href="/#features" onClick={() => setOpen(false)}>Features</a>
          <a href="/#how-it-works" onClick={() => setOpen(false)}>How it works</a>
          <a href="/#why-kynetra" onClick={() => setOpen(false)}>Why Kynetra</a><Link to="/app" onClick={() => setOpen(false)}>My meetings</Link>
        </nav>
        <button className="btn btn-small btn-outline nav-action" type="button" onClick={() => startNewMeeting(navigate)}>
          Launch meeting <ArrowUpRight size={17} />
        </button>
        <button className="mobile-menu-btn icon-btn" type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>
    </header>
  );
}

const people = [
  { initials: 'AM', name: 'Alex Morgan', tint: 'peach', muted: false, badge: 'Speaking' },
  { initials: 'SL', name: 'Sarah Lee', tint: 'lilac', muted: false },
  { initials: 'JR', name: 'Jordan Reed', tint: 'mint', muted: true },
  { initials: 'KW', name: 'Kim Wilson', tint: 'blue', muted: false }
];

function HeroMeeting() {
  return (
    <div className="hero-art" aria-label="Illustration of a video meeting with four people">
      <div className="art-orb orb-one" />
      <div className="art-orb orb-two" />
      <div className="art-float float-top"><span className="float-icon"><Wifi size={17}/></span><span>You're connected<span className="float-subtext">Crystal clear, wherever you are</span></span><Check size={18} className="green-icon"/></div>
      <div className="mock-window">
        <div className="mock-window-header">
          <div className="mock-meeting-title"><span className="mock-status-dot"/> Team catch-up <span className="mock-header-tag">Live meeting</span></div>
          <span className="mock-clock"><Clock3 size={12}/> 24:08</span>
        </div>
        <div className="mock-grid">
          {people.map((person) => (
            <div className={'mock-person mock-' + person.tint} key={person.initials}>
              <div className={'portrait portrait-' + person.tint}><span className="portrait-head" /><span className="portrait-hair" /><span className="portrait-body" /></div>
              {person.badge && <span className="talking-badge"><span/> {person.badge}</span>}
              <div className="mock-name"><span>{person.name}</span>{person.muted ? <MicOff size={12}/> : <Mic size={12}/>}</div>
            </div>
          ))}
        </div>
        <div className="mock-footer">
          <span className="mock-footer-note"><span className="mock-security-dot"/> Secure meeting</span>
          <div className="mock-controls"><span><Mic size={16}/></span><span><Video size={16}/></span><span><MonitorUp size={16}/></span><span className="mock-hangup"><span className="phone-shape">⌁</span></span></div>
          <span className="mock-footer-people"><Users size={15}/> 4</span>
        </div>
      </div>
      <div className="art-float float-bottom"><span className="purple-bubble"><Users size={18}/></span><span><strong>Made for together</strong><span className="float-subtext">Every voice, in one space</span></span><Sparkles size={17} className="sparkle-icon"/></div>
      <div className="art-sparkle star-one">✦</div>
      <div className="art-sparkle star-two">✳</div>
    </div>
  );
}

function Home() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [recent] = useState(getRecent);
  function join(event) {
    event.preventDefault();
    const room = parseRoom(code);
    if (!room) {
      setError('Enter a valid meeting code or invitation link.');
      return;
    }
    navigate('/meet/' + room);
  }
  return (
    <div className="home-page">
      <Header />
      <main>
        <section className="hero page-container">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-star">✦</span> THE SPACE TO CONNECT <span className="eyebrow-line"/></div>
            <h1>Better meetings.<br/><span>Brighter ideas.</span></h1>
            <p className="hero-description">Great things happen when we come together. Meet, share, and create with Kynetra — the beautifully simple way to stay connected.</p>
            <div className="hero-actions">
              <button type="button" className="btn btn-primary btn-main" onClick={() => startNewMeeting(navigate)}>
                <Video size={20} strokeWidth={2.1}/> New meeting <ArrowRight size={18} className="cta-arrow"/>
              </button>
              <span className="action-divider">or</span>
              <form className="join-form" onSubmit={join}>
                <label className="sr-only" htmlFor="meeting-code">Meeting code or link</label>
                <Keyboard size={19} aria-hidden="true" />
                <input id="meeting-code" value={code} onChange={(e) => { setCode(e.target.value); setError(''); }} placeholder="Enter a code or link" autoComplete="off"/>
                <button type="submit" aria-label="Join meeting" title="Join meeting"><ArrowRight size={19}/></button>
              </form>
            </div>
            {error ? <p role="alert" className="form-error">{error}</p> : <p className="hero-hint"><Check size={15}/> No downloads needed <span className="hint-dot"/> Jump in from your browser</p>}
            <div className="hero-social-proof">
              <div className="proof-icon"><ShieldCheck size={22}/></div>
              <div><strong>Made for effortless connection</strong><span>Simple to start. Easy to join. A joy to use.</span></div>
            </div>
          </div>
          <HeroMeeting/>
        </section>

        {recent.length > 0 && (
          <section className="recent-section page-container" aria-label="Your recent meetings">
            <div className="section-row"><div><span className="section-kicker">PICK UP WHERE YOU LEFT OFF</span><h2 className="small-section-heading">Recent spaces</h2></div><span className="local-label"><LockKeyhole size={13}/> Saved on this device</span></div>
            <div className="recent-list">{recent.map((item) => <div className="recent-item" key={item.id}><span className="recent-icon"><Video size={19}/></span><span className="recent-detail"><strong>{item.id}</strong><small>{new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></span><CopyLinkButton room={item.id} className="recent-copy" icon={true}>Copy</CopyLinkButton><button className="recent-rejoin" onClick={() => navigate('/meet/' + item.id)} type="button">Rejoin <ArrowUpRight size={15}/></button></div>)}</div>
          </section>
        )}

        <section className="features-section page-container" id="features">
          <div className="section-heading"><span className="section-kicker">EVERYTHING YOU NEED, NOTHING YOU DON'T</span><h2>More than a meeting.<br/><span>A better way to connect.</span></h2><p>Thoughtfully designed tools that let you focus on what matters — the conversation.</p></div>
          <div className="feature-grid">
            <article className="feature-card"><span className="feature-icon icon-indigo"><Video size={24}/></span><h3>Face-to-face, from anywhere</h3><p>Natural video and audio conversations that make distance feel smaller.</p><span className="feature-arrow"><ArrowUpRight size={18}/></span></article>
            <article className="feature-card"><span className="feature-icon icon-violet"><MonitorUp size={24}/></span><h3>Bring ideas to life</h3><p>Present your screen, walk through your work, and keep everyone in sync.</p><span className="feature-arrow"><ArrowUpRight size={18}/></span></article>
            <article className="feature-card"><span className="feature-icon icon-mint"><MessageCircle size={24}/></span><h3>Stay in the conversation</h3><p>Chat, collaborate, and share a thought without interrupting the flow.</p><span className="feature-arrow"><ArrowUpRight size={18}/></span></article>
            <article className="feature-card"><span className="feature-icon icon-peach"><Link2 size={24}/></span><h3>One link. Everyone together.</h3><p>Invite others in seconds. There's no complicated setup to get started.</p><span className="feature-arrow"><ArrowUpRight size={18}/></span></article>
          </div>
        </section>

        <section className="steps-wrap" id="how-it-works"><div className="page-container steps-layout"><div className="steps-intro"><span className="section-kicker">SO SIMPLE IT JUST WORKS</span><h2>Three steps.<br/><span>Infinite possibilities.</span></h2><p>No learning curve, no fuss. Just people coming together.</p><button type="button" className="text-action" onClick={() => startNewMeeting(navigate)}>Start your first meeting <ArrowRight size={19}/></button></div><div className="steps-stack"><div className="step"><span className="step-number">01</span><span className="step-line"/><div><h3>Create your space</h3><p>Tap “New meeting” to create a unique meeting room, instantly.</p></div><span className="step-mini-icon"><Plus size={19}/></span></div><div className="step"><span className="step-number">02</span><span className="step-line"/><div><h3>Share the invite</h3><p>Copy your meeting link and send it to the people you want there.</p></div><span className="step-mini-icon"><Link2 size={19}/></span></div><div className="step"><span className="step-number">03</span><div><h3>Let ideas flow</h3><p>Join the call and get talking, presenting, and collaborating.</p></div><span className="step-mini-icon"><Sparkles size={19}/></span></div></div></div></section>

        <section className="cta-section page-container" id="why-kynetra"><div className="cta-panel"><div className="cta-dots"/><div className="cta-copy"><span className="cta-kicker"><Sparkles size={15}/> CONNECT WITH PURPOSE</span><h2>Every great idea<br/>starts with a conversation.</h2><p>Make room for yours. Bring your people together on Kynetra.</p><button type="button" onClick={() => startNewMeeting(navigate)} className="btn btn-white">Create a meeting <ArrowUpRight size={18}/></button></div><div className="cta-art" aria-hidden="true"><span className="cta-orbit orbit-a"/><span className="cta-orbit orbit-b"/><span className="cta-orbit orbit-c"/><span className="cta-bubble b1"><Video size={31}/></span><span className="cta-bubble b2"><MessageCircle size={22}/></span><span className="cta-bubble b3"><Sparkles size={22}/></span></div></div></section>
      </main>
      <footer className="site-footer"><div className="page-container footer-inner"><Brand/><p>Where connections become possibilities.</p><span>© {new Date().getFullYear()} Kynetra. Built for better conversations.</span></div></footer>
    </div>
  );
}

function Preview({ videoRef, cameraOn, micOn, initials, hasError }) {
  return (
    <div className="preview-video">
      <video ref={videoRef} autoPlay muted playsInline className={cameraOn && !hasError ? 'preview-media' : 'preview-media media-hidden'}/>
      {(!cameraOn || hasError) && <div className="preview-placeholder"><div className="preview-avatar">{initials}</div><span>Your camera is off</span></div>}
      <div className="preview-corner"><span className="preview-dot"/> Camera preview</div>
      <div className="preview-name-tag">{micOn ? <Mic size={13}/> : <MicOff size={13}/>} You</div>
    </div>
  );
}

function usePreview(cameraOn, micOn, active, videoRef) {
  const [error, setError] = useState('');
  const [devices, setDevices] = useState({ video: [], audio: [] });
  const [videoDevice, setVideoDevice] = useState('');
  const [audioDevice, setAudioDevice] = useState('');
  const streamRef = useRef(null);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [videoRef]);

  useEffect(() => {
    let disposed = false;
    if (!active || (!cameraOn && !micOn)) {
      stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Your browser does not support camera and microphone access.');
      return;
    }
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: cameraOn ? (videoDevice ? { deviceId: { ideal: videoDevice } } : true) : false,
          audio: micOn ? (audioDevice ? { deviceId: { ideal: audioDevice } } : true) : false
        });
        if (disposed) { stream.getTracks().forEach((track) => track.stop()); return; }
        stop();
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setError('');
        const list = await navigator.mediaDevices.enumerateDevices();
        if (!disposed) setDevices({
          video: list.filter((d) => d.kind === 'videoinput'),
          audio: list.filter((d) => d.kind === 'audioinput')
        });
      } catch (err) {
        if (!disposed) setError(err?.name === 'NotAllowedError' ? 'Access was blocked. Allow camera and microphone in your browser settings.' : 'Your camera or microphone could not be started. Check if another app is using it.');
      }
    }
    start();
    return () => { disposed = true; stop(); };
  }, [active, cameraOn, micOn, videoDevice, audioDevice, videoRef, stop]);
  return { error, devices, videoDevice, audioDevice, setVideoDevice, setAudioDevice, stop };
}

function JitsiCall({ room, displayName, cameraOn, micOn, onLeave }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    let disposed = false;
    let api = null;
    const scriptSrc = 'https://' + JITSI_DOMAIN + '/external_api.js';

    function initialize() {
      if (disposed || !containerRef.current || !window.JitsiMeetExternalAPI) return;
      try {
        api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName: room,
          width: '100%',
          height: '100%',
          parentNode: containerRef.current,
          userInfo: { displayName },
          configOverwrite: {
            prejoinConfig: { enabled: false },
            startWithAudioMuted: !micOn,
            startWithVideoMuted: !cameraOn,
            disableDeepLinking: true
          },
          interfaceConfigOverwrite: { MOBILE_APP_PROMO: false, TOOLBAR_ALWAYS_VISIBLE: false }
        });
        api.addEventListener('videoConferenceJoined', () => { if (!disposed) setStatus('ready'); });
        api.addEventListener('videoConferenceLeft', () => { if (!disposed) onLeave(); });
        api.addEventListener('readyToClose', () => { if (!disposed) onLeave(); });
        setStatus('ready');
      } catch { setStatus('error'); }
    }

    if (window.JitsiMeetExternalAPI) {
      initialize();
    } else {
      let script = document.querySelector('script[data-kynetra-jitsi]');
      if (!script) {
        script = document.createElement('script');
        script.src = scriptSrc;
        script.async = true;
        script.dataset.kynetraJitsi = 'true';
        document.head.appendChild(script);
      }
      script.addEventListener('load', initialize);
      const failed = () => { if (!disposed) setStatus('error'); };
      script.addEventListener('error', failed);
      return () => {
        disposed = true;
        script.removeEventListener('load', initialize);
        script.removeEventListener('error', failed);
        if (api) api.dispose();
      };
    }
    return () => { disposed = true; if (api) api.dispose(); };
  }, [room, displayName, cameraOn, micOn, onLeave]);
  return (
    <div className="jitsi-frame-wrap">
      {status === 'loading' && <div className="call-loading"><span className="loader"/><strong>Connecting your meeting…</strong><small>This may take a moment on slower connections.</small></div>}
      {status === 'error' && <div className="call-failure"><CircleHelp size={42}/><h2>Could not load the meeting</h2><p>The video provider may be unavailable, or a browser extension may be blocking it.</p><a href={'https://' + JITSI_DOMAIN + '/' + encodeURIComponent(room)} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Try opening directly <ExternalLink size={17}/></a></div>}
      <div className="jitsi-mount" ref={containerRef}/>
    </div>
  );
}

function MeetingPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const room = parseRoom(roomId || '');
  const [name, setName] = useState(() => { try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; } });
  const [nameError, setNameError] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [stage, setStage] = useState('preview');
  const [showSettings, setShowSettings] = useState(false);
  const videoRef = useRef(null);
  const preview = usePreview(cameraOn, micOn, stage === 'preview', videoRef);
  const leave = useCallback(() => navigate('/'), [navigate]);

  if (!room) return <Navigate to="/" replace />;

  function startCall(event) {
    event.preventDefault();
    if (!name.trim()) { setNameError('Please enter your name before joining.'); return; }
    try { localStorage.setItem(NAME_KEY, name.trim()); } catch { /* optional storage */ }
    saveRecent(room);
    preview.stop();
    setStage('call');
  }
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'YOU';

  if (stage === 'call') {
    return (
      <div className="call-page">
        <div className="call-topbar"><Brand light/><div className="call-room-meta"><span className="call-live-dot"/> <span className="call-room-label">Meeting in progress</span><span className="call-separator"/> <span className="call-room-id">{room}</span></div><div className="call-actions"><CopyLinkButton room={room} className="call-copy-btn"/><button type="button" onClick={leave} className="call-exit-btn">Exit room <X size={16}/></button></div></div>
        {IS_LIVEKIT ? <LiveKitCall room={room} displayName={name.trim()} cameraOn={cameraOn} micOn={micOn} onLeave={leave}/> : <JitsiCall room={room} displayName={name.trim()} cameraOn={cameraOn} micOn={micOn} onLeave={leave}/>}
        {!IS_LIVEKIT && isDemo && <p className="call-demo-note">Demo conferencing provided by Jitsi Meet. Public meet.jit.si may require host sign-in; use a dedicated Jitsi deployment for production.</p>}
      </div>
    );
  }

  return (
    <div className="prejoin-page">
      <header className="prejoin-header page-container"><Brand/><div className="prejoin-header-right"><span className="prejoin-secure"><ShieldCheck size={16}/> Encrypted connection</span><Link to="/" className="leave-preview">Back to home <X size={16}/></Link></div></header>
      <main className="prejoin-main page-container">
        <div className="prejoin-copy"><span className="section-kicker">YOUR MEETING SPACE IS READY</span><h1>Look good.<br/><span>Sound great.</span></h1><p>Get comfortable, check your setup, and join when you're ready.</p></div>
        <div className="prejoin-layout">
          <section className="preview-section" aria-label="Camera and microphone preview">
            <Preview videoRef={videoRef} cameraOn={cameraOn} micOn={micOn} initials={initials} hasError={!!preview.error}/>
            <div className="preview-toolbar">
              <button type="button" aria-pressed={micOn} onClick={() => setMicOn(!micOn)} className={'device-toggle' + (micOn ? ' device-on' : '')}>{micOn ? <Mic size={21}/> : <MicOff size={21}/>} <span>Mic {micOn ? 'on' : 'off'}</span></button>
              <button type="button" aria-pressed={cameraOn} onClick={() => setCameraOn(!cameraOn)} className={'device-toggle' + (cameraOn ? ' device-on' : '')}>{cameraOn ? <Video size={21}/> : <VideoOff size={21}/>} <span>Camera {cameraOn ? 'on' : 'off'}</span></button>
              <div className="preview-toolbar-spacer"/>
              <button type="button" onClick={() => setShowSettings(!showSettings)} aria-expanded={showSettings} className={'settings-toggle' + (showSettings ? ' settings-active' : '')}><Settings2 size={20}/> <span>Devices</span></button>
            </div>
            {preview.error && <p role="alert" className="media-error"><CircleHelp size={16}/>{preview.error}</p>}
            {showSettings && <div className="device-settings"><div><label htmlFor="video-device">Camera</label><select id="video-device" value={preview.videoDevice} onChange={(event) => preview.setVideoDevice(event.target.value)}><option value="">System default</option>{preview.devices.video.map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || 'Camera ' + (i + 1)}</option>)}</select></div><div><label htmlFor="audio-device">Microphone</label><select id="audio-device" value={preview.audioDevice} onChange={(event) => preview.setAudioDevice(event.target.value)}><option value="">System default</option>{preview.devices.audio.map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || 'Microphone ' + (i + 1)}</option>)}</select></div><p>Enable camera or mic to discover available devices.</p></div>}
            <div className="preview-tip"><Headphones size={17}/><span>For the best experience, use headphones and a stable connection.</span></div>
          </section>
          <section className="ready-card" aria-label="Join this meeting">
            <span className="ready-icon"><Sparkles size={22}/></span>
            <h2>Ready to join?</h2><p>You're just one click away from being together.</p>
            <form onSubmit={startCall}>
              <label htmlFor="display-name">Your name</label>
              <input id="display-name" maxLength={60} autoComplete="name" placeholder="How should we call you?" value={name} onChange={(e) => { setName(e.target.value); setNameError(''); }}/>
              {nameError && <span role="alert" className="form-error">{nameError}</span>}
              <button type="submit" className="btn btn-primary ready-join">Join meeting <ArrowRight size={18}/></button>
            </form>
            <div className="ready-divider"><span>MEETING DETAILS</span></div>
            <div className="meeting-info"><span className="meeting-info-icon"><Link2 size={18}/></span><div><small>Meeting code</small><strong>{room}</strong></div></div>
            <CopyLinkButton room={room} className="ready-copy" icon={false}><Copy size={18}/> Copy invitation link</CopyLinkButton>
            <p className="ready-privacy"><LockKeyhole size={14}/> Anyone with this link may be able to join. Room access and moderation are handled by the video provider.</p>
          </section>
        </div>
        {!IS_LIVEKIT && isDemo && <div className="demo-banner"><CircleHelp size={17}/><span>Testing mode: Meetings use the public Jitsi Meet service. Hosts may be asked to sign in. Set <code>VITE_JITSI_DOMAIN</code> to your own Jitsi deployment for production.</span></div>}
      </main>
      <footer className="prejoin-footer page-container"><span>© {new Date().getFullYear()} Kynetra</span><span>Better together, wherever.</span></footer>
    </div>
  );
}

export default function App() {
  return <Routes><Route path="/" element={<Home/>}/><Route path="/meet/:roomId" element={<MeetingPage/>}/><Route path="/auth" element={<Auth Brand={Brand}/>}/><Route path="/app" element={<Dashboard Brand={Brand}/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes>;
}
