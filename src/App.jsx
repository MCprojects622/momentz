import { useState, useRef, useEffect, useCallback } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Firebase ───────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAQD4FUruRm5WXkv9uHZn_RamMmZoKmP3c",
  authDomain: "momentz-a54c7.firebaseapp.com",
  projectId: "momentz-a54c7",
  storageBucket: "momentz-a54c7.firebasestorage.app",
  messagingSenderId: "809185792278",
  appId: "1:809185792278:web:55560153def1368ab24037"
};
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// ── Cloudinary ─────────────────────────────────────────────────────────────
const CLD_CLOUD = "drt7raxhw";
const CLD_PRESET = "ml_default";
const CLD_URL = `https://api.cloudinary.com/v1_1/${CLD_CLOUD}/video/upload`;

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg: "#f7f5fb",
  bgCard: "#ffffff",
  bgInput: "#f4f1f9",
  border: "#e8e2f4",
  accent: "#9b8ab4",
  accentLight: "#d4c8e8",
  accentDark: "#6b5a8e",
  text: "#1e1428",
  textMid: "#7a6e8a",
  textLight: "#b8a8cc",
  danger: "#c4637a",
  dangerLight: "#f9eef1",
  rec: "#e05b73",
};

// ── Default moods ──────────────────────────────────────────────────────────
const DEFAULT_MOODS = ["✨ hopeful","💭 reflective","🌊 overwhelmed","🔥 energized","🌿 peaceful","🌧 heavy","🎉 joyful","😶 numb"];

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(ts) {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(ts) {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmtDur(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
function friendlyError(code) {
  const map = {
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/email-already-in-use": "An account already exists with this email.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/invalid-credential": "Incorrect email or password.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

// ── Shared UI ──────────────────────────────────────────────────────────────
const Spinner = ({ size = 22, color = C.accent }) => (
  <div style={{ width: size, height: size, border: `2px solid ${C.accentLight}`, borderTop: `2px solid ${color}`, borderRadius: "50%", animation: "spin 0.75s linear infinite", flexShrink: 0 }} />
);

// ── Auth Screen ────────────────────────────────────────────────────────────
function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const inputStyle = {
    width: "100%", background: C.bgInput, border: `1px solid ${C.border}`,
    borderRadius: 12, padding: "12px 14px", color: C.text, fontSize: 14,
    fontFamily: "inherit", outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s",
  };
  const btnPrimary = {
    width: "100%", padding: "13px", borderRadius: 12,
    background: C.accentDark, border: "none",
    color: "#fff", fontSize: 14, cursor: "pointer",
    fontFamily: "inherit", fontWeight: 500,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    transition: "opacity 0.15s",
  };

  const emailAuth = async () => {
    setError(""); setLoading(true);
    try {
      if (mode === "signup") await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
    } catch (e) { setError(friendlyError(e.code)); }
    setLoading(false);
  };
  const resetPassword = async () => {
    setError(""); setLoading(true);
    try { await sendPasswordResetEmail(auth, email); setResetSent(true); }
    catch (e) { setError(friendlyError(e.code)); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 360, animation: "slideUp 0.45s ease both" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.accentLight, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.accentDark }} />
          </div>
          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 400, fontFamily: "Georgia, serif", color: C.text, letterSpacing: "-0.02em" }}>momentz</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: C.textLight, fontStyle: "italic", fontFamily: "Georgia, serif" }}>your story, your way</p>
        </div>

        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 20, padding: 24, boxShadow: "0 4px 24px rgba(155,138,180,0.08)" }}>

          {mode !== "reset" ? (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: C.textMid, marginBottom: 6, letterSpacing: "0.05em" }}>email</div>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: C.textMid, marginBottom: 6, letterSpacing: "0.05em" }}>password</div>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && emailAuth()} placeholder="••••••••" style={inputStyle} />
              </div>
              {error && <div style={{ fontSize: 12, color: C.danger, marginBottom: 12, textAlign: "center", background: C.dangerLight, padding: "8px 12px", borderRadius: 8 }}>{error}</div>}
              <button onClick={emailAuth} disabled={loading} style={btnPrimary}>
                {loading ? <Spinner size={16} color="#fff" /> : (mode === "login" ? "sign in" : "create account")}
              </button>
              <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 20 }}>
                <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} style={{ background: "none", border: "none", color: C.accent, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  {mode === "login" ? "create account" : "back to sign in"}
                </button>
                {mode === "login" && (
                  <button onClick={() => { setMode("reset"); setError(""); }} style={{ background: "none", border: "none", color: C.textLight, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>forgot password</button>
                )}
              </div>
            </>
          ) : resetSent ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📬</div>
              <div style={{ fontSize: 13, color: C.textMid, marginBottom: 16 }}>reset link sent to {email}</div>
              <button onClick={() => { setMode("login"); setResetSent(false); }} style={{ background: "none", border: "none", color: C.accent, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>← back to sign in</button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: C.textMid, marginBottom: 14, textAlign: "center" }}>enter your email to receive a reset link</div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" style={{ ...inputStyle, marginBottom: 12 }} />
              {error && <div style={{ fontSize: 12, color: C.danger, marginBottom: 12, textAlign: "center" }}>{error}</div>}
              <button onClick={resetPassword} disabled={loading} style={btnPrimary}>
                {loading ? <Spinner size={16} color="#fff" /> : "send reset link"}
              </button>
              <div style={{ marginTop: 14, textAlign: "center" }}>
                <button onClick={() => { setMode("login"); setError(""); }} style={{ background: "none", border: "none", color: C.textLight, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>← back to sign in</button>
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 10, color: C.textLight, letterSpacing: "0.1em", textTransform: "uppercase" }}>private · just for you</div>
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

// ── Mood Picker with custom tags ───────────────────────────────────────────
function MoodPicker({ value, onChange, customMoods, onAddCustomMood }) {
  const [adding, setAdding] = useState(false);
  const [newMood, setNewMood] = useState("");
  const allMoods = [...DEFAULT_MOODS, ...customMoods];

  const handleAdd = () => {
    if (newMood.trim()) {
      onAddCustomMood(newMood.trim());
      onChange(newMood.trim());
      setNewMood(""); setAdding(false);
    }
  };

  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: "0.2em", color: C.textLight, textTransform: "uppercase", marginBottom: 8 }}>mood</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {allMoods.map(m => (
          <button key={m} onClick={() => onChange(m === value ? "" : m)} style={{
            background: value === m ? C.accentDark : C.bgInput,
            border: `1px solid ${value === m ? C.accentDark : C.border}`,
            color: value === m ? "#fff" : C.textMid,
            borderRadius: 20, padding: "5px 11px", fontSize: 11, cursor: "pointer",
            fontFamily: "inherit", transition: "all 0.15s",
          }}>{m}</button>
        ))}
        {adding ? (
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input
              autoFocus value={newMood} onChange={e => setNewMood(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
              placeholder="type a mood..." style={{
                background: C.bgInput, border: `1px solid ${C.accent}`, borderRadius: 20,
                padding: "5px 11px", fontSize: 11, fontFamily: "inherit", color: C.text,
                outline: "none", width: 110,
              }} />
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

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(undefined);
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [customMoods, setCustomMoods] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mz_custom_moods") || "[]"); } catch { return []; }
  });

  // views: "grid" | "record" | "swipe"
  const [view, setView] = useState("grid");
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState(null);

  // recording
  const [stream, setStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [selectedMood, setSelectedMood] = useState("");
  const [note, setNote] = useState("");
  const [camError, setCamError] = useState(null);

  // upload
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ui
  const [filterMood, setFilterMood] = useState("all");
  const [showDelete, setShowDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const videoRef = useRef(null);
  const mrRef = useRef(null);
  const chunksRef = useRef([]);
  const elapsedRef = useRef(null);
  const swipeContainerRef = useRef(null);
  const touchStartY = useRef(null);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u ?? null));
    return unsub;
  }, []);

  // Load entries
  useEffect(() => {
    if (!user) { setEntries([]); return; }
    (async () => {
      setLoadingEntries(true);
      try {
        const q = query(collection(db, "users", user.uid, "entries"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
      setLoadingEntries(false);
    })();
  }, [user]);

  // Stream → video element
  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream, view]);

  // Persist custom moods
  useEffect(() => {
    try { localStorage.setItem("mz_custom_moods", JSON.stringify(customMoods)); } catch {}
  }, [customMoods]);

  const stopStream = useCallback(() => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
  }, [stream]);

  const openRecorder = async () => {
    setCamError(null); setPreviewBlob(null); setSelectedMood(""); setNote(""); setElapsed(0);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      setStream(s); setView("record");
    } catch { setCamError("Camera access denied — please allow camera and microphone access."); }
  };

  const startCountdown = () => {
    setCountdown(3); let c = 3;
    const iv = setInterval(() => {
      c--;
      if (c <= 0) { clearInterval(iv); setCountdown(null); beginRecording(); }
      else setCountdown(c);
    }, 1000);
  };

  const beginRecording = () => {
    chunksRef.current = [];
    const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(m => MediaRecorder.isTypeSupported(m)) || "video/webm";
    const mr = new MediaRecorder(stream, { mimeType });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => setPreviewBlob(new Blob(chunksRef.current, { type: mimeType }));
    mr.start(); mrRef.current = mr;
    setRecording(true); setElapsed(0);
    elapsedRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
  };

  const stopRecording = () => {
    if (mrRef.current && recording) { mrRef.current.stop(); clearInterval(elapsedRef.current); setRecording(false); }
  };

  const uploadToCloudinary = (blob) => new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", blob, "moment.webm");
    fd.append("upload_preset", CLD_PRESET);
    fd.append("folder", `momentz/${user.uid}`);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", CLD_URL);
    xhr.upload.onprogress = e => { if (e.lengthComputable) setUploadProgress(Math.round(e.loaded / e.total * 100)); };
    xhr.onload = () => xhr.status === 200 ? resolve(JSON.parse(xhr.responseText)) : reject(new Error(xhr.responseText));
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(fd);
  });

  const generateThumbnail = (blob) => new Promise((resolve, reject) => {
    const vid = document.createElement("video");
    vid.src = URL.createObjectURL(blob); vid.muted = true; vid.currentTime = 0.5;
    vid.onloadeddata = () => {
      const c = document.createElement("canvas"); c.width = 480; c.height = 854;
      c.getContext("2d").drawImage(vid, 0, 0, 480, 854);
      resolve(c.toDataURL("image/jpeg", 0.7)); URL.revokeObjectURL(vid.src);
    };
    vid.onerror = reject;
  });

  const saveEntry = async () => {
    if (!previewBlob || !user) return;
    setUploading(true); setUploadProgress(0);
    try {
      const cld = await uploadToCloudinary(previewBlob);
      let thumbnail = null;
      try { thumbnail = await generateThumbnail(previewBlob); } catch {}
      const entry = {
        createdAt: serverTimestamp(), duration: elapsed,
        mood: selectedMood, note: note.trim(),
        videoURL: cld.secure_url, cloudinaryPublicId: cld.public_id, thumbnail,
      };
      const ref = await addDoc(collection(db, "users", user.uid, "entries"), entry);
      setEntries(prev => [{ id: ref.id, ...entry, createdAt: { toDate: () => new Date() } }, ...prev]);
      stopStream(); setView("grid"); setPreviewBlob(null);
    } catch (e) { alert("Save failed: " + e.message); }
    setUploading(false);
  };

  const deleteEntry = async (entry) => {
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "users", user.uid, "entries", entry.id));
      setEntries(prev => prev.filter(e => e.id !== entry.id));
      setShowDelete(null);
      if (view === "swipe") { setView("grid"); setSwipeIndex(0); }
    } catch (e) { alert("Delete failed: " + e.message); }
    setDeleting(false);
  };

  const discard = () => { stopStream(); setPreviewBlob(null); setView("grid"); };

  // Swipe touch handlers
  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && swipeIndex < filteredEntries.length - 1) setSwipeIndex(i => i + 1);
      if (diff < 0 && swipeIndex > 0) setSwipeIndex(i => i - 1);
    }
    touchStartY.current = null;
  };

  const filteredEntries = filterMood === "all" ? entries : entries.filter(e => e.mood === filterMood);
  const allMoods = [...DEFAULT_MOODS, ...customMoods];
  const usedMoods = [...new Set(entries.map(e => e.mood).filter(Boolean))];

  // ── Loading ──
  if (user === undefined) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 24, fontFamily: "Georgia, serif", color: C.textMid }}>momentz</div>
      <Spinner size={28} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!user) return <AuthScreen />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', system-ui, sans-serif", position: "relative", overflowX: "hidden" }}>

      {/* ════════════════ GRID VIEW ════════════════ */}
      {view === "grid" && (
        <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 100 }}>

          {/* Header */}
          <div style={{ padding: "32px 20px 16px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: "0.3em", color: C.textLight, textTransform: "uppercase", marginBottom: 4 }}>private journal</div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 400, fontFamily: "Georgia, serif", color: C.text, letterSpacing: "-0.02em", lineHeight: 1 }}>momentz</h1>
              <div style={{ marginTop: 5, fontSize: 11, color: C.textLight }}>{entries.length} {entries.length === 1 ? "memory" : "memories"}</div>
            </div>
            <button onClick={() => signOut(auth)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.textLight, borderRadius: 20, padding: "6px 12px", fontSize: 10, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.08em" }}>sign out</button>
          </div>

          {/* Mood filter */}
          {usedMoods.length > 0 && (
            <div style={{ padding: "0 20px 12px", display: "flex", gap: 7, overflowX: "auto", scrollbarWidth: "none" }}>
              {["all", ...usedMoods].map(m => (
                <button key={m} onClick={() => setFilterMood(m)} style={{
                  background: filterMood === m ? C.accentDark : "transparent",
                  border: `1px solid ${filterMood === m ? C.accentDark : C.border}`,
                  color: filterMood === m ? "#fff" : C.textMid,
                  borderRadius: 20, padding: "5px 12px", fontSize: 10, cursor: "pointer",
                  whiteSpace: "nowrap", transition: "all 0.18s", fontFamily: "inherit",
                }}>{m === "all" ? "all moods" : m}</button>
              ))}
            </div>
          )}

          {camError && <div style={{ margin: "0 20px 12px", padding: 12, background: C.dangerLight, border: `1px solid ${C.danger}22`, borderRadius: 10, fontSize: 12, color: C.danger }}>{camError}</div>}

          {/* Grid */}
          {loadingEntries ? (
            <div style={{ padding: 70, display: "flex", justifyContent: "center" }}><Spinner /></div>
          ) : filteredEntries.length === 0 ? (
            <div style={{ padding: "72px 20px", textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.accentLight, margin: "0 auto 18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.accent }} />
              </div>
              <div style={{ fontSize: 17, color: C.textMid, fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                {entries.length === 0 ? "your first moment is waiting" : "no entries for this mood"}
              </div>
              <div style={{ fontSize: 11, color: C.textLight, marginTop: 8 }}>tap the button below to begin</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2, padding: "0 2px" }}>
              {filteredEntries.map((entry, i) => (
                <div key={entry.id} onClick={() => { setSwipeIndex(i); setView("swipe"); }}
                  style={{ aspectRatio: "9/16", position: "relative", cursor: "pointer", overflow: "hidden", background: C.accentLight, animation: `fadeUp 0.3s ease ${i * 0.02}s both` }}>
                  {entry.thumbnail
                    ? <img src={entry.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    : <div style={{ width: "100%", height: "100%", background: `hsl(${(entry.id?.charCodeAt(0) || 0) * 11 % 360},25%,85%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: C.accent }} />
                      </div>
                  }
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(30,20,40,0.85) 0%, transparent 55%)" }} />
                  <div style={{ position: "absolute", bottom: 6, left: 6, right: 6 }}>
                    {entry.mood && <div style={{ fontSize: 8, color: "rgba(255,255,255,0.75)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.mood}</div>}
                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)" }}>{fmtDate(entry.createdAt)}</div>
                    {entry.note && <div style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.note}</div>}
                  </div>
                  <div style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.45)", borderRadius: 4, padding: "2px 5px", fontSize: 8, color: "rgba(255,255,255,0.7)" }}>{fmtDur(entry.duration)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Record FAB */}
          <button onClick={openRecorder} style={{
            position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
            background: C.accentDark, border: "none", borderRadius: 50,
            width: 60, height: 60, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", boxShadow: `0 4px 24px ${C.accent}55`,
            transition: "transform 0.15s, box-shadow 0.15s", zIndex: 100,
          }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateX(-50%) scale(1.08)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateX(-50%) scale(1)"}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff" }} />
          </button>
        </div>
      )}

      {/* ════════════════ SWIPE VIEW (TikTok style) ════════════════ */}
      {view === "swipe" && filteredEntries.length > 0 && (
        <div ref={swipeContainerRef} style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden" }}
          onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

          {/* Videos stack */}
          {filteredEntries.map((entry, i) => (
            <div key={entry.id} style={{
              position: "absolute", inset: 0,
              transform: `translateY(${(i - swipeIndex) * 100}%)`,
              transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
            }}>
              <video
                src={entry.videoURL} playsInline
                autoPlay={i === swipeIndex} loop muted={false}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              {/* Gradient overlay */}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(20,10,30,0.9) 0%, transparent 50%)" }} />

              {/* Top bar */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)" }}>
                <button onClick={() => setView("grid")} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 20, padding: "7px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", backdropFilter: "blur(8px)" }}>← grid</button>
                <button onClick={() => setShowDelete(entry)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "rgba(255,255,255,0.7)", borderRadius: 20, padding: "7px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>delete</button>
              </div>

              {/* Bottom info */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 20px 36px" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>{fmtDate(entry.createdAt)} · {fmtTime(entry.createdAt)}</div>
                {entry.mood && (
                  <div style={{ display: "inline-block", background: "rgba(155,138,180,0.3)", border: "1px solid rgba(212,200,232,0.3)", color: C.accentLight, borderRadius: 20, padding: "4px 12px", fontSize: 11, marginBottom: 10, backdropFilter: "blur(8px)" }}>{entry.mood}</div>
                )}
                {entry.note && (
                  <div style={{ fontSize: 14, lineHeight: 1.65, color: "rgba(255,255,255,0.85)", fontStyle: "italic", fontFamily: "Georgia, serif" }}>"{entry.note}"</div>
                )}
                <div style={{ marginTop: 10, fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{fmtDur(entry.duration)}</div>
              </div>

              {/* Swipe hint */}
              {filteredEntries.length > 1 && (
                <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 6 }}>
                  {filteredEntries.map((_, idx) => (
                    <div key={idx} onClick={() => setSwipeIndex(idx)} style={{ width: 3, height: idx === swipeIndex ? 20 : 6, background: idx === swipeIndex ? "#fff" : "rgba(255,255,255,0.3)", borderRadius: 3, cursor: "pointer", transition: "all 0.2s" }} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ════════════════ RECORD VIEW ════════════════ */}
      {view === "record" && (
        <div style={{ position: "fixed", inset: 0, background: "#000", display: "flex", flexDirection: "column" }}>

          {/* Top bar */}
          <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }}>
            <button onClick={discard} style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: 20, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>✕ cancel</button>
            {recording && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(210,45,45,0.85)", borderRadius: 20, padding: "5px 12px" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff", animation: "blink 1s infinite" }} />
                <span style={{ fontSize: 12, color: "#fff", fontFamily: "inherit" }}>{fmtDur(elapsed)}</span>
              </div>
            )}
          </div>

          {/* Camera / preview */}
          <div style={{ flex: 1, position: "relative" }}>
            {!previewBlob
              ? <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              : <video src={URL.createObjectURL(previewBlob)} controls playsInline style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }} />
            }
            {countdown !== null && (
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 100, fontFamily: "Georgia, serif", color: "rgba(255,255,255,0.9)", textShadow: `0 0 40px ${C.accent}88`, animation: "popIn 0.7s ease" }}>{countdown}</div>
            )}
          </div>

          {/* Controls panel */}
          <div style={{ background: "rgba(247,245,251,0.97)", borderRadius: "20px 20px 0 0", padding: "20px 20px 36px", backdropFilter: "blur(20px)" }}>
            {uploading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "8px 0" }}>
                <div style={{ fontSize: 13, color: C.textMid }}>uploading your moment...</div>
                <div style={{ width: "100%", height: 4, background: C.accentLight, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${uploadProgress}%`, background: C.accentDark, borderRadius: 4, transition: "width 0.3s" }} />
                </div>
                <div style={{ fontSize: 11, color: C.textLight }}>{uploadProgress}%</div>
              </div>
            ) : !previewBlob ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <MoodPicker value={selectedMood} onChange={setSelectedMood} customMoods={customMoods} onAddCustomMood={m => setCustomMoods(p => [...p, m])} />
                <div style={{ display: "flex", justifyContent: "center", paddingTop: 6 }}>
                  {!recording
                    ? <button onClick={startCountdown} style={{ width: 68, height: 68, borderRadius: "50%", background: C.accentDark, border: `4px solid ${C.accentLight}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 24px ${C.accent}44`, transition: "transform 0.15s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.06)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#fff" }} />
                      </button>
                    : <button onClick={stopRecording} style={{ width: 68, height: 68, borderRadius: "50%", background: C.rec, border: "4px solid rgba(224,91,115,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", animation: "recPulse 1.6s ease infinite" }}>
                        <div style={{ width: 20, height: 20, borderRadius: 4, background: "#fff" }} />
                      </button>
                  }
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 12, color: C.textMid, textAlign: "center" }}>happy with this?</div>
                <MoodPicker value={selectedMood} onChange={setSelectedMood} customMoods={customMoods} onAddCustomMood={m => setCustomMoods(p => [...p, m])} />
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="a note to your future self... (optional)" rows={2}
                  style={{ background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 13px", color: C.text, fontSize: 13, fontFamily: "inherit", resize: "none", outline: "none" }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setPreviewBlob(null)} style={{ flex: 1, padding: "11px", borderRadius: 12, background: C.bgInput, border: `1px solid ${C.border}`, color: C.textMid, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>re-record</button>
                  <button onClick={saveEntry} style={{ flex: 2, padding: "11px", borderRadius: 12, background: C.accentDark, border: "none", color: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>save to momentz</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════ DELETE CONFIRM ════════════════ */}
      {showDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(30,20,40,0.6)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28, maxWidth: 300, width: "100%", textAlign: "center", animation: "popIn 0.22s ease" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: C.dangerLight, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 20 }}>🗑</div>
            </div>
            <div style={{ fontSize: 16, fontFamily: "Georgia, serif", color: C.text, marginBottom: 8 }}>Delete this moment?</div>
            <div style={{ fontSize: 12, color: C.textLight, marginBottom: 22, lineHeight: 1.6 }}>This will be removed from your journal forever.</div>
            <div style={{ display: "flex", gap: 9 }}>
              <button onClick={() => setShowDelete(null)} disabled={deleting} style={{ flex: 1, padding: "11px", borderRadius: 12, background: C.bgInput, border: `1px solid ${C.border}`, color: C.textMid, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>keep it</button>
              <button onClick={() => deleteEntry(showDelete)} disabled={deleting} style={{ flex: 1, padding: "11px", borderRadius: 12, background: C.dangerLight, border: `1px solid ${C.danger}33`, color: C.danger, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {deleting ? <Spinner size={15} color={C.danger} /> : "delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        textarea::placeholder { color: ${C.textLight}; }
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
