import React, { useEffect, useState } from 'react';
import {
  LiveKitRoom, RoomAudioRenderer, VideoConference,
  useParticipants, useRoomContext
} from '@livekit/components-react';
import '@livekit/components-styles';
import { AlertCircle, Crown, LoaderCircle, ShieldCheck, UserMinus, X } from 'lucide-react';
import './LiveKitCall.css';

async function callApi(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The server could not process your request.');
  return data;
}

function HostPanel({ room, hostKey }) {
  const participants = useParticipants();
  const liveRoom = useRoomContext();
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const others = participants.filter(person => person.identity !== liveRoom.localParticipant.identity);
  if (!hostKey) return null;

  async function remove(identity) {
    if (!window.confirm('Remove this participant from the meeting?')) return;
    setBusy(identity); setMessage('');
    try {
      await callApi('/api/moderate', { room, hostKey, action: 'remove', identity });
      setMessage('Participant removed.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(''); }
  }
  return (
    <div className="kyn-host-widget">
      <button type="button" className="kyn-host-toggle" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        <Crown size={16}/> Host controls <span>{expanded ? '−' : '+'}</span>
      </button>
      {expanded && <div className="kyn-host-popover" role="region" aria-label="Host controls">
        <div className="kyn-host-heading"><ShieldCheck size={17}/> Meeting host <button onClick={() => setExpanded(false)} type="button" aria-label="Close host controls"><X size={16}/></button></div>
        <p>Remove disruptive participants. Your host key stays on this device.</p>
        {others.length === 0 ? <p className="kyn-host-empty">No other participants have joined yet.</p> : others.map(p =>
          <div className="kyn-host-person" key={p.identity}>
            <span>{p.name || 'Guest'}</span>
            <button disabled={busy === p.identity} onClick={() => remove(p.identity)} type="button" title="Remove participant"><UserMinus size={15}/> Remove</button>
          </div>
        )}
        {message && <span className="kyn-host-feedback" role="status">{message}</span>}
      </div>}
    </div>
  );
}

export default function LiveKitCall({ room, displayName, cameraOn, micOn, onLeave }) {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [hostKey] = useState(() => { try { return localStorage.getItem('kynetra-host:' + room) || ''; } catch { return ''; } });

  useEffect(() => {
    let cancelled = false;
    setConfig(null); setError('');
    callApi('/api/token', { room, name: displayName }).then(data => {
      if (!cancelled) setConfig(data);
    }).catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [room, displayName, attempt]);

  if (error) return (
    <div className="kyn-state">
      <AlertCircle size={40}/>
      <h2>We couldn't connect this meeting</h2>
      <p>{error}</p>
      <button type="button" className="kyn-button" onClick={() => setAttempt(x => x + 1)}>Try again</button>
      <button type="button" className="kyn-secondary" onClick={onLeave}>Return home</button>
    </div>
  );
  if (!config) return <div className="kyn-state"><LoaderCircle size={42} className="kyn-spin"/><strong>Preparing your secure meeting…</strong><p>Connecting to Kynetra conferencing.</p></div>;
  return (
    <div className="kyn-livekit-shell" data-lk-theme="default">
      <LiveKitRoom
        token={config.token}
        serverUrl={config.serverUrl}
        video={cameraOn}
        audio={micOn}
        connect={true}
        onDisconnected={onLeave}
        onError={err => setError(err.message || 'Connection lost.')}
      >
        <VideoConference />
        <RoomAudioRenderer/>
        <HostPanel room={room} hostKey={hostKey}/>
      </LiveKitRoom>
    </div>
  );
}
