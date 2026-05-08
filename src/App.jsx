import { useState, useRef, useEffect, useCallback } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
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

// ── Compression settings ───────────────────────────────────────────────────
const COMPRESS_THRESHOLD_MB = 20; // only compress if file > 20MB
const TARGET_BITRATE_BPS = 1_500_000; // 1.5 Mbps — great quality for talking-head video

// ── Helpers ────────────────────────────────────────────────────────────────
const MOODS = ["✨ hopeful","💭 reflective","🌊 overwhelmed","🔥 energized","🌿 peaceful","🌧 heavy","🎉 joyful","😶 numb"];

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
function fmtSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
function friendlyError(code) {
  const map = {
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/email-already-in-use": "An account already exists with this email.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/popup-closed-by-user": "Sign-in popup was closed.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/invalid-credential": "Incorrect email or password.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

// ── Video compression via MediaRecorder re-encode ─────────────────────────
// Plays the blob through a hidden video element and re-records it at a lower bitrate.
// This is the most compatible approach — works on all modern mobile browsers.
function compressVideo(blob, onProgress) {
  return new Promise((resolve, reject) => {
    const sizeMB = blob.size / (1024 * 1024);
    // Skip compression for small files
    if (sizeMB < COMPRESS_THRESHOLD_MB) {
      onProgress && onProgress(100, blob.size, blob.size);
      resolve(blob);
      return;
    }

    const videoEl = document.createElement("video");
    videoEl.src = URL.createObjectURL(blob);
    videoEl.muted = true;
    videoEl.playsInline = true;

    videoEl.onloadedmetadata = () => {
      const duration = videoEl.duration;
      const canvas = document.createElement("canvas");
      canvas.width = videoEl.videoWidth || 1280;
      canvas.height = videoEl.videoHeight || 720;
      const ctx = canvas.getContext("2d");

      // Capture canvas stream at target bitrate
      const canvasStream = canvas.captureStream(30);

      // Try to grab original audio track from blob
      // We'll re-use it from the source video element via AudioContext
      let outputStream;
      try {
        const audioCtx = new AudioContext();
        const src = audioCtx.createMediaElementSource(videoEl);
        const dest = audioCtx.createMediaStreamDestination();
        src.connect(dest);
        src.connect(audioCtx.destination);
        outputStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...dest.stream.getAudioTracks(),
        ]);
      } catch {
        outputStream = canvasStream;
      }

      // Pick best supported codec
      const mimeType = ["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(m => MediaRecorder.isTypeSupported(m)) || "video/webm";

      const mr = new MediaRecorder(outputStream, {
        mimeType,
        videoBitsPerSecond: TARGET_BITRATE_BPS,
        audioBitsPerSecond: 128_000,
      });

      const chunks = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = () => {
        URL.revokeObjectURL(videoEl.src);
        const compressed = new Blob(chunks, { type: mimeType });
        onProgress && onProgress(100, blob.size, compressed.size);
        // If compression made it bigger somehow, return original
        resolve(compressed.size < blob.size ? compressed : blob);
      };
      mr.onerror = () => { URL.revokeObjectURL(videoEl.src); resolve(blob); }; // fallback to original on error

      // Draw each frame to canvas while video plays
      let animFrame;
      const drawFrame = () => {
        if (videoEl.paused || videoEl.ended) return;
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        // Report progress
        if (duration > 0 && onProgress) {
          const pct = Math.min(99, Math.round((videoEl.currentTime / duration) * 100));
          onProgress(pct, blob.size, null);
        }
        animFrame = requestAnimationFrame(drawFrame);
      };

      mr.start(100); // collect data every 100ms
      videoEl.play().then(() => { drawFrame(); });
      videoEl.onended = () => {
        cancelAnimationFrame(animFrame);
        // Final frame
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        setTimeout(() => mr.stop(), 200);
      };
    };

    videoEl.onerror = () => { URL.revokeObjectURL(videoEl.src); resolve(blob); }; // fallback
  });
}

// ── Shared UI ──────────────────────────────────────────────────────────────
const Grain = () => (
  <svg style={{position:"fixed",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:9999,opacity:0.042}}>
    <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
    <rect width="100%" height="100%" filter="url(#g)"/>
  </svg>
);
const Spinner = ({ size=22, color="rgba(255,255,255,0.55)" }) => (
  <div style={{width:size,height:size,border:`2px solid rgba(255,255,255,0.09)`,borderTop:`2px solid ${color}`,borderRadius:"50%",animation:"spin 0.75s linear infinite",flexShrink:0}}/>
);
function MoodPicker({ value, onChange }) {
  return (
    <div>
      <div style={{fontSize:9,letterSpacing:"0.24em",color:"rgba(237,233,224,0.28)",textTransform:"uppercase",marginBottom:8}}>mood</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {MOODS.map(m => (
          <button key={m} onClick={()=>onChange(m===value?"":m)} style={{
            background:value===m?"rgba(200,168,240,0.18)":"rgba(255,255,255,0.04)",
            border:"1px solid",borderColor:value===m?"rgba(200,168,240,0.45)":"rgba(255,255,255,0.09)",
            color:value===m?"#c8a8f0":"rgba(237,233,224,0.48)",
            borderRadius:20,padding:"4px 10px",fontSize:10,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",
          }}>{m}</button>
        ))}
      </div>
    </div>
  );
}

// ── Upload progress display ────────────────────────────────────────────────
function UploadProgress({ stage, progress, originalSize, compressedSize }) {
  const stages = {
    compressing: { label: "compressing video...", sublabel: originalSize ? `original: ${fmtSize(originalSize)}` : "", color: "#c8a8f0" },
    uploading:   { label: "uploading your moment...", sublabel: compressedSize ? `${fmtSize(compressedSize)} · ${Math.round((1 - compressedSize/originalSize)*100)}% smaller` : "", color: "#8ab4f8" },
    saving:      { label: "saving to your journal...", sublabel: "", color: "#a8e6c8" },
  };
  const s = stages[stage] || stages.uploading;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,padding:"8px 0"}}>
      <div style={{fontSize:12,color:"rgba(237,233,224,0.6)"}}>{s.label}</div>
      <div style={{width:"100%",height:3,background:"rgba(255,255,255,0.07)",borderRadius:4,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${stage==="saving"?100:progress}%`,background:`linear-gradient(90deg,${s.color},#8ab4f8)`,borderRadius:4,transition:"width 0.25s"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",width:"100%"}}>
        <div style={{fontSize:10,color:"rgba(237,233,224,0.28)"}}>{s.sublabel}</div>
        <div style={{fontSize:10,color:"rgba(237,233,224,0.28)"}}>{stage==="saving"?"✓":stage==="compressing"?`${progress}%`:`${progress}%`}</div>
      </div>
    </div>
  );
}

// ── Auth Screen ────────────────────────────────────────────────────────────
function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const googleSignIn = async () => {
    setError(""); setLoading(true);
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (e) { setError(friendlyError(e.code)); }
    setLoading(false);
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
    <div style={{minHeight:"100vh",background:"#090909",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,position:"relative",overflow:"hidden"}}>
      <Grain/>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(ellipse 65% 50% at 50% 25%, rgba(200,168,240,0.1) 0%,transparent 70%)"}}/>
      <div style={{position:"relative",width:"100%",maxWidth:350,animation:"slideUp 0.5s ease both"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontSize:10,letterSpacing:"0.32em",color:"rgba(237,233,224,0.25)",textTransform:"uppercase",marginBottom:6}}>your private journal</div>
          <h1 style={{margin:0,fontSize:44,fontWeight:400,fontFamily:"'Playfair Display',Georgia,serif",color:"#ede9e0",letterSpacing:"-0.02em",lineHeight:1}}>momentz</h1>
          <div style={{marginTop:9,fontSize:12,color:"rgba(237,233,224,0.28)",fontStyle:"italic",fontFamily:"'Playfair Display',Georgia,serif"}}>just for you</div>
        </div>
        <div style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(237,233,224,0.08)",borderRadius:18,padding:24,backdropFilter:"blur(12px)"}}>
          <button onClick={googleSignIn} disabled={loading} style={{width:"100%",padding:"12px",borderRadius:12,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.11)",color:"#ede9e0",fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:14,transition:"background 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.12)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.07)"}>
            <svg width="15" height="15" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            continue with google
          </button>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <div style={{flex:1,height:1,background:"rgba(237,233,224,0.07)"}}/>
            <span style={{fontSize:9,color:"rgba(237,233,224,0.22)",letterSpacing:"0.12em",textTransform:"uppercase"}}>or</span>
            <div style={{flex:1,height:1,background:"rgba(237,233,224,0.07)"}}/>
          </div>
          {mode !== "reset" ? (
            <>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(237,233,224,0.09)",borderRadius:10,padding:"11px 13px",color:"#ede9e0",fontSize:12,fontFamily:"inherit",outline:"none",marginBottom:8,boxSizing:"border-box"}}/>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&emailAuth()} placeholder="password" style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(237,233,224,0.09)",borderRadius:10,padding:"11px 13px",color:"#ede9e0",fontSize:12,fontFamily:"inherit",outline:"none",marginBottom:12,boxSizing:"border-box"}}/>
              {error && <div style={{fontSize:11,color:"rgba(255,140,140,0.82)",marginBottom:10,textAlign:"center"}}>{error}</div>}
              <button onClick={emailAuth} disabled={loading} style={{width:"100%",padding:"12px",borderRadius:12,background:"linear-gradient(135deg,rgba(200,168,240,0.26),rgba(138,180,248,0.26))",border:"1px solid rgba(200,168,240,0.28)",color:"#ede9e0",fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:500,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {loading ? <Spinner size={16}/> : (mode==="login" ? "sign in ✦" : "create account ✦")}
              </button>
              <div style={{marginTop:14,display:"flex",justifyContent:"center",gap:18}}>
                <button onClick={()=>{setMode(mode==="login"?"signup":"login");setError("");}} style={{background:"none",border:"none",color:"rgba(237,233,224,0.35)",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                  {mode==="login" ? "create account" : "back to sign in"}
                </button>
                {mode==="login" && <button onClick={()=>{setMode("reset");setError("");}} style={{background:"none",border:"none",color:"rgba(237,233,224,0.25)",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>forgot password</button>}
              </div>
            </>
          ) : resetSent ? (
            <div style={{textAlign:"center",padding:"8px 0"}}>
              <div style={{fontSize:34,marginBottom:10}}>📬</div>
              <div style={{fontSize:12,color:"rgba(237,233,224,0.6)",marginBottom:14}}>reset link sent to {email}</div>
              <button onClick={()=>{setMode("login");setResetSent(false);}} style={{background:"none",border:"none",color:"rgba(200,168,240,0.65)",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>← back to sign in</button>
            </div>
          ) : (
            <>
              <div style={{fontSize:11,color:"rgba(237,233,224,0.4)",marginBottom:12,textAlign:"center"}}>enter your email and we'll send a reset link</div>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(237,233,224,0.09)",borderRadius:10,padding:"11px 13px",color:"#ede9e0",fontSize:12,fontFamily:"inherit",outline:"none",marginBottom:10,boxSizing:"border-box"}}/>
              {error && <div style={{fontSize:11,color:"rgba(255,140,140,0.82)",marginBottom:10,textAlign:"center"}}>{error}</div>}
              <button onClick={resetPassword} disabled={loading} style={{width:"100%",padding:"12px",borderRadius:12,background:"linear-gradient(135deg,rgba(200,168,240,0.22),rgba(138,180,248,0.22))",border:"1px solid rgba(200,168,240,0.26)",color:"#ede9e0",fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {loading ? <Spinner size={16}/> : "send reset link"}
              </button>
              <div style={{marginTop:12,textAlign:"center"}}>
                <button onClick={()=>{setMode("login");setError("");}} style={{background:"none",border:"none",color:"rgba(237,233,224,0.28)",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>← back to sign in</button>
              </div>
            </>
          )}
        </div>
        <div style={{marginTop:16,textAlign:"center",fontSize:9,color:"rgba(237,233,224,0.15)",letterSpacing:"0.1em",textTransform:"uppercase"}}>your moments are private · only you can see them</div>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=DM+Mono:wght@300;400&display=swap');
        *{box-sizing:border-box} input::placeholder{color:rgba(237,233,224,0.2)}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(undefined);
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [view, setView] = useState("grid");
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [stream, setStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [selectedMood, setSelectedMood] = useState("");
  const [note, setNote] = useState("");
  const [camError, setCamError] = useState(null);

  // upload pipeline state
  const [uploadStage, setUploadStage] = useState(null); // null | "compressing" | "uploading" | "saving"
  const [uploadProgress, setUploadProgress] = useState(0);
  const [originalSize, setOriginalSize] = useState(null);
  const [compressedSize, setCompressedSize] = useState(null);

  const [filterMood, setFilterMood] = useState("all");
  const [showDelete, setShowDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const videoRef = useRef(null);
  const mrRef = useRef(null);
  const chunksRef = useRef([]);
  const elapsedRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u ?? null));
    return unsub;
  }, []);

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

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream, view]);

  const stopStream = useCallback(() => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
  }, [stream]);

  const openRecorder = async () => {
    setCamError(null); setPreviewBlob(null); setSelectedMood(""); setNote(""); setElapsed(0);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
      setStream(s); setView("record");
    } catch { setCamError("Camera access denied — please allow camera and microphone access."); }
  };

  const startCountdown = () => {
    setCountdown(3); let c = 3;
    const iv = setInterval(() => { c--; if (c<=0){clearInterval(iv);setCountdown(null);beginRecording();}else setCountdown(c); }, 1000);
  };

  const beginRecording = () => {
    chunksRef.current = [];
    const mr = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8,opus" });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => setPreviewBlob(new Blob(chunksRef.current, { type: "video/webm" }));
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
    xhr.upload.onprogress = e => { if (e.lengthComputable) setUploadProgress(Math.round(e.loaded/e.total*100)); };
    xhr.onload = () => xhr.status===200 ? resolve(JSON.parse(xhr.responseText)) : reject(new Error(xhr.responseText));
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(fd);
  });

  const generateThumbnail = (blob) => new Promise((resolve, reject) => {
    const vid = document.createElement("video");
    vid.src = URL.createObjectURL(blob); vid.muted = true; vid.currentTime = 0.5;
    vid.onloadeddata = () => {
      const c = document.createElement("canvas"); c.width=320; c.height=240;
      c.getContext("2d").drawImage(vid,0,0,320,240);
      resolve(c.toDataURL("image/jpeg",0.65)); URL.revokeObjectURL(vid.src);
    };
    vid.onerror = reject;
  });

  const saveEntry = async () => {
    if (!previewBlob || !user) return;

    const rawSize = previewBlob.size;
    setOriginalSize(rawSize);
    setCompressedSize(null);
    setUploadProgress(0);

    try {
      // ── Step 1: Compress ──
      setUploadStage("compressing");
      const toUpload = await compressVideo(previewBlob, (pct, orig, compressed) => {
        setUploadProgress(pct);
        if (compressed !== null) setCompressedSize(compressed);
      });
      setCompressedSize(toUpload.size);

      // ── Step 2: Upload to Cloudinary ──
      setUploadStage("uploading");
      setUploadProgress(0);
      const cld = await uploadToCloudinary(toUpload);

      // ── Step 3: Save metadata to Firestore ──
      setUploadStage("saving");
      let thumbnail = null;
      try { thumbnail = await generateThumbnail(previewBlob); } catch {}

      const entry = {
        createdAt: serverTimestamp(),
        duration: elapsed,
        mood: selectedMood,
        note: note.trim(),
        videoURL: cld.secure_url,
        cloudinaryPublicId: cld.public_id,
        thumbnail,
        originalSizeBytes: rawSize,
        compressedSizeBytes: toUpload.size,
      };
      const ref = await addDoc(collection(db, "users", user.uid, "entries"), entry);
      setEntries(prev => [{ id: ref.id, ...entry, createdAt: { toDate: () => new Date() } }, ...prev]);
      stopStream(); setView("grid"); setPreviewBlob(null);
    } catch (e) {
      console.error(e);
      alert("Save failed: " + e.message);
    }
    setUploadStage(null);
  };

  const deleteEntry = async (entry) => {
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "users", user.uid, "entries", entry.id));
      setEntries(prev => prev.filter(e => e.id !== entry.id));
      setShowDelete(null);
      if (selectedEntry?.id === entry.id) { setSelectedEntry(null); setView("grid"); }
    } catch (e) { alert("Delete failed: " + e.message); }
    setDeleting(false);
  };

  const discard = () => { stopStream(); setPreviewBlob(null); setView("grid"); };
  const filteredEntries = filterMood === "all" ? entries : entries.filter(e => e.mood === filterMood);
  const usedMoods = [...new Set(entries.map(e => e.mood).filter(Boolean))];
  const isUploading = uploadStage !== null;

  if (user === undefined) return (
    <div style={{minHeight:"100vh",background:"#090909",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <div style={{fontSize:22,fontFamily:"'Playfair Display',Georgia,serif",color:"rgba(237,233,224,0.4)"}}>momentz</div>
      <Spinner size={28} color="#c8a8f0"/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user) return <AuthScreen/>;

  return (
    <div style={{minHeight:"100vh",background:"#090909",color:"#ede9e0",fontFamily:"'DM Mono','Courier New',monospace",position:"relative",overflowX:"hidden"}}>
      <Grain/>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,background:"radial-gradient(ellipse 55% 35% at 15% 8%, rgba(200,168,240,0.08) 0%,transparent 70%), radial-gradient(ellipse 45% 45% at 85% 92%, rgba(80,180,220,0.055) 0%,transparent 70%)"}}/>
      <div style={{position:"relative",zIndex:1,maxWidth:480,margin:"0 auto",minHeight:"100vh",paddingBottom:96}}>

        {/* ════ GRID ════ */}
        {view === "grid" && <>
          <div style={{padding:"28px 20px 14px",borderBottom:"1px solid rgba(237,233,224,0.07)"}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:9,letterSpacing:"0.3em",color:"rgba(237,233,224,0.28)",textTransform:"uppercase",marginBottom:3}}>private journal</div>
                <h1 style={{margin:0,fontSize:31,fontWeight:400,letterSpacing:"-0.03em",fontFamily:"'Playfair Display',Georgia,serif",color:"#ede9e0",lineHeight:1}}>momentz</h1>
                <div style={{marginTop:5,fontSize:10,color:"rgba(237,233,224,0.25)"}}>{entries.length} {entries.length===1?"memory":"memories"} · {user.displayName||user.email}</div>
              </div>
              <button onClick={()=>signOut(auth)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(237,233,224,0.35)",borderRadius:20,padding:"6px 12px",fontSize:9,cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.12em",textTransform:"uppercase",marginTop:5}}>sign out</button>
            </div>
          </div>

          {usedMoods.length > 0 && (
            <div style={{padding:"10px 20px",display:"flex",gap:7,overflowX:"auto",scrollbarWidth:"none"}}>
              {["all",...usedMoods].map(m => (
                <button key={m} onClick={()=>setFilterMood(m)} style={{background:filterMood===m?"rgba(237,233,224,0.1)":"transparent",border:"1px solid",borderColor:filterMood===m?"rgba(237,233,224,0.24)":"rgba(237,233,224,0.08)",color:filterMood===m?"#ede9e0":"rgba(237,233,224,0.38)",borderRadius:20,padding:"5px 12px",fontSize:10,cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.18s",fontFamily:"inherit"}}>
                  {m==="all"?"all moods":m}
                </button>
              ))}
            </div>
          )}

          {camError && <div style={{margin:"8px 20px",padding:12,background:"rgba(255,80,80,0.07)",border:"1px solid rgba(255,80,80,0.16)",borderRadius:10,fontSize:11,color:"rgba(255,150,150,0.82)"}}>{camError}</div>}

          {loadingEntries ? (
            <div style={{padding:70,display:"flex",justifyContent:"center"}}><Spinner/></div>
          ) : filteredEntries.length === 0 ? (
            <div style={{padding:"72px 20px",textAlign:"center"}}>
              <div style={{fontSize:46,marginBottom:14}}>🎞</div>
              <div style={{fontSize:16,color:"rgba(237,233,224,0.35)",fontFamily:"'Playfair Display',Georgia,serif",fontStyle:"italic"}}>{entries.length===0?"your first moment is waiting":"no entries for this mood"}</div>
              <div style={{fontSize:10,color:"rgba(237,233,224,0.18)",marginTop:8,letterSpacing:"0.05em"}}>tap the button below to begin</div>
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:2,padding:"4px 2px"}}>
              {filteredEntries.map((entry,i) => (
                <div key={entry.id} onClick={()=>{setSelectedEntry(entry);setView("playback");}} style={{aspectRatio:"9/16",position:"relative",cursor:"pointer",overflow:"hidden",background:"#111",animation:`fadeUp 0.35s ease ${i*0.024}s both`}}>
                  {entry.thumbnail
                    ? <img src={entry.thumbnail} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                    : <div style={{width:"100%",height:"100%",background:`hsl(${(entry.id?.charCodeAt(0)||0)*11%360},16%,13%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🎞</div>
                  }
                  <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.75) 0%,transparent 52%)"}}/>
                  <div style={{position:"absolute",bottom:5,left:5,right:5}}>
                    {entry.mood && <div style={{fontSize:8,color:"rgba(255,255,255,0.6)",marginBottom:1}}>{entry.mood}</div>}
                    <div style={{fontSize:8,color:"rgba(255,255,255,0.38)"}}>{fmtDate(entry.createdAt)}</div>
                  </div>
                  <div style={{position:"absolute",top:5,right:5,background:"rgba(0,0,0,0.5)",borderRadius:4,padding:"2px 5px",fontSize:8,color:"rgba(255,255,255,0.6)"}}>{fmtDur(entry.duration)}</div>
                  {/* Show compression savings badge if available */}
                  {entry.originalSizeBytes && entry.compressedSizeBytes && entry.originalSizeBytes > entry.compressedSizeBytes && (
                    <div style={{position:"absolute",top:5,left:5,background:"rgba(0,0,0,0.5)",borderRadius:4,padding:"2px 5px",fontSize:7,color:"rgba(168,230,200,0.8)"}}>
                      -{Math.round((1-entry.compressedSizeBytes/entry.originalSizeBytes)*100)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <button onClick={openRecorder} style={{position:"fixed",bottom:26,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(135deg,#c8a8f0 0%,#8ab4f8 100%)",border:"none",borderRadius:50,width:62,height:62,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:22,boxShadow:"0 4px 28px rgba(180,120,255,0.3)",transition:"transform 0.15s,box-shadow 0.15s",zIndex:100}}
            onMouseEnter={e=>e.currentTarget.style.transform="translateX(-50%) scale(1.09)"}
            onMouseLeave={e=>e.currentTarget.style.transform="translateX(-50%) scale(1)"}>⏺</button>
        </>}

        {/* ════ RECORD ════ */}
        {view === "record" && (
          <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",background:"#000"}}>
            <div style={{padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"absolute",top:0,left:0,right:0,zIndex:10}}>
              <button onClick={discard} style={{background:"rgba(0,0,0,0.45)",border:"1px solid rgba(255,255,255,0.13)",color:"#ede9e0",borderRadius:20,padding:"6px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✕ cancel</button>
              {recording && (
                <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(210,45,45,0.85)",borderRadius:20,padding:"5px 12px"}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:"#fff",animation:"blink 1s infinite"}}/>
                  <span style={{fontSize:12,color:"#fff",fontFamily:"inherit"}}>{fmtDur(elapsed)}</span>
                </div>
              )}
            </div>

            <div style={{flex:1,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {!previewBlob
                ? <video ref={videoRef} autoPlay muted playsInline style={{width:"100%",height:"100vh",objectFit:"cover",display:"block"}}/>
                : <video src={URL.createObjectURL(previewBlob)} controls playsInline style={{width:"100%",height:"62vh",objectFit:"contain",background:"#000"}}/>
              }
              {countdown !== null && (
                <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:108,fontFamily:"'Playfair Display',Georgia,serif",color:"rgba(255,255,255,0.9)",textShadow:"0 0 40px rgba(180,120,255,0.5)",animation:"popIn 0.7s ease"}}>{countdown}</div>
              )}
            </div>

            <div style={{background:"rgba(0,0,0,0.94)",borderTop:"1px solid rgba(255,255,255,0.055)",padding:"18px 20px 30px",backdropFilter:"blur(20px)"}}>
              {isUploading ? (
                <UploadProgress stage={uploadStage} progress={uploadProgress} originalSize={originalSize} compressedSize={compressedSize}/>
              ) : !previewBlob ? (
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <MoodPicker value={selectedMood} onChange={setSelectedMood}/>
                  <div style={{display:"flex",justifyContent:"center",paddingTop:4}}>
                    {!recording
                      ? <button onClick={startCountdown} style={{width:68,height:68,borderRadius:"50%",background:"linear-gradient(135deg,#c8a8f0,#8ab4f8)",border:"none",cursor:"pointer",fontSize:24,boxShadow:"0 0 26px rgba(180,120,255,0.36)",transition:"transform 0.15s"}} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.07)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>⏺</button>
                      : <button onClick={stopRecording} style={{width:68,height:68,borderRadius:"50%",background:"rgba(210,45,45,0.92)",border:"none",cursor:"pointer",fontSize:24,animation:"recPulse 1.6s ease infinite"}}>⏹</button>
                    }
                  </div>
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{fontSize:11,color:"rgba(237,233,224,0.45)"}}>happy with this?</div>
                    <div style={{fontSize:10,color:"rgba(237,233,224,0.28)"}}>{fmtSize(previewBlob.size)}</div>
                  </div>
                  <MoodPicker value={selectedMood} onChange={setSelectedMood}/>
                  <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="a note to your future self... (optional)" rows={2} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"10px 12px",color:"#ede9e0",fontSize:12,fontFamily:"inherit",resize:"none",outline:"none"}}/>
                  {previewBlob.size > COMPRESS_THRESHOLD_MB * 1024 * 1024 && (
                    <div style={{fontSize:10,color:"rgba(168,230,200,0.6)",textAlign:"center",letterSpacing:"0.04em"}}>
                      ✦ will be compressed before upload
                    </div>
                  )}
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>setPreviewBlob(null)} style={{flex:1,padding:"11px",borderRadius:11,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(237,233,224,0.6)",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>re-record</button>
                    <button onClick={saveEntry} style={{flex:2,padding:"11px",borderRadius:11,background:"linear-gradient(135deg,rgba(200,168,240,0.22),rgba(138,180,248,0.22))",border:"1px solid rgba(200,168,240,0.3)",color:"#ede9e0",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:500}}>save to momentz ✦</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════ PLAYBACK ════ */}
        {view === "playback" && selectedEntry && (
          <div style={{minHeight:"100vh",background:"#000",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"absolute",top:0,left:0,right:0,zIndex:10,background:"linear-gradient(to bottom,rgba(0,0,0,0.68),transparent)"}}>
              <button onClick={()=>{setView("grid");setSelectedEntry(null);}} style={{background:"rgba(0,0,0,0.42)",border:"1px solid rgba(255,255,255,0.13)",color:"#ede9e0",borderRadius:20,padding:"6px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>← back</button>
              <button onClick={()=>setShowDelete(selectedEntry)} style={{background:"rgba(200,45,45,0.16)",border:"1px solid rgba(200,45,45,0.26)",color:"rgba(255,140,140,0.82)",borderRadius:20,padding:"6px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>delete</button>
            </div>
            <video src={selectedEntry.videoURL} controls playsInline style={{width:"100%",height:"68vh",objectFit:"contain",background:"#000"}}/>
            <div style={{flex:1,padding:"22px 20px",background:"#090909"}}>
              <div style={{fontSize:9,letterSpacing:"0.22em",color:"rgba(237,233,224,0.26)",textTransform:"uppercase",marginBottom:6}}>{fmtDate(selectedEntry.createdAt)} · {fmtTime(selectedEntry.createdAt)}</div>
              {selectedEntry.mood && <div style={{display:"inline-block",background:"rgba(200,168,240,0.08)",border:"1px solid rgba(200,168,240,0.2)",color:"#c8a8f0",borderRadius:20,padding:"4px 12px",fontSize:11,marginBottom:14}}>{selectedEntry.mood}</div>}
              {selectedEntry.note && <div style={{fontSize:14,lineHeight:1.68,color:"rgba(237,233,224,0.7)",fontStyle:"italic",borderLeft:"2px solid rgba(200,168,240,0.26)",paddingLeft:14}}>"{selectedEntry.note}"</div>}
              <div style={{marginTop:14,fontSize:10,color:"rgba(237,233,224,0.2)"}}>{fmtDur(selectedEntry.duration)} long
                {selectedEntry.originalSizeBytes && selectedEntry.compressedSizeBytes && selectedEntry.originalSizeBytes > selectedEntry.compressedSizeBytes && (
                  <span style={{marginLeft:10,color:"rgba(168,230,200,0.5)"}}>· saved {Math.round((1-selectedEntry.compressedSizeBytes/selectedEntry.originalSizeBytes)*100)}% storage</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════ DELETE CONFIRM ════ */}
        {showDelete && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.74)",backdropFilter:"blur(10px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:24}}>
            <div style={{background:"#111",border:"1px solid rgba(237,233,224,0.08)",borderRadius:16,padding:26,maxWidth:300,width:"100%",textAlign:"center",animation:"popIn 0.25s ease"}}>
              <div style={{fontSize:36,marginBottom:12}}>🗑</div>
              <div style={{fontSize:15,fontFamily:"'Playfair Display',Georgia,serif",marginBottom:8}}>Delete this moment?</div>
              <div style={{fontSize:11,color:"rgba(237,233,224,0.38)",marginBottom:22,lineHeight:1.6}}>This will be removed from your journal forever.</div>
              <div style={{display:"flex",gap:9}}>
                <button onClick={()=>setShowDelete(null)} disabled={deleting} style={{flex:1,padding:"11px",borderRadius:10,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",color:"#ede9e0",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>keep it</button>
                <button onClick={()=>deleteEntry(showDelete)} disabled={deleting} style={{flex:1,padding:"11px",borderRadius:10,background:"rgba(200,45,45,0.14)",border:"1px solid rgba(200,45,45,0.26)",color:"rgba(255,140,140,0.85)",fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {deleting ? <Spinner size={15} color="rgba(255,140,140,0.7)"/> : "delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=DM+Mono:wght@300;400&display=swap');
        *{box-sizing:border-box} ::-webkit-scrollbar{display:none}
        textarea::placeholder{color:rgba(237,233,224,0.2)} video{outline:none}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes recPulse{0%,100%{box-shadow:0 0 0 0 rgba(210,45,45,0.4)}50%{box-shadow:0 0 0 14px rgba(210,45,45,0)}}
        @keyframes popIn{from{transform:scale(0.92) translateY(8px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
      `}</style>
    </div>
  );
}
