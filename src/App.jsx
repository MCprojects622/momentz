import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://apzwuiqyxnfzbuooerhb.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwend1aXF5eG5memJ1b29lcmhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNjIyNDAsImV4cCI6MjA5MzkzODI0MH0.RnMnfA3Mo70nuKCcqzZox-Mkul5y23jlBh1v8SrFn94";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
const OWNER_EMAIL = "yolibaby14@gmail.com";

const C = {
  bg: "#f7f5fb", bgCard: "#ffffff", bgInput: "#f4f1f9",
  border: "#e8e2f4", accent: "#9b8ab4", accentLight: "#d4c8e8",
  accentDark: "#6b5a8e", text: "#1e1428", textMid: "#7a6e8a",
  textLight: "#b8a8cc", danger: "#c4637a", dangerLight: "#f9eef1",
  rec: "#e05b73", line: "#ede8f5",
};

const DEFAULT_MOODS = ["✨ hopeful","💭 reflective","🌊 overwhelmed","🔥 energized","🌿 peaceful","🌧 heavy","🎉 joyful","😶 numb"];

function fmtDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmtDur(s) {
  if (!s && s !== 0) return "";
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
function timeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return fmtDate(ts);
}
function generateCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

const Spinner = ({ size = 22, color = C.accent }) => (
  <div style={{ width: size, height: size, border: `2px solid ${C.accentLight}`, borderTop: `2px solid ${color}`, borderRadius: "50%", animation: "spin 0.75s linear infinite", flexShrink: 0 }} />
);

function MoodPicker({ value = [], onChange, customMoods = [], onAddCustomMood }) {
  const [adding, setAdding] = useState(false);
  const [newMood, setNewMood] = useState("");
  const allMoods = [...DEFAULT_MOODS, ...customMoods];
  const toggle = (m) => onChange(value.includes(m) ? value.filter(x => x !== m) : [...value, m]);
  const handleAdd = () => {
    const t = newMood.trim();
    if (t) { onAddCustomMood(t); onChange([...value, t]); setNewMood(""); setAdding(false); }
  };
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: "0.2em", color: C.textLight, textTransform: "uppercase", marginBottom: 8 }}>
        mood {value.length > 0 && <span style={{ color: C.accent }}>· {value.length} selected</span>}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {allMoods.map(m => (
          <button key={m} onClick={() => toggle(m)} style={{ background: value.includes(m) ? C.accentDark : C.bgInput, border: `1px solid ${value.includes(m) ? C.accentDark : C.border}`, color: value.includes(m) ? "#fff" : C.textMid, borderRadius: 20, padding: "5px 11px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>{m}</button>
        ))}
        {adding ? (
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input autoFocus value={newMood} onChange={e => setNewMood(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }} placeholder="type a mood..." style={{ background: C.bgInput, border: `1px solid ${C.accent}`, borderRadius: 20, padding: "5px 11px", fontSize: 11, fontFamily: "inherit", color: C.text, outline: "none", width: 110 }} />
            <button onClick={handleAdd} style={{ background: C.accentDark, border: "none", color: "#fff", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            <button onClick={() => setAdding(false)} style={{ background: "none", border: "none", color: C.textLight, cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} style={{ background: "none", border: `1px dashed ${C.border}`, color: C.textLight, borderRadius: 20, padding: "5px 11px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>+ add</button>
        )}
      </div>
    </div>
  );
}

// ── Auth Screen ────────────────────────────────────────────────────────────
function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("invite");
    if (code) { setInviteCode(code.toUpperCase()); setMode("signup"); }
  }, []);

  const inputStyle = { width: "100%", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
  const btnPrimary = { width: "100%", padding: "13px", borderRadius: 12, background: C.accentDark, border: "none", color: "#fff", fontSize: 14, cursor: "pointer", fontFamily: "inherit", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 };

  const handleSignup = async () => {
    setError(""); setLoading(true);
    try {
      const { data: invite, error: inviteErr } = await sb.from("invites").select("*").eq("code", inviteCode).single();
      if (inviteErr || !invite) { setError("Invalid invite code."); setLoading(false); return; }
      if (invite.used) { setError("This invite code has already been used."); setLoading(false); return; }
      const { error: signupErr } = await sb.auth.signUp({ email, password });
      if (signupErr) { setError(signupErr.message); setLoading(false); return; }
      await sb.from("invites").update({ used: true, used_by: email, used_at: new Date().toISOString() }).eq("code", inviteCode);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handleLogin = async () => {
    setError(""); setLoading(true);
    const { error: err } = await sb.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
    setLoading(false);
  };

  const handleReset = async () => {
    setError(""); setLoading(true);
    const { error: err } = await sb.auth.resetPasswordForEmail(email, { redirectTo: "https://momentz.yolandamcleod.com" });
    if (err) setError(err.message); else setResetSent(true);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 360, animation: "slideUp 0.45s ease both" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.accentLight, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.accentDark }} />
          </div>
          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 400, fontFamily: "Georgia, serif", color: C.text, letterSpacing: "-0.02em" }}>momentz</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: C.textLight, fontStyle: "italic", fontFamily: "Georgia, serif" }}>your story, your way</p>
        </div>
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 20, padding: 24, boxShadow: "0 4px 24px rgba(155,138,180,0.08)" }}>
          {mode === "login" && (<>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: C.textMid, marginBottom: 6 }}>email</div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: C.textMid, marginBottom: 6 }}>password</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="••••••••" style={inputStyle} />
            </div>
            {error && <div style={{ fontSize: 12, color: C.danger, marginBottom: 12, textAlign: "center", background: C.dangerLight, padding: "8px 12px", borderRadius: 8 }}>{error}</div>}
            <button onClick={handleLogin} disabled={loading} style={btnPrimary}>{loading ? <Spinner size={16} color="#fff" /> : "sign in"}</button>
            <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 20 }}>
              <button onClick={() => { setMode("signup"); setError(""); }} style={{ background: "none", border: "none", color: C.accent, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>have an invite?</button>
              <button onClick={() => { setMode("reset"); setError(""); }} style={{ background: "none", border: "none", color: C.textLight, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>forgot password</button>
            </div>
          </>)}
          {mode === "signup" && (<>
            <div style={{ fontSize: 13, color: C.textMid, marginBottom: 16, textAlign: "center" }}>enter your invite code to create an account</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: C.textMid, marginBottom: 6 }}>invite code</div>
              <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} placeholder="XXXXXXXX" style={{ ...inputStyle, letterSpacing: "0.2em", fontWeight: 500 }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: C.textMid, marginBottom: 6 }}>email</div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: C.textMid, marginBottom: 6 }}>password</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSignup()} placeholder="••••••••" style={inputStyle} />
            </div>
            {error && <div style={{ fontSize: 12, color: C.danger, marginBottom: 12, textAlign: "center", background: C.dangerLight, padding: "8px 12px", borderRadius: 8 }}>{error}</div>}
            <button onClick={handleSignup} disabled={loading} style={btnPrimary}>{loading ? <Spinner size={16} color="#fff" /> : "create account"}</button>
            <div style={{ marginTop: 14, textAlign: "center" }}>
              <button onClick={() => { setMode("login"); setError(""); }} style={{ background: "none", border: "none", color: C.textLight, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>← back to sign in</button>
            </div>
          </>)}
          {mode === "reset" && (resetSent ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📬</div>
              <div style={{ fontSize: 13, color: C.textMid, marginBottom: 16 }}>reset link sent to {email}</div>
              <button onClick={() => { setMode("login"); setResetSent(false); }} style={{ background: "none", border: "none", color: C.accent, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>← back to sign in</button>
            </div>
          ) : (<>
            <div style={{ fontSize: 12, color: C.textMid, marginBottom: 14, textAlign: "center" }}>enter your email to receive a reset link</div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" style={{ ...inputStyle, marginBottom: 12 }} />
            {error && <div style={{ fontSize: 12, color: C.danger, marginBottom: 12, textAlign: "center" }}>{error}</div>}
            <button onClick={handleReset} disabled={loading} style={btnPrimary}>{loading ? <Spinner size={16} color="#fff" /> : "send reset link"}</button>
            <div style={{ marginTop: 14, textAlign: "center" }}>
              <button onClick={() => { setMode("login"); setError(""); }} style={{ background: "none", border: "none", color: C.textLight, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>← back to sign in</button>
            </div>
          </>))}
        </div>
        <div style={{ marginTop: 20, textAlign: "center", fontSize: 10, color: C.textLight, letterSpacing: "0.1em", textTransform: "uppercase" }}>private · invite only</div>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: ${C.textLight}; }
        @keyframes slideUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Writing Editor ─────────────────────────────────────────────────────────
function WritingEditor({ user, customMoods, onAddCustomMood, onSaved, onCancel }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [moods, setMoods] = useState([]);
  const [saving, setSaving] = useState(false);
  const lineHeight = 32;

  const save = async () => {
    if (!body.trim()) return;
    setSaving(true);
    try {
      const entry = { user_id: user.id, title: title.trim(), body: body.trim(), moods, word_count: body.trim().split(/\s+/).filter(Boolean).length };
      const { data, error } = await sb.from("writings").insert(entry).select().single();
      if (error) throw error;
      onSaved(data);
    } catch (e) { alert("Save failed: " + e.message); }
    setSaving(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: C.bgCard, display: "flex", flexDirection: "column", zIndex: 200 }}>
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: C.textLight, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>cancel</button>
        <div style={{ fontSize: 11, color: C.textLight }}>{fmtDate(new Date().toISOString())}</div>
        <button onClick={save} disabled={saving || !body.trim()} style={{ background: C.accentDark, border: "none", color: "#fff", borderRadius: 20, padding: "7px 16px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", opacity: body.trim() ? 1 : 0.4, display: "flex", alignItems: "center", gap: 6 }}>
          {saving ? <Spinner size={14} color="#fff" /> : "save"}
        </button>
      </div>
      <div style={{ padding: "12px 20px 10px", flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
        <MoodPicker value={moods} onChange={setMoods} customMoods={customMoods} onAddCustomMood={onAddCustomMood} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 40px", backgroundImage: `repeating-linear-gradient(transparent, transparent ${lineHeight - 1}px, ${C.line} ${lineHeight - 1}px, ${C.line} ${lineHeight}px)`, backgroundSize: `100% ${lineHeight}px`, backgroundPositionY: "56px" }}>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="title (optional)" style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: 22, fontWeight: 500, fontFamily: "Georgia, serif", color: C.text, padding: "20px 0 8px", lineHeight: "1.3", boxSizing: "border-box" }} />
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="write anything..." autoFocus style={{ width: "100%", background: "none", border: "none", outline: "none", resize: "none", fontSize: 16, fontFamily: "Georgia, serif", color: C.text, lineHeight: `${lineHeight}px`, minHeight: "60vh", boxSizing: "border-box", padding: "4px 0" }} />
      </div>
      <div style={{ padding: "10px 20px", borderTop: `1px solid ${C.border}`, flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>
        <div style={{ fontSize: 11, color: C.textLight }}>{body.trim() ? body.trim().split(/\s+/).filter(Boolean).length : 0} words</div>
      </div>
    </div>
  );
}

// ── Writing Viewer ─────────────────────────────────────────────────────────
function WritingViewer({ entry, onBack, onDelete }) {
  const lineHeight = 32;
  const moods = entry.moods || [];
  return (
    <div style={{ position: "fixed", inset: 0, background: C.bgCard, display: "flex", flexDirection: "column", zIndex: 200 }}>
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.textMid, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>← back</button>
        <div style={{ fontSize: 11, color: C.textLight }}>{fmtDate(entry.created_at)} · {fmtTime(entry.created_at)}</div>
        <button onClick={() => onDelete(entry)} style={{ background: "none", border: "none", color: C.danger, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>delete</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 40px", backgroundImage: `repeating-linear-gradient(transparent, transparent ${lineHeight - 1}px, ${C.line} ${lineHeight - 1}px, ${C.line} ${lineHeight}px)`, backgroundSize: `100% ${lineHeight}px`, backgroundPositionY: "80px" }}>
        {moods.length > 0 && (
          <div style={{ paddingTop: 16, marginBottom: 4, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {moods.map(m => <div key={m} style={{ display: "inline-block", background: C.accentLight, border: `1px solid ${C.border}`, color: C.accentDark, borderRadius: 20, padding: "4px 12px", fontSize: 11 }}>{m}</div>)}
          </div>
        )}
        {entry.title && <h2 style={{ margin: "16px 0 8px", fontSize: 22, fontWeight: 500, fontFamily: "Georgia, serif", color: C.text, lineHeight: 1.3 }}>{entry.title}</h2>}
        <div style={{ fontSize: 16, fontFamily: "Georgia, serif", color: C.text, lineHeight: `${lineHeight}px`, whiteSpace: "pre-wrap", paddingTop: 4 }}>{entry.body}</div>
      </div>
      <div style={{ padding: "10px 20px", borderTop: `1px solid ${C.border}`, flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>
        <div style={{ fontSize: 11, color: C.textLight }}>{entry.word_count || 0} words</div>
      </div>
    </div>
  );
}

// ── Thread Post ────────────────────────────────────────────────────────────
function ThreadPost({ thread, onDelete, user }) {
  const [replies, setReplies] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);

  const loadReplies = async () => {
    if (expanded) { setExpanded(false); return; }
    setLoadingReplies(true);
    const { data } = await sb.from("thread_replies").select("*").eq("thread_id", thread.id).order("created_at", { ascending: true });
    if (data) setReplies(data);
    setLoadingReplies(false);
    setExpanded(true);
  };

  const saveReply = async () => {
    if (!replyText.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await sb.from("thread_replies").insert({ thread_id: thread.id, user_id: user.id, body: replyText.trim() }).select().single();
      if (error) throw error;
      setReplies(prev => [...prev, data]);
      setReplyText(""); setReplying(false);
      if (!expanded) setExpanded(true);
    } catch (e) { alert("Failed: " + e.message); }
    setSaving(false);
  };

  const deleteReply = async (reply) => {
    await sb.from("thread_replies").delete().eq("id", reply.id);
    setReplies(prev => prev.filter(r => r.id !== reply.id));
  };

  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px", marginBottom: 10, animation: "fadeUp 0.3s ease both" }}>
      {/* Main post */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: C.textLight }}>{timeAgo(thread.created_at)}</div>
        <button onClick={() => onDelete(thread)} style={{ background: "none", border: "none", color: C.textLight, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>delete</button>
      </div>
      <div style={{ fontSize: 15, color: C.text, lineHeight: 1.65, whiteSpace: "pre-wrap", marginBottom: 14 }}>{thread.body}</div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
        <button onClick={() => setReplying(p => !p)} style={{ background: "none", border: "none", color: C.accent, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
          ↩ reply
        </button>
        {thread.reply_count > 0 && (
          <button onClick={loadReplies} style={{ background: "none", border: "none", color: C.textLight, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            {loadingReplies ? <Spinner size={12} /> : (expanded ? "hide replies" : `${thread.reply_count} ${thread.reply_count === 1 ? "reply" : "replies"}`)}
          </button>
        )}
      </div>

      {/* Reply input */}
      {replying && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="continue the thought..." autoFocus rows={3}
            style={{ background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 12px", color: C.text, fontSize: 13, fontFamily: "inherit", resize: "none", outline: "none", lineHeight: 1.6 }} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => { setReplying(false); setReplyText(""); }} style={{ background: "none", border: "none", color: C.textLight, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>cancel</button>
            <button onClick={saveReply} disabled={saving || !replyText.trim()} style={{ background: C.accentDark, border: "none", color: "#fff", borderRadius: 20, padding: "6px 16px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", opacity: replyText.trim() ? 1 : 0.4, display: "flex", alignItems: "center", gap: 6 }}>
              {saving ? <Spinner size={12} color="#fff" /> : "post"}
            </button>
          </div>
        </div>
      )}

      {/* Replies */}
      {expanded && replies.length > 0 && (
        <div style={{ marginTop: 12, borderLeft: `2px solid ${C.accentLight}`, paddingLeft: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {replies.map(reply => (
            <div key={reply.id}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 10, color: C.textLight }}>{timeAgo(reply.created_at)}</div>
                <button onClick={() => deleteReply(reply)} style={{ background: "none", border: "none", color: C.textLight, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>delete</button>
              </div>
              <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{reply.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Threads Tab ────────────────────────────────────────────────────────────
function ThreadsTab({ user }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [composing, setComposing] = useState(false);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [showDelete, setShowDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadThreads();
  }, []);

  const loadThreads = async () => {
    setLoading(true);
    const { data } = await sb.from("threads").select("*, thread_replies(count)").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setThreads(data.map(t => ({ ...t, reply_count: t.thread_replies?.[0]?.count || 0 })));
    setLoading(false);
  };

  const postThread = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      const { data, error } = await sb.from("threads").insert({ user_id: user.id, body: newPost.trim() }).select().single();
      if (error) throw error;
      setThreads(prev => [{ ...data, reply_count: 0 }, ...prev]);
      setNewPost(""); setComposing(false);
    } catch (e) { alert("Failed: " + e.message); }
    setPosting(false);
  };

  const deleteThread = async (thread) => {
    setDeleting(true);
    try {
      await sb.from("threads").delete().eq("id", thread.id);
      setThreads(prev => prev.filter(t => t.id !== thread.id));
      setShowDelete(null);
    } catch (e) { alert("Delete failed: " + e.message); }
    setDeleting(false);
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 90 }}>
      {/* Compose */}
      {composing ? (
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
          <textarea value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="what's on your mind?" autoFocus rows={4}
            style={{ width: "100%", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", color: C.text, fontSize: 15, fontFamily: "inherit", resize: "none", outline: "none", lineHeight: 1.65, boxSizing: "border-box" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <div style={{ fontSize: 11, color: C.textLight }}>{newPost.length} chars</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setComposing(false); setNewPost(""); }} style={{ background: "none", border: "none", color: C.textLight, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>cancel</button>
              <button onClick={postThread} disabled={posting || !newPost.trim()} style={{ background: C.accentDark, border: "none", color: "#fff", borderRadius: 20, padding: "7px 18px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", opacity: newPost.trim() ? 1 : 0.4, display: "flex", alignItems: "center", gap: 6 }}>
                {posting ? <Spinner size={14} color="#fff" /> : "post"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
          <button onClick={() => setComposing(true)} style={{ width: "100%", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", color: C.textLight, fontSize: 14, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
            what's on your mind?
          </button>
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div style={{ padding: 70, display: "flex", justifyContent: "center" }}><Spinner /></div>
      ) : threads.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>💭</div>
          <div style={{ fontSize: 16, color: C.textMid, fontFamily: "Georgia, serif", fontStyle: "italic" }}>your thoughts live here</div>
          <div style={{ fontSize: 11, color: C.textLight, marginTop: 8 }}>tap above to post your first thought</div>
        </div>
      ) : (
        <div style={{ padding: "10px 16px" }}>
          {threads.map(thread => (
            <ThreadPost key={thread.id} thread={thread} user={user} onDelete={(t) => setShowDelete(t)} />
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {showDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(30,20,40,0.6)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28, maxWidth: 300, width: "100%", textAlign: "center", animation: "popIn 0.22s ease" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: C.dangerLight, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🗑</div>
            <div style={{ fontSize: 16, fontFamily: "Georgia, serif", color: C.text, marginBottom: 8 }}>Delete this thread?</div>
            <div style={{ fontSize: 12, color: C.textLight, marginBottom: 22, lineHeight: 1.6 }}>This and all its replies will be gone forever.</div>
            <div style={{ display: "flex", gap: 9 }}>
              <button onClick={() => setShowDelete(null)} disabled={deleting} style={{ flex: 1, padding: "11px", borderRadius: 12, background: C.bgInput, border: `1px solid ${C.border}`, color: C.textMid, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>keep it</button>
              <button onClick={() => deleteThread(showDelete)} disabled={deleting} style={{ flex: 1, padding: "11px", borderRadius: 12, background: C.dangerLight, border: `1px solid ${C.danger}33`, color: C.danger, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {deleting ? <Spinner size={15} color={C.danger} /> : "delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Invite Panel ───────────────────────────────────────────────────────────
function InvitePanel({ onClose }) {
  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const generate = async () => {
    setGenerating(true);
    const code = generateCode();
    const { error } = await sb.from("invites").insert({ code, used: false, created_at: new Date().toISOString() });
    if (error) { alert("Failed: " + error.message); } else { setLink(`${window.location.origin}?invite=${code}`); }
    setGenerating(false);
  };
  const copy = () => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(30,20,40,0.6)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28, maxWidth: 340, width: "100%", animation: "popIn 0.22s ease" }}>
        <div style={{ fontSize: 18, fontFamily: "Georgia, serif", color: C.text, marginBottom: 8 }}>invite someone</div>
        <div style={{ fontSize: 12, color: C.textLight, marginBottom: 22, lineHeight: 1.6 }}>Generate a one-time link. It expires after use.</div>
        {!link ? (
          <button onClick={generate} disabled={generating} style={{ width: "100%", padding: "12px", borderRadius: 12, background: C.accentDark, border: "none", color: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {generating ? <Spinner size={16} color="#fff" /> : "generate invite link"}
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 11, color: C.textMid, wordBreak: "break-all", lineHeight: 1.5 }}>{link}</div>
            <button onClick={copy} style={{ width: "100%", padding: "12px", borderRadius: 12, background: copied ? "#4caf7d" : C.accentDark, border: "none", color: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "background 0.2s" }}>{copied ? "✓ copied!" : "copy link"}</button>
            <button onClick={generate} disabled={generating} style={{ width: "100%", padding: "10px", borderRadius: 12, background: C.bgInput, border: `1px solid ${C.border}`, color: C.textMid, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>generate another</button>
          </div>
        )}
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textLight, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>close</button>
        </div>
      </div>
    </div>
  );
}

// ── Swipe Video ────────────────────────────────────────────────────────────
function SwipeVideo({ entry, isActive }) {
  const videoRef = useRef(null);
  const [videoUrl, setVideoUrl] = useState(null);

  useEffect(() => {
    if (!entry.video_path) return;
    sb.storage.from("videos").createSignedUrl(entry.video_path, 3600).then(({ data }) => { if (data?.signedUrl) setVideoUrl(data.signedUrl); });
  }, [entry.video_path]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoUrl) return;
    if (isActive) { vid.muted = false; vid.currentTime = 0; vid.play().catch(() => { vid.muted = true; vid.play().catch(() => {}); }); }
    else { vid.muted = true; vid.pause(); vid.currentTime = 0; }
  }, [isActive, videoUrl]);

  const moods = entry.moods || [];
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {videoUrl ? <video ref={videoRef} src={videoUrl} playsInline loop muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <div style={{ width: "100%", height: "100%", background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner color="#fff" /></div>}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(20,10,30,0.9) 0%, transparent 50%)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 20px 52px" }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>{fmtDate(entry.created_at)} · {fmtTime(entry.created_at)}</div>
        {moods.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {moods.map(m => <div key={m} style={{ background: "rgba(155,138,180,0.3)", border: "1px solid rgba(212,200,232,0.3)", color: C.accentLight, borderRadius: 20, padding: "4px 12px", fontSize: 11 }}>{m}</div>)}
          </div>
        )}
        {entry.note && <div style={{ fontSize: 14, lineHeight: 1.65, color: "rgba(255,255,255,0.85)", fontStyle: "italic", fontFamily: "Georgia, serif" }}>"{entry.note}"</div>}
        {entry.duration > 0 && <div style={{ marginTop: 10, fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{fmtDur(entry.duration)}</div>}
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(undefined);
  const [tab, setTab] = useState("video");
  const [entries, setEntries] = useState([]);
  const [writings, setWritings] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [loadingWritings, setLoadingWritings] = useState(false);
  const [customMoods, setCustomMoods] = useState(() => { try { return JSON.parse(localStorage.getItem("mz_custom_moods") || "[]"); } catch { return []; } });
  const [view, setView] = useState("grid");
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [selectedWriting, setSelectedWriting] = useState(null);
  const [stream, setStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [note, setNote] = useState("");
  const [camError, setCamError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMode, setUploadMode] = useState("record");
  const [filterMood, setFilterMood] = useState("all");
  const [showDelete, setShowDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showFABMenu, setShowFABMenu] = useState(false);

  const videoRef = useRef(null);
  const mrRef = useRef(null);
  const chunksRef = useRef([]);
  const elapsedRef = useRef(null);
  const fileInputRef = useRef(null);
  const uploadAbortRef = useRef(null);
  const swipeContainerRef = useRef(null);
  const touchStartY = useRef(null);
  const touchStartX = useRef(null);

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setEntries([]); setWritings([]); return; }
    loadEntries(); loadWritings();
  }, [user]);

  const loadEntries = async () => {
    setLoadingEntries(true);
    const { data } = await sb.from("entries").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setEntries(data);
    setLoadingEntries(false);
  };

  const loadWritings = async () => {
    setLoadingWritings(true);
    const { data } = await sb.from("writings").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setWritings(data);
    setLoadingWritings(false);
  };

  useEffect(() => { if (videoRef.current && stream) videoRef.current.srcObject = stream; }, [stream, view]);
  useEffect(() => { try { localStorage.setItem("mz_custom_moods", JSON.stringify(customMoods)); } catch {} }, [customMoods]);
  useEffect(() => { return () => { if (previewURL) URL.revokeObjectURL(previewURL); }; }, [previewURL]);

  useEffect(() => {
    if (view !== "swipe") return;
    const prevent = (e) => { if (e.touches.length === 1) e.preventDefault(); };
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, [view]);

  const stopStream = useCallback(() => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
  }, [stream]);

  const discard = () => {
    if (uploadAbortRef.current) { uploadAbortRef.current.abort(); uploadAbortRef.current = null; }
    stopStream();
    if (previewURL) URL.revokeObjectURL(previewURL);
    setPreviewBlob(null); setPreviewURL(null);
    setUploading(false); setUploadProgress(0);
    setView("grid");
  };

  const openRecorder = async () => {
    setCamError(null); setPreviewBlob(null); setPreviewURL(null);
    setSelectedMoods([]); setNote(""); setElapsed(0); setUploadMode("record");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      setStream(s); setView("record");
    } catch { setCamError("Camera access denied — please allow camera and microphone access."); }
    setShowFABMenu(false);
  };

  const openUpload = () => {
    setPreviewBlob(null); setPreviewURL(null); setSelectedMoods([]); setNote(""); setUploadMode("upload");
    setShowFABMenu(false); setView("record");
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX = 50 * 1024 * 1024;
    if (file.size > MAX) { alert(`This file is ${(file.size / 1024 / 1024).toFixed(0)}MB. Please compress it to under 50MB before uploading.`); e.target.value = ""; return; }
    setPreviewBlob(file); setPreviewURL(URL.createObjectURL(file));
    e.target.value = "";
  };

  const startCountdown = () => {
    setCountdown(3); let c = 3;
    const iv = setInterval(() => { c--; if (c <= 0) { clearInterval(iv); setCountdown(null); beginRecording(); } else setCountdown(c); }, 1000);
  };

  const beginRecording = () => {
    chunksRef.current = [];
    const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(m => MediaRecorder.isTypeSupported(m)) || "video/webm";
    const mr = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1500000 });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => { const blob = new Blob(chunksRef.current, { type: mimeType }); setPreviewBlob(blob); setPreviewURL(URL.createObjectURL(blob)); };
    mr.start(); mrRef.current = mr;
    setRecording(true); setElapsed(0);
    elapsedRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
  };

  const stopRecording = () => {
    if (mrRef.current && recording) { mrRef.current.stop(); clearInterval(elapsedRef.current); setRecording(false); }
  };

  const generateThumbnail = (blobOrFile) => new Promise((resolve, reject) => {
    const vid = document.createElement("video");
    const url = URL.createObjectURL(blobOrFile);
    vid.src = url; vid.muted = true; vid.currentTime = 1;
    vid.onloadeddata = () => { const c = document.createElement("canvas"); c.width = 480; c.height = 854; c.getContext("2d").drawImage(vid, 0, 0, 480, 854); resolve(c.toDataURL("image/jpeg", 0.7)); URL.revokeObjectURL(url); };
    vid.onerror = () => { URL.revokeObjectURL(url); reject(); };
  });

  const getVideoDuration = (blobOrFile) => new Promise((resolve) => {
    const vid = document.createElement("video");
    const url = URL.createObjectURL(blobOrFile);
    vid.src = url; vid.muted = true;
    vid.onloadedmetadata = () => { resolve(Math.round(vid.duration)); URL.revokeObjectURL(url); };
    vid.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
  });

  const saveVideo = async () => {
    if (!previewBlob || !user) return;
    setUploading(true); setUploadProgress(0);
    try {
      const ext = previewBlob.name?.split(".").pop() || "webm";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await sb.storage.from("videos").upload(path, previewBlob, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      setUploadProgress(100);
      let thumbnail = null;
      try { thumbnail = await generateThumbnail(previewBlob); } catch {}
      const duration = uploadMode === "upload" ? await getVideoDuration(previewBlob) : elapsed;
      const entry = { user_id: user.id, duration, moods: selectedMoods, note: note.trim(), video_path: path, thumbnail, source: uploadMode };
      const { data, error: dbError } = await sb.from("entries").insert(entry).select().single();
      if (dbError) throw dbError;
      setEntries(prev => [data, ...prev]);
      stopStream();
      if (previewURL) URL.revokeObjectURL(previewURL);
      setPreviewBlob(null); setPreviewURL(null); setView("grid");
    } catch (e) { alert("Save failed: " + e.message); }
    setUploading(false);
  };

  const deleteEntry = async (entry) => {
    setDeleting(true);
    try {
      if (entry.video_path) await sb.storage.from("videos").remove([entry.video_path]);
      await sb.from("entries").delete().eq("id", entry.id);
      setEntries(prev => prev.filter(e => e.id !== entry.id));
      setShowDelete(null);
      if (view === "swipe") { setView("grid"); setSwipeIndex(0); }
    } catch (e) { alert("Delete failed: " + e.message); }
    setDeleting(false);
  };

  const deleteWriting = async (entry) => {
    setDeleting(true);
    try {
      await sb.from("writings").delete().eq("id", entry.id);
      setWritings(prev => prev.filter(e => e.id !== entry.id));
      setShowDelete(null);
      if (view === "writeView") { setView("grid"); setSelectedWriting(null); }
    } catch (e) { alert("Delete failed: " + e.message); }
    setDeleting(false);
  };

  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;
    const diffX = Math.abs(touchStartX.current - e.changedTouches[0].clientX);
    if (Math.abs(diffY) > 50 && Math.abs(diffY) > diffX) {
      if (diffY > 0 && swipeIndex < filteredEntries.length - 1) setSwipeIndex(i => i + 1);
      if (diffY < 0 && swipeIndex > 0) setSwipeIndex(i => i - 1);
    }
    touchStartY.current = null; touchStartX.current = null;
  };

  const filteredEntries = filterMood === "all" ? entries : entries.filter(e => (e.moods || []).includes(filterMood));
  const usedMoods = [...new Set(entries.flatMap(e => e.moods || []))];
  const isOwner = user?.email === OWNER_EMAIL;

  const TABS = ["video", "writing", "threads"];

  if (user === undefined) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 24, fontFamily: "Georgia, serif", color: C.textMid }}>momentz</div>
      <Spinner size={28} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!user) return <AuthScreen />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} style={{ display: "none" }} />

      {view === "writeNew" && <WritingEditor user={user} customMoods={customMoods} onAddCustomMood={m => setCustomMoods(p => [...p, m])} onSaved={(entry) => { setWritings(prev => [entry, ...prev]); setView("grid"); }} onCancel={() => setView("grid")} />}
      {view === "writeView" && selectedWriting && <WritingViewer entry={selectedWriting} onBack={() => { setView("grid"); setSelectedWriting(null); }} onDelete={(e) => setShowDelete({ ...e, _type: "writing" })} />}

      {/* ── GRID ── */}
      {view === "grid" && (
        <div style={{ maxWidth: 480, margin: "0 auto", height: "100vh", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "28px 20px 0", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: "0.3em", color: C.textLight, textTransform: "uppercase", marginBottom: 3 }}>private journal</div>
              <h1 style={{ margin: 0, fontSize: 30, fontWeight: 400, fontFamily: "Georgia, serif", color: C.text, letterSpacing: "-0.02em", lineHeight: 1 }}>momentz</h1>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {isOwner && <button onClick={() => setShowInvite(true)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.accent, borderRadius: 20, padding: "6px 12px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>+ invite</button>}
              <button onClick={() => sb.auth.signOut()} style={{ background: "none", border: `1px solid ${C.border}`, color: C.textLight, borderRadius: 20, padding: "6px 12px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>sign out</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ padding: "16px 20px 0", display: "flex", flexShrink: 0 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "10px", background: "none", border: "none", borderBottom: `2px solid ${tab === t ? C.accentDark : C.border}`, color: tab === t ? C.accentDark : C.textLight, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: tab === t ? 500 : 400, transition: "all 0.15s" }}>
                {t === "video" ? "videos" : t === "writing" ? "writing" : "threads"}
              </button>
            ))}
          </div>

          {/* ── VIDEO TAB ── */}
          {tab === "video" && (<>
            {usedMoods.length > 0 && (
              <div style={{ padding: "10px 20px 8px", display: "flex", gap: 7, overflowX: "auto", scrollbarWidth: "none", flexShrink: 0 }}>
                {["all", ...usedMoods].map(m => (
                  <button key={m} onClick={() => setFilterMood(m)} style={{ background: filterMood === m ? C.accentDark : "transparent", border: `1px solid ${filterMood === m ? C.accentDark : C.border}`, color: filterMood === m ? "#fff" : C.textMid, borderRadius: 20, padding: "5px 12px", fontSize: 10, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.18s", fontFamily: "inherit" }}>
                    {m === "all" ? "all moods" : m}
                  </button>
                ))}
              </div>
            )}
            {camError && <div style={{ margin: "0 20px 10px", padding: 12, background: C.dangerLight, border: `1px solid ${C.danger}22`, borderRadius: 10, fontSize: 12, color: C.danger, flexShrink: 0 }}>{camError}</div>}
            <div style={{ flex: 1, overflowY: "auto", paddingBottom: 90 }}>
              {loadingEntries ? <div style={{ padding: 70, display: "flex", justifyContent: "center" }}><Spinner /></div>
                : filteredEntries.length === 0 ? (
                  <div style={{ padding: "60px 20px", textAlign: "center" }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.accentLight, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 20, height: 20, borderRadius: "50%", background: C.accent }} /></div>
                    <div style={{ fontSize: 16, color: C.textMid, fontFamily: "Georgia, serif", fontStyle: "italic" }}>{entries.length === 0 ? "your first moment is waiting" : "no entries for this mood"}</div>
                    <div style={{ fontSize: 11, color: C.textLight, marginTop: 8 }}>tap the + button below to begin</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2, padding: "4px 2px" }}>
                    {filteredEntries.map((entry, i) => {
                      const moods = entry.moods || [];
                      return (
                        <div key={entry.id} onClick={() => { setSwipeIndex(i); setView("swipe"); }} style={{ aspectRatio: "9/16", position: "relative", cursor: "pointer", overflow: "hidden", background: C.accentLight, animation: `fadeUp 0.3s ease ${i * 0.02}s both` }}>
                          {entry.thumbnail ? <img src={entry.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 18, height: 18, borderRadius: "50%", background: C.accent }} /></div>}
                          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(30,20,40,0.85) 0%, transparent 55%)" }} />
                          <div style={{ position: "absolute", bottom: 6, left: 6, right: 6 }}>
                            {moods.length > 0 && <div style={{ fontSize: 8, color: "rgba(255,255,255,0.75)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{moods[0]}{moods.length > 1 ? ` +${moods.length - 1}` : ""}</div>}
                            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)" }}>{fmtDate(entry.created_at)}</div>
                            {entry.note && <div style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.note}</div>}
                          </div>
                          {entry.duration > 0 && <div style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.45)", borderRadius: 4, padding: "2px 5px", fontSize: 8, color: "rgba(255,255,255,0.7)" }}>{fmtDur(entry.duration)}</div>}
                          {entry.source === "upload" && <div style={{ position: "absolute", top: 6, left: 6, background: "rgba(0,0,0,0.45)", borderRadius: 4, padding: "2px 5px", fontSize: 7, color: "rgba(255,255,255,0.6)" }}>↑</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          </>)}

          {/* ── WRITING TAB ── */}
          {tab === "writing" && (
            <div style={{ flex: 1, overflowY: "auto", paddingBottom: 90 }}>
              {loadingWritings ? <div style={{ padding: 70, display: "flex", justifyContent: "center" }}><Spinner /></div>
                : writings.length === 0 ? (
                  <div style={{ padding: "60px 20px", textAlign: "center" }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.accentLight, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>✍️</div>
                    <div style={{ fontSize: 16, color: C.textMid, fontFamily: "Georgia, serif", fontStyle: "italic" }}>your first entry is waiting</div>
                    <div style={{ fontSize: 11, color: C.textLight, marginTop: 8 }}>tap the + button below to start writing</div>
                  </div>
                ) : (
                  <div style={{ padding: "8px 16px" }}>
                    {writings.map((w, i) => {
                      const moods = w.moods || [];
                      return (
                        <div key={w.id} onClick={() => { setSelectedWriting(w); setView("writeView"); }} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px", marginBottom: 10, cursor: "pointer", animation: `fadeUp 0.3s ease ${i * 0.02}s both`, transition: "box-shadow 0.15s" }} onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 16px rgba(155,138,180,0.12)`} onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <div>
                              {w.title && <div style={{ fontSize: 15, fontWeight: 500, fontFamily: "Georgia, serif", color: C.text, marginBottom: 3 }}>{w.title}</div>}
                              <div style={{ fontSize: 10, color: C.textLight }}>{fmtDate(w.created_at)}</div>
                            </div>
                            {moods.length > 0 && (
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: "50%" }}>
                                {moods.slice(0, 2).map(m => <div key={m} style={{ fontSize: 10, color: C.accentDark, background: C.accentLight, borderRadius: 20, padding: "3px 8px", whiteSpace: "nowrap" }}>{m}</div>)}
                                {moods.length > 2 && <div style={{ fontSize: 10, color: C.textLight }}>+{moods.length - 2}</div>}
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>{w.body}</div>
                          <div style={{ marginTop: 8, fontSize: 10, color: C.textLight }}>{w.word_count || 0} words</div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          )}

          {/* ── THREADS TAB ── */}
          {tab === "threads" && <ThreadsTab user={user} />}

          {/* FAB */}
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "center", padding: "16px 0 28px", pointerEvents: "none", zIndex: 100 }}>
            <div style={{ position: "relative", pointerEvents: "all" }}>
              {showFABMenu && tab === "video" && (
                <div style={{ position: "absolute", bottom: 72, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", gap: 8, alignItems: "center", animation: "fadeUp 0.2s ease" }}>
                  <button onClick={openRecorder} style={{ background: C.bgCard, border: `1px solid ${C.border}`, color: C.text, borderRadius: 24, padding: "10px 20px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(155,138,180,0.15)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>⏺</span> record now
                  </button>
                  <button onClick={openUpload} style={{ background: C.bgCard, border: `1px solid ${C.border}`, color: C.text, borderRadius: 24, padding: "10px 20px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(155,138,180,0.15)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>↑</span> upload from camera roll
                  </button>
                </div>
              )}
              {tab !== "threads" && (
                <button onClick={() => {
                  if (tab === "writing") { setShowFABMenu(false); setView("writeNew"); }
                  else setShowFABMenu(p => !p);
                }} style={{ background: showFABMenu ? C.text : C.accentDark, border: "none", borderRadius: 50, width: 60, height: 60, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: `0 4px 24px ${C.accent}55`, transition: "all 0.2s", fontSize: showFABMenu ? 22 : 26, color: "#fff" }}>
                  {tab === "writing" ? "✍" : (showFABMenu ? "×" : "+")}
                </button>
              )}
            </div>
          </div>
          {showFABMenu && <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setShowFABMenu(false)} />}
        </div>
      )}

      {/* ── SWIPE ── */}
      {view === "swipe" && filteredEntries.length > 0 && (
        <div ref={swipeContainerRef} style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden", touchAction: "none" }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {filteredEntries.map((entry, i) => (
            <div key={entry.id} style={{ position: "absolute", inset: 0, transform: `translateY(${(i - swipeIndex) * 100}%)`, transition: "transform 0.38s cubic-bezier(0.4,0,0.2,1)", willChange: "transform" }}>
              <SwipeVideo entry={entry} isActive={i === swipeIndex} />
            </div>
          ))}
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, padding: "16px 20px", display: "flex", justifyContent: "space-between", background: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)", zIndex: 10 }}>
            <button onClick={() => setView("grid")} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 20, padding: "7px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>← grid</button>
            <button onClick={() => setShowDelete(filteredEntries[swipeIndex])} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "rgba(255,255,255,0.7)", borderRadius: 20, padding: "7px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>delete</button>
          </div>
          {filteredEntries.length > 1 && (
            <div style={{ position: "fixed", right: 16, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 6, zIndex: 10 }}>
              {filteredEntries.map((_, idx) => (
                <div key={idx} onClick={() => setSwipeIndex(idx)} style={{ width: 3, height: idx === swipeIndex ? 20 : 6, background: idx === swipeIndex ? "#fff" : "rgba(255,255,255,0.3)", borderRadius: 3, cursor: "pointer", transition: "all 0.2s" }} />
              ))}
            </div>
          )}
          <div style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 16, zIndex: 10 }}>
            {swipeIndex > 0 && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>↑ newer</div>}
            {swipeIndex < filteredEntries.length - 1 && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>↓ older</div>}
          </div>
        </div>
      )}

      {/* ── RECORD ── */}
      {view === "record" && (
        <div style={{ position: "fixed", inset: 0, background: "#000", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }}>
            <button onClick={discard} style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: 20, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>✕ cancel</button>
            {recording && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(210,45,45,0.85)", borderRadius: 20, padding: "5px 12px" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff", animation: "blink 1s infinite" }} />
                <span style={{ fontSize: 12, color: "#fff", fontFamily: "inherit" }}>{fmtDur(elapsed)}</span>
              </div>
            )}
          </div>
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            {uploadMode === "record" && !previewBlob && <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
            {previewBlob && previewURL && <video src={previewURL} controls playsInline style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }} />}
            {uploadMode === "upload" && !previewBlob && (
              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "#0a0a0a" }}>
                <div style={{ fontSize: 48 }}>📁</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>tap to choose a video</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>max 50MB · compress large files first</div>
                <button onClick={() => fileInputRef.current?.click()} style={{ background: C.accentDark, border: "none", color: "#fff", borderRadius: 24, padding: "12px 28px", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>browse camera roll</button>
              </div>
            )}
            {countdown !== null && <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 100, fontFamily: "Georgia, serif", color: "rgba(255,255,255,0.9)", animation: "popIn 0.7s ease" }}>{countdown}</div>}
          </div>
          <div style={{ background: C.bg, borderRadius: "20px 20px 0 0", padding: "16px 20px 32px", flexShrink: 0 }}>
            {uploading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "8px 0" }}>
                <div style={{ fontSize: 13, color: C.textMid }}>uploading your moment...</div>
                <div style={{ width: "100%", height: 4, background: C.accentLight, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${uploadProgress}%`, background: C.accentDark, borderRadius: 4, transition: "width 0.3s" }} />
                </div>
                <div style={{ fontSize: 11, color: C.textLight }}>{uploadProgress}%</div>
              </div>
            ) : !previewBlob ? (
              uploadMode === "record" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <MoodPicker value={selectedMoods} onChange={setSelectedMoods} customMoods={customMoods} onAddCustomMood={m => setCustomMoods(p => [...p, m])} />
                  <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
                    {!recording
                      ? <button onClick={startCountdown} style={{ width: 64, height: 64, borderRadius: "50%", background: C.accentDark, border: `4px solid ${C.accentLight}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 24px ${C.accent}44`, transition: "transform 0.15s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.06)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff" }} />
                        </button>
                      : <button onClick={stopRecording} style={{ width: 64, height: 64, borderRadius: "50%", background: C.rec, border: "4px solid rgba(224,91,115,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", animation: "recPulse 1.6s ease infinite" }}>
                          <div style={{ width: 20, height: 20, borderRadius: 4, background: "#fff" }} />
                        </button>
                    }
                  </div>
                </div>
              )
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                <div style={{ fontSize: 12, color: C.textMid, textAlign: "center" }}>{uploadMode === "upload" ? "looks good? add tags then save." : "happy with this?"}</div>
                <MoodPicker value={selectedMoods} onChange={setSelectedMoods} customMoods={customMoods} onAddCustomMood={m => setCustomMoods(p => [...p, m])} />
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="a note to your future self... (optional)" rows={2} style={{ background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 12, padding: "9px 12px", color: C.text, fontSize: 12, fontFamily: "inherit", resize: "none", outline: "none" }} />
                <div style={{ display: "flex", gap: 8 }}>
                  {uploadMode === "record"
                    ? <button onClick={() => { if (previewURL) URL.revokeObjectURL(previewURL); setPreviewBlob(null); setPreviewURL(null); }} style={{ flex: 1, padding: "11px", borderRadius: 12, background: C.bgInput, border: `1px solid ${C.border}`, color: C.textMid, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>re-record</button>
                    : <button onClick={() => { if (previewURL) URL.revokeObjectURL(previewURL); setPreviewBlob(null); setPreviewURL(null); fileInputRef.current?.click(); }} style={{ flex: 1, padding: "11px", borderRadius: 12, background: C.bgInput, border: `1px solid ${C.border}`, color: C.textMid, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>choose different</button>
                  }
                  <button onClick={saveVideo} style={{ flex: 2, padding: "11px", borderRadius: 12, background: C.accentDark, border: "none", color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>save to momentz</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DELETE ── */}
      {showDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(30,20,40,0.6)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28, maxWidth: 300, width: "100%", textAlign: "center", animation: "popIn 0.22s ease" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: C.dangerLight, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🗑</div>
            <div style={{ fontSize: 16, fontFamily: "Georgia, serif", color: C.text, marginBottom: 8 }}>Delete this {showDelete._type === "writing" ? "entry" : "moment"}?</div>
            <div style={{ fontSize: 12, color: C.textLight, marginBottom: 22, lineHeight: 1.6 }}>This will be removed from your journal forever.</div>
            <div style={{ display: "flex", gap: 9 }}>
              <button onClick={() => setShowDelete(null)} disabled={deleting} style={{ flex: 1, padding: "11px", borderRadius: 12, background: C.bgInput, border: `1px solid ${C.border}`, color: C.textMid, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>keep it</button>
              <button onClick={() => showDelete._type === "writing" ? deleteWriting(showDelete) : deleteEntry(showDelete)} disabled={deleting} style={{ flex: 1, padding: "11px", borderRadius: 12, background: C.dangerLight, border: `1px solid ${C.danger}33`, color: C.danger, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {deleting ? <Spinner size={15} color={C.danger} /> : "delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showInvite && <InvitePanel onClose={() => setShowInvite(false)} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        textarea::placeholder, input::placeholder { color: ${C.textLight}; }
        video { outline: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
        @keyframes recPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(224,91,115,0.4); } 50% { box-shadow: 0 0 0 14px rgba(224,91,115,0); } }
        @keyframes popIn { from { transform: scale(0.92) translateY(8px); opacity:0; } to { transform: scale(1) translateY(0); opacity:1; } }
        @keyframes slideUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
