import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Atom,
  BookOpen, Brain, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, Clock3, Code2, Compass, Copy, GraduationCap, Hash, Home,
  Lightbulb, LogOut, Menu, MessageCircle, Moon, Plus, RefreshCw, Send,
  Settings2, ShieldCheck, Sparkles, Sun, Target, Users, X, Zap
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

const SUBJECTS = [
  { name: "Computer Science", icon: Code2, color: "violet", subtitle: "Logic, structures & algorithms" },
  { name: "Mathematics", icon: Hash, color: "mint", subtitle: "Numbers, patterns & reasoning" },
  { name: "Physics", icon: Atom, color: "peach", subtitle: "Forces, energy & electricity" },
  { name: "Biology", icon: Activity, color: "yellow", subtitle: "Cells, systems & life" },
];
const NAV = [
  ["dashboard", "Overview", Home],
  ["practice", "Practice studio", BookOpen],
  ["tutor", "AI study buddy", Sparkles],
  ["groups", "Study groups", Users],
  ["progress", "My progress", Activity],
];
const cx = (...parts) => parts.filter(Boolean).join(" ");

function friendlyError(error) {
  const message = error?.message || "Something went wrong. Please try again.";
  if (/Invalid login credentials/i.test(message)) return "That email and password combination wasn't recognised.";
  if (/Email not confirmed/i.test(message)) return "Please verify your email before signing in.";
  if (/Failed to fetch/i.test(message)) return "Couldn't reach the backend. Check your connection and Supabase configuration.";
  return message;
}
function initials(name = "Student") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0].toUpperCase()).join("") || "S";
}
function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }

function ConfigScreen() {
  return <div className="setup-screen">
    <div className="setup-card">
      <div className="brand large"><span className="brand-symbol"><Sparkles size={19}/></span>thinkwise<span className="brand-period">.</span></div>
      <div className="eyebrow">ONE LAST SETUP STEP</div>
      <h1>Connect your learning space.</h1>
      <p>Thinkwise Product uses Supabase for accounts, database storage, and live collaboration. Add your project values to <code>.env.local</code> to start.</p>
      <pre>VITE_SUPABASE_URL=…{"\n"}VITE_SUPABASE_ANON_KEY=…</pre>
      <p className="small-muted">Follow the included README. Never put a service-role key or Gemini API key in frontend environment variables.</p>
    </div>
  </div>;
}

function ResetPasswordScreen({ onDone }) {
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  async function submit(e){
    e.preventDefault();setError("");setNotice("");
    if(password.length<8){setError("Use a password with at least 8 characters.");return;}
    if(password!==confirm){setError("The passwords do not match.");return;}
    setBusy(true);
    const {error:err}=await supabase.auth.updateUser({password});
    setBusy(false);
    if(err)setError(friendlyError(err));
    else setNotice("Password updated. You can continue to your learning space.");
  }
  return <div className="setup-screen"><div className="setup-card"><div className="brand large"><span className="brand-symbol"><Sparkles size={19}/></span>thinkwise<span className="brand-period">.</span></div><div className="eyebrow">ACCOUNT SECURITY</div><h1>Choose a new password.</h1><p>Use at least 8 characters for your Thinkwise account.</p><form className="auth-form" onSubmit={submit}><label>New password<input type="password" required minLength="8" value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Confirm password<input type="password" required minLength="8" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>{error&&<div className="alert error">{error}</div>}{notice&&<div className="alert success">{notice}</div>}<button className="button primary full" disabled={busy||!!notice}>{busy?"Updating…":notice?"Password updated":"Update password"} <ArrowRight size={15}/></button>{notice&&<button type="button" className="button secondary full" onClick={onDone}>Continue to Thinkwise</button>}</form></div></div>;
}

function AuthScreen() {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      if (mode === "signup") {
        if (password.length < 8) throw new Error("Use a password with at least 8 characters.");
        const { data, error: err } = await supabase.auth.signUp({
          email, password, options: { data: { full_name: name.trim() } }
        });
        if (err) throw err;
        if (!data.session) setNotice("Account created. Check your email for the verification link, then sign in.");
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
    } catch (err) { setError(friendlyError(err)); }
    finally { setBusy(false); }
  }

  async function resetPassword() {
    if (!email) { setError("Enter your email address first."); return; }
    setBusy(true); setError(""); setNotice("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    if (err) setError(friendlyError(err));
    else setNotice("Password reset instructions have been sent if an account exists for that email.");
    setBusy(false);
  }

  return <div className="auth-layout">
    <div className="auth-story">
      <div className="brand light"><span className="brand-symbol"><Sparkles size={19}/></span>thinkwise<span className="brand-period">.</span></div>
      <div className="story-main">
        <div className="eyebrow light-eyebrow"><span className="pulse"/> LEARN WITH INTENTION</div>
        <h1>Make room for<br/><em>better thinking.</em></h1>
        <p>Practice with purpose. Get a hint when you're stuck. Build understanding that lasts beyond the exam.</p>
        <div className="story-orbit"><div className="orbit-ring one"/><div className="orbit-ring two"/><div className="orbit-center"><Sparkles size={36}/></div><span className="orbit-word w1">TRY</span><span className="orbit-word w2">THINK</span><span className="orbit-word w3">GROW</span></div>
      </div>
      <div className="story-foot">A learning space built around the student, not the shortcut.</div>
    </div>
    <div className="auth-main">
      <div className="auth-box">
        <div className="mobile-brand brand"><span className="brand-symbol"><Sparkles size={18}/></span>thinkwise<span className="brand-period">.</span></div>
        <div className="eyebrow">{mode === "signin" ? "WELCOME BACK" : "YOUR NEXT CHAPTER STARTS HERE"}</div>
        <h2>{mode === "signin" ? "Sign in to Thinkwise" : "Create your account"}</h2>
        <p className="muted">{mode === "signin" ? "Pick up where your curiosity left off." : "A little practice today goes a long way."}</p>
        <form onSubmit={submit} className="auth-form">
          {mode === "signup" && <label>Full name<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" autoComplete="name"/></label>}
          <label>Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></label>
          <label>Password<input required minLength="8" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={mode==="signup"?"new-password":"current-password"}/></label>
          {mode === "signin" && <button type="button" className="link-button forgot" onClick={resetPassword}>Forgot password?</button>}
          {error && <div className="alert error">{error}</div>}
          {notice && <div className="alert success">{notice}</div>}
          <button className="button primary full" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"} <ArrowRight size={16}/></button>
        </form>
        <div className="auth-switch">{mode === "signin" ? "New to Thinkwise?" : "Already have an account?"} <button className="link-button" onClick={()=>{setMode(mode==="signin"?"signup":"signin");setError("");setNotice("");}}>{mode==="signin"?"Create an account":"Sign in"}</button></div>
        <div className="auth-privacy"><ShieldCheck size={14}/> Your learning data is private to your account.</div>
      </div>
    </div>
  </div>;
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(localStorage.getItem("thinkwise-theme") === "dark");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const notify = useCallback((message) => {
    setToast(message); clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      setSession(next);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) { setProfile(null); setLoading(false); return; }
    let alive = true;
    (async () => {
      const { data, error } = await supabase.from("profiles").select("id,full_name,role,created_at").eq("id", session.user.id).single();
      if (alive) {
        if (error) notify("Couldn't load your profile: " + friendlyError(error));
        setProfile(data || { id: session.user.id, full_name: session.user.user_metadata?.full_name || session.user.email, role: "student" });
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [session, notify]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("thinkwise-theme", dark ? "dark" : "light");
  }, [dark]);

  async function signOut() { await supabase.auth.signOut(); setPage("dashboard"); }

  if (!isSupabaseConfigured) return <ConfigScreen/>;
  if (loading) return <div className="loading-screen"><div className="loader-mark"><Sparkles size={23}/></div><span>Preparing your learning space…</span></div>;
  if (passwordRecovery && session) return <ResetPasswordScreen onDone={()=>setPasswordRecovery(false)}/>;
  if (!session) return <AuthScreen/>;

  const displayName = profile?.full_name || session.user.email?.split("@")[0] || "Student";
  const go = (next) => { setPage(next); setMobileOpen(false); window.scrollTo({top:0,behavior:"smooth"}); };

  return <div className="app-shell">
    <aside className={cx("sidebar", mobileOpen && "open")}>
      <div className="sidebar-brand"><div className="brand"><span className="brand-symbol"><Sparkles size={18}/></span>thinkwise<span className="brand-period">.</span></div><button className="icon-button mobile-close" onClick={()=>setMobileOpen(false)}><X size={17}/></button></div>
      <div className="side-label">YOUR WORKSPACE</div>
      <nav className="side-nav">
        {NAV.map(([id,label,Icon]) => <button key={id} onClick={()=>go(id)} className={cx("nav-item",page===id&&"active")}><Icon size={17}/><span>{label}</span>{id==="tutor"&&<i>BETA</i>}</button>)}
        {profile?.role === "teacher" && <><div className="side-divider"/><div className="side-label compact">EDUCATOR</div><button onClick={()=>go("teacher")} className={cx("nav-item",page==="teacher"&&"active")}><GraduationCap size={17}/><span>Teacher space</span></button></>}
      </nav>
      <div className="sidebar-bottom">
        <div className="side-promo"><Sparkles size={17}/><strong>Small steps. Real progress.</strong><p>Build the habit of thinking things through.</p></div>
        <div className="user-card"><span className="avatar">{initials(displayName)}</span><span className="user-meta"><b>{displayName}</b><small>{profile?.role === "teacher" ? "Educator account" : "Student account"}</small></span><button title="Sign out" className="icon-button subtle" onClick={signOut}><LogOut size={15}/></button></div>
      </div>
    </aside>
    {mobileOpen && <button aria-label="Close menu" className="mobile-scrim" onClick={()=>setMobileOpen(false)}/>}
    <main className="main">
      <header className="topbar">
        <div className="topbar-left"><button className="icon-button menu-button" onClick={()=>setMobileOpen(true)}><Menu size={18}/></button><span className="breadcrumb">Workspace <b>/</b> <strong>{({dashboard:"Overview",practice:"Practice studio",tutor:"AI study buddy",groups:"Study groups",progress:"My progress",teacher:"Teacher space"})[page]}</strong></span></div>
        <div className="topbar-right"><span className="secure-label"><span className="pulse"/> SYNCED WORKSPACE</span><button className="icon-button" onClick={()=>setDark(x=>!x)} aria-label="Toggle colour theme">{dark?<Sun size={17}/>:<Moon size={17}/>}</button><span className="avatar mini-avatar">{initials(displayName)}</span></div>
      </header>
      <div className="page-wrap">
        {page==="dashboard" && <Dashboard user={displayName} notify={notify} go={go}/>}
        {page==="practice" && <Practice notify={notify}/>}
        {page==="tutor" && <Tutor notify={notify}/>}
        {page==="groups" && <Groups user={session.user} notify={notify}/>}
        {page==="progress" && <Progress/>}
        {page==="teacher" && <Teacher profile={profile} notify={notify}/>}
        <footer className="footer"><span><b>thinkwise<span className="brand-period">.</span></b> Learn by thinking.</span><span>Secure learning workspace · v1.0</span></footer>
      </div>
    </main>
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}

function PageIntro({eyebrow,title,description,action}) {
  return <div className="page-intro"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="muted">{description}</p></div>{action}</div>;
}

function Dashboard({user,notify,go}) {
  const [stats,setStats]=useState({attempts:[],questions:[]});
  const [busy,setBusy]=useState(true);
  const load=useCallback(async()=>{
    setBusy(true);
    const [a,q]=await Promise.all([
      supabase.from("attempts").select("id,subject,is_correct,created_at").order("created_at",{ascending:false}).limit(500),
      supabase.from("questions").select("id,subject").eq("is_active",true)
    ]);
    if(a.error||q.error) notify(friendlyError(a.error||q.error));
    setStats({attempts:a.data||[],questions:q.data||[]});setBusy(false);
  },[notify]);
  useEffect(()=>{load();},[load]);
  const correct=stats.attempts.filter(x=>x.is_correct).length;
  const accuracy=pct(correct,stats.attempts.length);
  const subjectStats=SUBJECTS.map(s=>{
    const rows=stats.attempts.filter(a=>a.subject===s.name);
    return {...s,count:rows.length,accuracy:pct(rows.filter(a=>a.is_correct).length,rows.length)};
  });
  const focus=[...subjectStats].sort((a,b)=>(a.count?a.accuracy:101)-(b.count?b.accuracy:101)).slice(0,3);
  return <>
    <div className="welcome-row"><div><div className="eyebrow"><span className="pulse"/> YOUR LEARNING SPACE</div><h1>Good to see you, {user.split(" ")[0]}<span className="sparkle-inline">✳</span></h1><p className="muted">Ready to make today count? Let's keep that curiosity going.</p></div><button className="button primary" onClick={()=>go("practice")}>Start learning <ArrowUpRight size={16}/></button></div>
    <section className="hero-card"><div className="hero-copy"><span className="hero-kicker">YOUR NEXT STEP</span><h2>Understand more.<br/><em>Memorise less.</em></h2><p>Practice at your pace. Get a nudge when you're stuck, not the answer straight away.</p><button className="button light" onClick={()=>go("practice")}>Continue learning <ArrowRight size={15}/></button></div><HeroArt/><span className="hero-caption">01 — LEARN WITH INTENTION</span></section>
    <div className="stats-grid">
      <Stat label="Questions attempted" value={busy?"—":stats.attempts.length} icon={BookOpen} tone="violet" foot="Across all subjects"/>
      <Stat label="Accuracy" value={busy?"—":stats.attempts.length?`${accuracy}%`:"—"} icon={Target} tone="mint" foot="Based on submitted attempts"/>
      <Stat label="Subjects practised" value={subjectStats.filter(s=>s.count).length} icon={Compass} tone="peach" foot="Keep exploring"/>
      <Stat label="Question bank" value={stats.questions.length} icon={Sparkles} tone="yellow" foot="Available practice questions"/>
    </div>
    <div className="two-col">
      <section className="panel"><div className="section-head"><div><div className="eyebrow">PICK UP WHERE YOU LEFT OFF</div><h3>Your subjects</h3></div><button className="text-button" onClick={()=>go("practice")}>All subjects <ArrowUpRight size={13}/></button></div>
        <div className="subject-list">{subjectStats.map(s=><div className="subject-row" key={s.name}><SubjectIcon subject={s}/><div className="subject-info"><b>{s.name}</b><small>{s.count?`${s.count} attempts`:"Ready when you are"}</small><div className="bar-track"><span style={{width:`${s.accuracy}%`}}/></div></div><strong className="subject-score">{s.count?`${s.accuracy}%`:"NEW"}</strong></div>)}</div>
      </section>
      <section className="panel"><div className="section-head"><div><div className="eyebrow">YOUR FOCUS AREAS</div><h3>Where to grow next</h3></div><span className="live-badge">LIVE</span></div>
        <div className="focus-list">{focus.map(s=><div className="focus-row" key={s.name}><div><b>{s.name}</b><small>{s.count?`${s.accuracy}% accuracy so far`:"No attempts yet"}</small></div><span className="focus-chip">{s.count?(s.accuracy<60?"Practice more":"Keep building"):"Start here"}</span></div>)}</div>
        <div className="insight-callout"><Lightbulb size={17}/><p><b>Try this:</b> Attempt one question without hints before asking your study buddy. That's where stronger recall begins.</p></div>
      </section>
    </div>
    <div className="principle-note"><Sparkles size={17}/><b>Thinkwise principle</b><span>We measure understanding, not just how quickly you find an answer.</span></div>
  </>;
}
function HeroArt(){return <div className="hero-art"><div className="hero-orbit orbit-a"/><div className="hero-orbit orbit-b"/><div className="hero-core"><Sparkles size={34}/></div><span className="art-pill p1">TRY</span><span className="art-pill p2">THINK</span><span className="art-pill p3">GROW</span><i className="art-star s1">✦</i><i className="art-star s2">✧</i></div>}
function Stat({label,value,icon:Icon,tone,foot}){return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}><Icon size={15}/></span></div><strong>{value}</strong><small>{foot}</small></div>}
function SubjectIcon({subject}){const Icon=subject.icon;return <span className={`subject-icon ${subject.color}`}><Icon size={17}/></span>}

function Practice({notify}) {
  const [subject,setSubject]=useState("Computer Science");
  const [questions,setQuestions]=useState([]);
  const [index,setIndex]=useState(0);
  const [selected,setSelected]=useState(null);
  const [hint,setHint]=useState(false);
  const [result,setResult]=useState(null);
  const [answers,setAnswers]=useState([]);
  const [loading,setLoading]=useState(false);
  const [started,setStarted]=useState(false);
  const [summary,setSummary]=useState(null);

  async function start() {
    setLoading(true);setSummary(null);
    const {data:history}=await supabase.from("attempts").select("is_correct").eq("subject",subject).order("created_at",{ascending:false}).limit(20);
    const score=pct((history||[]).filter(x=>x.is_correct).length,(history||[]).length);
    const level=(history||[]).length<3?"easy":score<55?"easy":score>82?"hard":"medium";
    let {data,error}=await supabase.from("questions").select("id,subject,topic,prompt,options,difficulty,hint").eq("subject",subject).eq("is_active",true).eq("difficulty",level);
    if(!data?.length){const fallback=await supabase.from("questions").select("id,subject,topic,prompt,options,difficulty,hint").eq("subject",subject).eq("is_active",true);data=fallback.data;error=fallback.error;}
    setLoading(false);
    if(error){notify(friendlyError(error));return;}
    if(!data?.length){notify("No questions are available for this subject yet.");return;}
    const ordered=[...data].sort(()=>Math.random()-.5).slice(0,Math.min(5,data.length));
    setQuestions(ordered);setIndex(0);setSelected(null);setHint(false);setResult(null);setAnswers([]);setStarted(true);
  }
  const q=questions[index];
  async function submit() {
    if(selected===null||!q||result)return;
    setLoading(true);
    const {data,error}=await supabase.rpc("submit_attempt",{p_question_id:q.id,p_selected_index:selected,p_used_hint:hint});
    setLoading(false);
    if(error){notify(friendlyError(error));return;}
    setResult(data);setAnswers(prev=>[...prev,{correct:data.correct,usedHint:hint}]);
  }
  function next(){
    if(index===questions.length-1){setSummary({total:questions.length,correct:answers.length+(result?.correct?1:0),hints:answers.filter(x=>x.usedHint).length+(hint?1:0)});setStarted(false);return;}
    setIndex(i=>i+1);setSelected(null);setHint(false);setResult(null);
  }
  if(summary)return <><PageIntro eyebrow="PRACTICE COMPLETE" title="That's a session well spent." description="Every attempt is a signal. Use it to decide what to work on next."/><div className="panel result-card"><div className="result-ring">{pct(summary.correct,summary.total)}<small>%</small></div><h2>{summary.correct} of {summary.total} correct</h2><p>You used {summary.hints} hint(s). Your progress has been saved to your account.</p><div className="button-row"><button className="button secondary" onClick={()=>setSummary(null)}>Choose another subject</button><button className="button primary" onClick={start}>Practice again <ArrowRight size={15}/></button></div></div></>;
  return <>
    <PageIntro eyebrow="BUILD YOUR UNDERSTANDING" title="Practice studio" description="Questions adapt to your recent performance. Try first; the explanation comes after your attempt."/>
    {!started?<div className="practice-layout">
      <section className="panel practice-chooser"><div className="section-head"><div><div className="eyebrow">01 / CHOOSE A SUBJECT</div><h3>What are we studying?</h3></div><span className="live-badge">ADAPTIVE</span></div>
        <div className="choice-grid">{SUBJECTS.map(s=><button className={cx("subject-choice",subject===s.name&&"selected")} key={s.name} onClick={()=>setSubject(s.name)}><SubjectIcon subject={s}/><span><b>{s.name}</b><small>{s.subtitle}</small></span>{subject===s.name&&<CheckCircle2 size={16}/>}</button>)}</div>
        <div className="chooser-footer"><div><b>Adaptive starting level</b><p>Based on your recent attempts in this subject.</p></div><span className="adaptive-pill"><Zap size={13}/> Auto-selected</span></div>
        <button className="button primary full" disabled={loading} onClick={start}>{loading?"Preparing questions…":"Start a practice set"} <ArrowRight size={16}/></button>
        <p className="micro-center">Up to 5 questions · Hints available · Explanations after submission</p>
      </section>
      <section className="panel how-panel"><div className="eyebrow">A BETTER WAY TO LEARN</div><h2>First, <em>you</em> think.</h2>{[["01","Try it yourself","Attempt a question before revealing help."],["02","Ask for a hint","Get a nudge that points you in the right direction."],["03","Understand why","Review the explanation and learn from mistakes."]].map(x=><div className="how-step" key={x[0]}><span>{x[0]}</span><div><b>{x[1]}</b><p>{x[2]}</p></div></div>)}<div className="how-foot">No answer dumps. Just better thinking.</div></section>
    </div>:<section className="panel quiz-card">
      <div className="quiz-head"><div><div className="eyebrow">{q.subject.toUpperCase()} · {q.topic}</div><h3>Question {index+1} <span>of {questions.length}</span></h3></div><button className="text-button" onClick={()=>setStarted(false)}>Exit practice <X size={14}/></button></div>
      <div className="quiz-track"><span style={{width:`${(index+(result?1:0))/questions.length*100}%`}}/></div>
      <div className="quiz-tags"><span className="level-tag">{q.difficulty.toUpperCase()}</span><span>CONCEPT & REASONING</span></div>
      <h2 className="question-prompt">{q.prompt}</h2>
      <div className="options-grid">{(q.options||[]).map((opt,i)=><button disabled={!!result} key={i} onClick={()=>setSelected(i)} className={cx("answer-option",selected===i&&"selected",result&&i===result.correct_index&&"correct",result&&selected===i&&!result.correct&&"incorrect")}><span>{String.fromCharCode(65+i)}</span>{opt}{result&&i===result.correct_index&&<Check size={16}/>}</button>)}</div>
      <div className="hint-row"><button className="hint-control" disabled={hint} onClick={()=>setHint(true)}><Lightbulb size={15}/>{hint?"Hint revealed":"Need a hint?"}</button>{hint&&<p>{q.hint}</p>}</div>
      {result&&<div className={cx("answer-feedback",result.correct?"right":"wrong")}><b>{result.correct?"That's it. Nice thinking!":"Good attempt. Learn from it."}</b><p>{result.explanation}</p></div>}
      <div className="quiz-footer"><span>{result?"Attempt saved securely.":hint?"A hint is a nudge, not the answer.":"Take your time. Your first attempt matters."}</span>{!result?<button className="button primary" disabled={selected===null||loading} onClick={submit}>{loading?"Checking…":"Check my answer"} <Check size={15}/></button>:<button className="button primary" onClick={next}>{index===questions.length-1?"See results":"Next question"} <ArrowRight size={15}/></button>}</div>
    </section>}
  </>;
}

function Tutor({notify}) {
  const [messages,setMessages]=useState([{role:"assistant",content:"Hey! I'm your Thinkwise study buddy. Tell me what you're working on, or share the part that feels confusing. I'll start with a hint or a guiding question rather than giving away the solution."}]);
  const [input,setInput]=useState("");
  const [busy,setBusy]=useState(false);
  const endRef=useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[messages,busy]);
  async function send(text=input){
    const clean=text.trim();if(!clean||busy)return;
    const next=[...messages,{role:"user",content:clean}];setMessages(next);setInput("");setBusy(true);
    const {data,error}=await supabase.functions.invoke("study-buddy",{body:{messages:next.slice(-12).map(m=>({role:m.role==="assistant"?"model":"user",content:m.content}))}});
    setBusy(false);
    if(error){notify("Study buddy couldn't respond: "+friendlyError(error));setMessages(prev=>[...prev,{role:"assistant",content:"I couldn't reach the tutor service just now. You can still work through the question with the practice hints, or try sending your message again."}]);return;}
    setMessages(prev=>[...prev,{role:"assistant",content:data?.reply||"I couldn't form a helpful response. Try asking in a different way."}]);
  }
  return <>
    <PageIntro eyebrow="ASK. EXPLORE. UNDERSTAND." title={<>Your study buddy<span className="sparkle-inline">✳</span></>} description="A guided AI tutor that nudges you forward instead of doing the thinking for you."/>
    <div className="tutor-layout"><section className="panel chat-panel">
      <div className="chat-head"><div className="bot-avatar"><Sparkles size={19}/></div><div><b>Thinkwise buddy</b><small><span className="pulse"/> AI tutor · hint-first mode</small></div><button className="text-button" onClick={()=>setMessages([{role:"assistant",content:"Fresh start! What would you like to understand today?"}])}>New chat</button></div>
      <div className="chat-body">{messages.map((m,i)=><div key={i} className={cx("chat-message",m.role)}><span className="chat-avatar">{m.role==="assistant"?<Sparkles size={13}/>: "YOU"}</span><div className="chat-bubble">{m.content.split("\n").map((line,j)=><p key={j}>{line||" "}</p>)}</div></div>)}{busy&&<div className="chat-message assistant"><span className="chat-avatar"><Sparkles size={13}/></span><div className="chat-bubble typing">Thinking of a helpful nudge…</div></div>}<div ref={endRef}/></div>
      <div className="prompt-chips">{["Explain a concept simply","Give me a hint","Give me a real-life challenge"].map((s,i)=><button key={s} onClick={()=>send(["Explain this concept in simple steps.","I'm stuck. Give me one hint to get started.","Give me a real-life reasoning challenge."][i])}>{s}</button>)}</div>
      <form className="chat-compose" onSubmit={e=>{e.preventDefault();send();}}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask a question or share where you're stuck…" aria-label="Message your study buddy"/><button className="send-button" disabled={!input.trim()||busy} aria-label="Send"><Send size={16}/></button></form>
      <div className="chat-note"><ShieldCheck size={12}/> AI can make mistakes. Verify important information with trusted course material.</div>
    </section><aside className="panel tutor-aside"><div className="eyebrow">A BETTER WAY TO ASK</div><h3>Don't ask for the answer. Ask for a way in.</h3><div className="prompt-example"><small>INSTEAD OF</small><p>“Solve this for me.”</p></div><div className="prompt-example better"><small>TRY THIS</small><p>“Can you give me one hint to get started?”</p></div><div className="tutor-rule"><Sparkles size={17}/><p><b>Our rule:</b> You do the thinking. Your buddy helps you move forward.</p></div></aside></div>
  </>;
}

function Groups({user,notify}) {
  const [groups,setGroups]=useState([]);
  const [active,setActive]=useState(null);
  const [messages,setMessages]=useState([]);
  const [challenges,setChallenges]=useState([]);
  const [challengeAttempts,setChallengeAttempts]=useState([]);
  const [challengeSelections,setChallengeSelections]=useState({});
  const [challengeFeedback,setChallengeFeedback]=useState({});
  const [challengeBusy,setChallengeBusy]=useState(false);
  const [name,setName]=useState("");
  const [subject,setSubject]=useState("Computer Science");
  const [joinCode,setJoinCode]=useState("");
  const [classCode,setClassCode]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [showCreate,setShowCreate]=useState(false);
  const bottom=useRef(null);

  const loadGroups=useCallback(async()=>{
    const {data,error}=await supabase.from("group_members").select("group_id,groups(id,name,subject,join_code,created_at)").eq("user_id",user.id);
    if(error){notify(friendlyError(error));return;}
    setGroups((data||[]).map(x=>x.groups).filter(Boolean));
  },[user.id,notify]);
  useEffect(()=>{loadGroups();},[loadGroups]);

  const loadMessages=useCallback(async(groupId)=>{
    const {data,error}=await supabase.from("group_messages").select("id,user_id,content,created_at,profiles(full_name)").eq("group_id",groupId).order("created_at",{ascending:true}).limit(100);
    if(error){notify(friendlyError(error));return;}
    setMessages(data||[]);
  },[notify]);
  const loadChallenges=useCallback(async(groupId)=>{
    const {data,error}=await supabase.from("group_challenges").select("id,created_at,questions(id,subject,topic,prompt,options,difficulty)").eq("group_id",groupId).order("created_at",{ascending:false}).limit(8);
    if(error){notify(friendlyError(error));return;}
    const rows=data||[];setChallenges(rows);
    const ids=rows.map(x=>x.id);
    if(!ids.length){setChallengeAttempts([]);return;}
    const result=await supabase.from("group_challenge_attempts").select("id,challenge_id,user_id,is_correct,selected_index,created_at,profiles(full_name)").in("challenge_id",ids);
    if(result.error)notify(friendlyError(result.error));
    setChallengeAttempts(result.data||[]);
  },[notify]);
  useEffect(()=>{
    if(!active){setMessages([]);setChallenges([]);setChallengeAttempts([]);return;}
    loadMessages(active.id);loadChallenges(active.id);
    const channel=supabase.channel(`group-${active.id}`)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"group_messages",filter:`group_id=eq.${active.id}`},()=>loadMessages(active.id))
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"group_challenges",filter:`group_id=eq.${active.id}`},()=>loadChallenges(active.id))
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"group_challenge_attempts"},()=>loadChallenges(active.id))
      .subscribe();
    return ()=>{supabase.removeChannel(channel);};
  },[active,loadMessages,loadChallenges]);
  useEffect(()=>{bottom.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  async function createGroup(e){
    e.preventDefault();setBusy(true);
    const {data,error}=await supabase.rpc("create_study_group",{p_name:name.trim(),p_subject:subject});
    setBusy(false);
    if(error){notify(friendlyError(error));return;}
    setName("");setShowCreate(false);await loadGroups();
    notify("Study group created. Share its invite code with your classmates.");
    if(data?.group_id){const fresh=await supabase.from("groups").select("*").eq("id",data.group_id).single();if(fresh.data)setActive(fresh.data);}
  }
  async function joinGroup(e){
    e.preventDefault();setBusy(true);
    const {data,error}=await supabase.rpc("join_study_group",{p_join_code:joinCode.trim().toUpperCase()});
    setBusy(false);
    if(error){notify(friendlyError(error));return;}
    setJoinCode("");await loadGroups();notify("You've joined the study group.");
    const fresh=await supabase.from("groups").select("*").eq("id",data).single();if(fresh.data)setActive(fresh.data);
  }
  async function joinClass(e){
    e.preventDefault();
    const {error}=await supabase.rpc("join_classroom",{p_join_code:classCode.trim().toUpperCase()});
    if(error){notify(friendlyError(error));return;}
    setClassCode("");notify("You've joined the classroom. Your teacher can now see your learning aggregates.");
  }
  async function createTeamChallenge(){
    if(!active)return;setChallengeBusy(true);
    const {data:bank,error:bankError}=await supabase.from("questions").select("id").eq("subject",active.subject).eq("is_active",true);
    if(bankError||!bank?.length){setChallengeBusy(false);notify(friendlyError(bankError)||"No questions are available for this subject.");return;}
    const pick=bank[Math.floor(Math.random()*bank.length)];
    const {error}=await supabase.from("group_challenges").insert({group_id:active.id,question_id:pick.id,created_by:user.id});
    setChallengeBusy(false);
    if(error){notify(friendlyError(error));return;}
    await loadChallenges(active.id);notify("A new team challenge is live for your group!");
  }
  async function submitTeamChallenge(challengeId){
    const selected=challengeSelections[challengeId];
    if(selected===undefined)return;setChallengeBusy(true);
    const {data,error}=await supabase.rpc("submit_group_challenge_attempt",{p_challenge_id:challengeId,p_selected_index:selected});
    setChallengeBusy(false);
    if(error){notify(friendlyError(error));return;}
    setChallengeFeedback(prev=>({...prev,[challengeId]:data}));
    await loadChallenges(active.id);
    notify(data.correct?"Nice work — your team challenge answer is correct.":"Answer submitted. Check the explanation and compare approaches.");
  }
  async function sendMessage(e){
    e.preventDefault();if(!message.trim()||!active)return;
    const content=message.trim();setMessage("");
    const {error}=await supabase.from("group_messages").insert({group_id:active.id,user_id:user.id,content});
    if(error){setMessage(content);notify(friendlyError(error));}
  }
  return <>
    <PageIntro eyebrow="LEARN BETTER, TOGETHER" title="Study groups" description="Explain your reasoning, compare approaches, and learn with classmates." action={<button className="button primary" onClick={()=>setShowCreate(x=>!x)}><Plus size={16}/> Create a group</button>}/>
    <div className="groups-layout">
      <section className="panel group-list-panel">
        <div className="section-head"><div><div className="eyebrow">YOUR COMMUNITIES</div><h3>Study spaces</h3></div><span className="live-badge">{groups.length} JOINED</span></div>
        {groups.length===0?<div className="empty-state"><div className="empty-icon"><Users size={23}/></div><b>Your study circle starts here.</b><p>Create a group or join one with an invite code.</p></div>:<div className="group-items">{groups.map(g=><button key={g.id} className={cx("group-item",active?.id===g.id&&"active")} onClick={()=>setActive(g)}><span className="group-icon"><Users size={17}/></span><span><b>{g.name}</b><small>{g.subject}</small></span><ChevronRight size={15}/></button>)}</div>}
        {showCreate&&<form className="group-create" onSubmit={createGroup}><div className="eyebrow">NEW STUDY GROUP</div><label>Group name<input required maxLength="60" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Friday Brain Sprint"/></label><label>Subject<select value={subject} onChange={e=>setSubject(e.target.value)}>{SUBJECTS.map(s=><option key={s.name}>{s.name}</option>)}</select></label><button className="button primary full" disabled={busy}>{busy?"Creating…":"Create group"}</button></form>}
        <form className="join-form" onSubmit={joinGroup}><div className="eyebrow">HAVE A GROUP INVITE CODE?</div><div className="join-row"><input value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="Enter group code" maxLength="10" required/><button className="button secondary" disabled={busy}>Join</button></div></form>
        <form className="join-form" onSubmit={joinClass}><div className="eyebrow">JOIN YOUR TEACHER'S CLASS</div><div className="join-row"><input value={classCode} onChange={e=>setClassCode(e.target.value)} placeholder="Enter classroom code" maxLength="10" required/><button className="button secondary">Join class</button></div></form>
      </section>
      <section className="panel group-chat-panel">
        {!active?<div className="empty-state tall"><div className="empty-icon"><MessageCircle size={23}/></div><b>Pick a group to open its room.</b><p>Messages update live for everyone in the group.</p></div>:<>
          <div className="group-room-head"><div><div className="eyebrow">LIVE STUDY ROOM</div><h3>{active.name}</h3><small>{active.subject} · Invite code <b>{active.join_code}</b></small></div><div className="room-actions"><button className="copy-code" onClick={()=>{navigator.clipboard?.writeText(active.join_code);notify("Invite code copied.");}}><Copy size={14}/> Copy code</button><button className="button primary small-button" disabled={challengeBusy} onClick={createTeamChallenge}><Zap size={14}/> Team challenge</button></div></div>
          {challenges.length>0&&<div className="team-challenges"><div className="eyebrow">GROUP CHALLENGES</div>{challenges.map(ch=>{const q=ch.questions;const attempts=challengeAttempts.filter(a=>a.challenge_id===ch.id);const own=attempts.find(a=>a.user_id===user.id);const feedback=challengeFeedback[ch.id];return <article className="team-challenge" key={ch.id}><div className="challenge-meta"><span>{q?.topic||active.subject}</span><span>{attempts.length} submitted · {attempts.filter(a=>a.is_correct).length} correct</span></div><h4>{q?.prompt||"Challenge question"}</h4>{!own?<><div className="challenge-options">{(q?.options||[]).map((option,i)=><button key={i} className={cx("challenge-option",challengeSelections[ch.id]===i&&"selected")} onClick={()=>setChallengeSelections(prev=>({...prev,[ch.id]:i}))}><b>{String.fromCharCode(65+i)}</b>{option}</button>)}</div><button className="button primary challenge-submit" disabled={challengeSelections[ch.id]===undefined||challengeBusy} onClick={()=>submitTeamChallenge(ch.id)}>Submit team answer <ArrowRight size={14}/></button></>:<div className={cx("challenge-result",own.is_correct?"right":"wrong")}><b>{own.is_correct?"You got it right.":"Your answer has been recorded."}</b>{feedback?.explanation&&<p>{feedback.explanation}</p>}<small>{attempts.length} group member(s) have submitted · {attempts.filter(a=>a.is_correct).length} correct</small></div>}</article>;})}</div>}
          <div className="group-messages">{messages.length===0?<div className="empty-state">It's quiet in here. Start the conversation with a question or idea.</div>:messages.map(m=><div key={m.id} className={cx("group-message",m.user_id===user.id&&"mine")}><span className="message-avatar">{initials(m.profiles?.full_name||"Member")}</span><div><small>{m.user_id===user.id?"You":m.profiles?.full_name||"Group member"} · {new Date(m.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small><p>{m.content}</p></div></div>)}<div ref={bottom}/></div>
          <form className="group-compose" onSubmit={sendMessage}><input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Share a thought with your group…"/><button className="send-button" disabled={!message.trim()}><Send size={16}/></button></form>
        </>}
      </section>
    </div>
    <div className="collab-note"><Sparkles size={16}/><p><b>Make the most of your group:</b> Explain how you reached an answer, not just which option you picked. That's where collaborative learning happens.</p></div>
  </>;
}

function Progress() {
  const [attempts,setAttempts]=useState([]);
  const [busy,setBusy]=useState(true);
  useEffect(()=>{
    let mounted=true;
    supabase.from("attempts").select("id,subject,topic,is_correct,used_hint,difficulty,created_at").order("created_at",{ascending:false}).limit(500).then(({data,error})=>{if(mounted){setAttempts(data||[]);setBusy(false);}});
    return()=>{mounted=false;};
  },[]);
  const correct=attempts.filter(a=>a.is_correct).length;
  return <>
    <PageIntro eyebrow="YOUR EFFORT, MADE VISIBLE" title="Progress & insights" description="See what's clicking and where a little more practice could help."/>
    <div className="stats-grid"><Stat label="Total attempts" value={busy?"—":attempts.length} icon={BookOpen} tone="violet" foot="Questions submitted"/><Stat label="Correct answers" value={busy?"—":correct} icon={CheckCircle2} tone="mint" foot="Understanding in action"/><Stat label="Accuracy" value={busy?"—":attempts.length?`${pct(correct,attempts.length)}%`:"—"} icon={Target} tone="peach" foot="Across all attempts"/><Stat label="Hints used" value={busy?"—":attempts.filter(a=>a.used_hint).length} icon={Lightbulb} tone="yellow" foot="Hints are part of learning"/></div>
    <section className="panel progress-panel"><div className="section-head"><div><div className="eyebrow">SUBJECT-BY-SUBJECT VIEW</div><h3>Where you're at</h3></div><span className="live-badge">ACCOUNT DATA</span></div>
      <div className="progress-subjects">{SUBJECTS.map(s=>{const rows=attempts.filter(a=>a.subject===s.name),score=pct(rows.filter(a=>a.is_correct).length,rows.length);return <div className="progress-subject" key={s.name}><SubjectIcon subject={s}/><div className="progress-subject-main"><div><b>{s.name}</b><small>{rows.length} attempts</small></div><div className="bar-track wide"><span style={{width:`${score}%`}}/></div></div><strong>{rows.length?`${score}%`:"—"}</strong></div>;})}</div>
    </section>
    <section className="panel recent-panel"><div className="section-head"><div><div className="eyebrow">YOUR RECENT WORK</div><h3>Latest attempts</h3></div></div>{attempts.length===0?<div className="empty-state">Your attempts will appear here after your first practice set.</div>:<div className="attempt-table"><div className="table-row table-head"><span>SUBJECT / TOPIC</span><span>DIFFICULTY</span><span>RESULT</span><span>WHEN</span></div>{attempts.slice(0,12).map(a=><div className="table-row" key={a.id}><span><b>{a.subject}</b><small>{a.topic}</small></span><span className="level-tag">{a.difficulty}</span><span className={a.is_correct?"result-good":"result-bad"}>{a.is_correct?"Correct":"Review"}</span><span className="table-date">{new Date(a.created_at).toLocaleDateString()}</span></div>)}</div>}</section>
    <div className="reflection-banner"><div><div className="eyebrow">A MOMENT TO REFLECT</div><h3>Learning isn't a straight line.</h3><p>A wrong answer is useful information. It tells you what to practise next.</p></div><ArrowUpRight size={32}/></div>
  </>;
}

function Teacher({profile,notify}) {
  const [classes,setClasses]=useState([]);
  const [name,setName]=useState("");
  const [metrics,setMetrics]=useState({});
  const [busy,setBusy]=useState(true);
  const [code,setCode]=useState("");
  const [students,setStudents]=useState([]);
  const load=useCallback(async()=>{
    setBusy(true);
    const {data,error}=await supabase.from("classrooms").select("id,name,join_code,created_at").eq("teacher_id",profile.id).order("created_at",{ascending:false});
    if(error)notify(friendlyError(error));
    setClasses(data||[]);
    const result={};
    for(const c of data||[]){const r=await supabase.rpc("get_class_metrics",{p_classroom_id:c.id});if(!r.error)result[c.id]=r.data;}
    setMetrics(result);setBusy(false);
  },[profile.id,notify]);
  useEffect(()=>{load();},[load]);
  async function createClass(e){
    e.preventDefault();const {data,error}=await supabase.rpc("create_classroom",{p_name:name.trim()});
    if(error){notify(friendlyError(error));return;}setName("");await load();notify("Classroom created. Share the join code with your students.");
  }
  async function joinClass(e){
    e.preventDefault();const {error}=await supabase.rpc("join_classroom",{p_join_code:code.trim().toUpperCase()});
    if(error){notify(friendlyError(error));return;}setCode("");notify("You've joined the classroom. Student-side class view can now be added to your workspace.");
  }
  if(profile?.role!=="teacher"&&profile?.role!=="admin")return <><PageIntro eyebrow="EDUCATOR WORKSPACE" title="Teacher space" description="Classroom insights are available to verified educator accounts."/><div className="panel access-card"><ShieldCheck size={25}/><h3>Teacher access is protected.</h3><p>Your account is currently registered as a student. A project administrator can promote a verified educator account using the SQL instructions in the README. Students cannot grant themselves teacher permissions.</p></div></>;
  return <>
    <PageIntro eyebrow="EDUCATOR WORKSPACE" title="Guide the class" description="See class participation, identify learning gaps, and plan the next intervention."/>
    <div className="teacher-create panel"><form onSubmit={createClass}><div><div className="eyebrow">CREATE A CLASSROOM</div><h3>Start a learning space</h3></div><input value={name} onChange={e=>setName(e.target.value)} required maxLength="70" placeholder="e.g. CSE — Critical Thinking"/><button className="button primary">Create class <Plus size={15}/></button></form><form onSubmit={joinClass} className="join-class-form"><input value={code} onChange={e=>setCode(e.target.value)} placeholder="Join a class as a student (code)" required/><button className="button secondary">Join</button></form></div>
    {busy?<div className="panel loading-card">Loading your classrooms…</div>:classes.length===0?<div className="panel empty-state">No classrooms yet. Create your first classroom above.</div>:classes.map(c=><ClassroomCard key={c.id} classroom={c} metrics={metrics[c.id]}/>)}
  </>;
}
function ClassroomCard({classroom,metrics}){
  const [copy,setCopy]=useState(false);
  const breakdown=metrics?.topic_breakdown||[];
  return <section className="panel classroom-card"><div className="classroom-head"><div><div className="eyebrow">YOUR CLASSROOM</div><h3>{classroom.name}</h3><small>Share this join code with your learners</small></div><button className="join-code" onClick={()=>{navigator.clipboard?.writeText(classroom.join_code);setCopy(true);setTimeout(()=>setCopy(false),1700);}}><Hash size={14}/>{classroom.join_code}<Copy size={13}/>{copy?"Copied":""}</button></div>
    <div className="stats-grid compact-stats"><Stat label="Students joined" value={metrics?.students??"—"} icon={Users} tone="violet" foot="Class membership"/><Stat label="Question attempts" value={metrics?.attempts??"—"} icon={BookOpen} tone="mint" foot="Across this class"/><Stat label="Class accuracy" value={metrics?.accuracy!=null?`${metrics.accuracy}%`:"—"} icon={Target} tone="peach" foot="Correct submissions"/></div>
    <div className="eyebrow">TOPIC SIGNALS</div>{breakdown.length?breakdown.map(t=><div className="topic-metric" key={t.subject}><span>{t.subject}</span><div className="bar-track"><span style={{width:`${t.accuracy}%`}}/></div><b>{t.accuracy}%</b></div>):<p className="small-muted">Topic insights will appear once enrolled students begin practising.</p>}
  </section>;
}

export default App;
