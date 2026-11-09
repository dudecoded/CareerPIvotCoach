import { useEffect, useMemo, useState } from 'react'
import { Search, Sun, Moon, UserRound, ArrowRight, Sparkles, X, LockKeyhole } from 'lucide-react'
import './index.css'
import InterviewStudio from './InterviewStudio'
import { saveAssessment, sendCoachMessage, reviewResume, generateInterviewPrep, getAssessmentHistory, authenticate, setAccessToken, saveUserProfile, getDomainLearning, getAnalytics, getCurrentUser, getRecommendations, type UserProfile, type AssessmentResult, type ResumeReviewResult, type InterviewPrepResult } from './api'

type SkillProficiency = 'Beginner' | 'Intermediate' | 'Advanced'
type Career = 'Data Analyst' | 'Frontend Developer' | 'Backend Developer' | 'ML Engineer' | 'Product Manager' | 'UI/UX Designer'
type Tab = 'Overview' | 'Career assessment' | 'Skill gaps' | 'Roadmap' | 'Career paths' | 'AI coach' | 'Resume review' | 'Interview prep' | 'Assessment history' | 'AI Interview Studio' | 'Profile setup' | 'How to use' | 'Domain learning' | 'Courses & inspiration'

const careerSkills: Record<Career, string[]> = {
  'Data Analyst': ['Excel', 'SQL', 'Python', 'Statistics', 'Data visualization', 'Communication'],
  'Frontend Developer': ['HTML', 'CSS', 'JavaScript', 'React', 'Git', 'Responsive design'],
  'Backend Developer': ['Python', 'APIs', 'SQL', 'Git', 'Authentication', 'Testing'],
  'ML Engineer': ['Python', 'Statistics', 'Pandas', 'Scikit-learn', 'Model evaluation', 'APIs'],
  'Product Manager': ['Communication', 'User research', 'Prioritization', 'Analytics', 'Roadmapping', 'Stakeholder management'],
  'UI/UX Designer': ['Figma', 'User research', 'Wireframing', 'Prototyping', 'Visual design', 'Usability testing'],
}

const allSkills = ['HTML', 'CSS', 'JavaScript', 'React', 'Responsive design', 'Python', 'SQL', 'Excel', 'Git', 'Pandas', 'Statistics', 'Scikit-learn', 'Model evaluation', 'APIs', 'Authentication', 'Testing', 'Communication', 'Figma', 'User research', 'Data visualization', 'Prioritization', 'Analytics', 'Roadmapping', 'Stakeholder management', 'Wireframing', 'Prototyping', 'Visual design', 'Usability testing']

const initialTasks = [
  { phase: 'Days 1–30', title: 'Build your foundations', detail: 'Review core concepts and complete one guided mini-project.', done: false },
  { phase: 'Days 31–60', title: 'Create a portfolio project', detail: 'Build a practical project that demonstrates your target-role skills.', done: false },
  { phase: 'Days 61–90', title: 'Polish and prepare', detail: 'Publish your work, improve your resume, and practise interviews.', done: false },
]

const STORAGE_KEY = 'careerpivotcoach:v1'

type SavedState = {
  name?: string
  currentRole?: string
  target?: Career
  experience?: string
  selectedSkills?: string[]
  skillProficiencies?: Record<string, SkillProficiency>
  goal?: string
  assessmentDone?: boolean
  tasks?: typeof initialTasks
  chat?: { role: 'user' | 'coach'; text: string }[]
}

const DEFAULT_SKILLS = ['HTML', 'CSS', 'JavaScript', 'Python', 'Git']
const PROFICIENCY_LEVELS: SkillProficiency[] = ['Beginner', 'Intermediate', 'Advanced']

// A selected skill contributes according to the user's self-reported proficiency.
// A missing required skill contributes zero. All required skills are equally
// weighted in this first scoring iteration.
const PROFICIENCY_WEIGHT: Record<SkillProficiency, number> = {
  Beginner: 0.35,
  Intermediate: 0.7,
  Advanced: 1,
}

function calculateWeightedReadiness(
  requiredSkills: string[],
  selectedSkills: string[],
  proficiencies: Record<string, SkillProficiency>,
): number {
  if (requiredSkills.length === 0) return 0

  const selectedByLowercase = new Map(
    selectedSkills.map((skill) => [skill.toLowerCase(), skill]),
  )

  const totalWeight = requiredSkills.reduce((total, requiredSkill) => {
    const selectedSkill = selectedByLowercase.get(requiredSkill.toLowerCase())
    if (!selectedSkill) return total

    const level = proficiencies[selectedSkill] ?? 'Beginner'
    return total + PROFICIENCY_WEIGHT[level]
  }, 0)

  return Math.round((totalWeight / requiredSkills.length) * 100)
}


function readSavedState(): SavedState {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SavedState) : {}
  } catch {
    return {}
  }
}

function getInitialSkillProficiencies(): Record<string, SkillProficiency> {
  const saved = readSavedState()
  const stored = saved.skillProficiencies ?? {}
  const skills = saved.selectedSkills ?? DEFAULT_SKILLS

  return Object.fromEntries(
    skills.map((skill) => [
      skill,
      PROFICIENCY_LEVELS.includes(stored[skill] as SkillProficiency) ? stored[skill] as SkillProficiency : 'Beginner',
    ]),
  ) as Record<string, SkillProficiency>
}

function App() {
  const [tab, setTab] = useState<Tab>('Overview')
  const [showLanding, setShowLanding] = useState(() => !localStorage.getItem('cpc-access-token'))
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('cpc-theme') as 'light' | 'dark') || 'light')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authMessage, setAuthMessage] = useState('')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [accessToken, setAccessTokenState] = useState(() => localStorage.getItem('cpc-access-token') || '')
  const [profileForm, setProfileForm] = useState<UserProfile>({ education: '', current_role: 'Student', target_domain: 'Frontend Developer', experience_level: 'Beginner', interests: [], goals: ['Get internship-ready'], learning_style: 'Project-based', hours_per_week: 5, skills: [] })
  const [profileMessage, setProfileMessage] = useState('')
  const [analytics, setAnalytics] = useState<{ assessment_count: number; latest: number | null; readiness_history: { date: string; score: number; target_role: string }[]; matched_skill_counts: { date: string; count: number }[] } | null>(null)
  const [recommendations, setRecommendations] = useState<{ career_paths: string[]; projects: string[]; courses: { title: string; provider: string; url: string; reason: string }[]; books: { title: string; author: string; reason: string }[]; creators: { name: string; platform: string; focus: string; url: string }[]; trajectory: string[]; quote: { text: string; author: string } } | null>(null)
  const [domainContent, setDomainContent] = useState<{ domain: string; overview: string; topics: string[]; projects: string[]; practice: string[] } | null>(null)
  const [name, setName] = useState(() => readSavedState().name ?? 'Uzair')
  const [currentRole, setCurrentRole] = useState(() => readSavedState().currentRole ?? 'Student')
  const [target, setTarget] = useState<Career>(() => readSavedState().target ?? 'Frontend Developer')
  const [experience, setExperience] = useState(() => readSavedState().experience ?? 'Beginner')
  const [selectedSkills, setSelectedSkills] = useState<string[]>(() => readSavedState().selectedSkills ?? DEFAULT_SKILLS)
  const [skillProficiencies, setSkillProficiencies] = useState<Record<string, SkillProficiency>>(getInitialSkillProficiencies)
  const [goal, setGoal] = useState(() => readSavedState().goal ?? 'Get internship-ready')
  const [assessmentDone, setAssessmentDone] = useState(() => readSavedState().assessmentDone ?? false)
  const [tasks, setTasks] = useState(() => readSavedState().tasks ?? initialTasks)
  const [question, setQuestion] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [resumeResult, setResumeResult] = useState<ResumeReviewResult | null>(null)
  const [resumeLoading, setResumeLoading] = useState(false)
  const [resumeError, setResumeError] = useState('')
  const [interviewResult, setInterviewResult] = useState<InterviewPrepResult | null>(null)
  const [interviewLoading, setInterviewLoading] = useState(false)
  const [interviewError, setInterviewError] = useState('')
  const [assessmentHistory, setAssessmentHistory] = useState<{ id: number; current_role: string; target_role: string; experience_years: number; readiness_score: number; created_at: string }[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [apiResult, setApiResult] = useState<AssessmentResult | null>(null)
  const [apiError, setApiError] = useState('')
  const [apiLoading, setApiLoading] = useState(false)
  const [chat, setChat] = useState<{ role: 'user' | 'coach'; text: string }[]>(() => readSavedState().chat ?? [
    { role: 'coach', text: 'Hi! I can help you turn your career goal into practical next steps. Complete your assessment to get more tailored guidance.' },
  ])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('cpc-theme', theme)
  }, [theme])

  // Restore the signed-in account on refresh; the token is persisted by the API client.
  useEffect(() => {
    if (!accessToken) return
    let active = true
    getCurrentUser().then((user) => {
      if (!active) return
      setName(user.name)
      if (user.profile && Object.keys(user.profile).length > 0) {
        const profile = user.profile as Partial<UserProfile>
        setProfileForm((current) => ({ ...current, ...profile }))
        if (profile.current_role) setCurrentRole(profile.current_role)
        if (profile.target_domain && Object.keys(careerSkills).includes(profile.target_domain)) setTarget(profile.target_domain as Career)
      }
    }).catch(() => {
      if (active) {
        setAccessToken('')
        setAccessTokenState('')
      }
    })
    return () => { active = false }
  }, [accessToken])

  // Re-rank the curated catalogue whenever the learner's profile context changes.
  useEffect(() => {
    if (tab !== 'Courses & inspiration') return
    let active = true
    getRecommendations({
      ...profileForm,
      target_domain: target,
      current_role: currentRole,
      skills: selectedSkills,
    }).then((result) => {
      if (active) setRecommendations(result)
    }).catch((error) => {
      if (active) console.error('Could not load personalised recommendations:', error)
    })
    return () => { active = false }
  }, [tab, target, currentRole, selectedSkills, profileForm])

  useEffect(() => {
    const saved: SavedState = { name, currentRole, target, experience, selectedSkills, skillProficiencies, goal, assessmentDone, tasks, chat }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    } catch (error) {
      console.warn('CareerPivotCoach could not save data in this browser.', error)
    }
  }, [name, currentRole, target, experience, selectedSkills, skillProficiencies, goal, assessmentDone, tasks, chat])

  useEffect(() => {
    if (tab !== 'Assessment history' || !accessToken) return
    let active = true
    getAssessmentHistory().then((result) => { if (active) setAssessmentHistory(result.assessments) }).catch((error) => { if (active) setHistoryError(error instanceof Error ? error.message : 'Could not load assessment history.') }).finally(() => { if (active) setHistoryLoading(false) })
    getAnalytics().then((result) => { if (active) setAnalytics(result) }).catch(() => { if (active) setAnalytics(null) })
    return () => { active = false }
  }, [tab, accessToken])

  useEffect(() => {
    if (tab !== 'Domain learning') return
    let active = true
    getDomainLearning(target === 'ML Engineer' ? 'ML Engineer' : target).then((result) => { if (active) setDomainContent(result) }).catch(() => { if (active) setDomainContent(null) })
    return () => { active = false }
  }, [tab, target])

  const required = careerSkills[target]
  const matched = required.filter((skill) => selectedSkills.some((selected) => selected.toLowerCase() === skill.toLowerCase()))
  const gaps = required.filter((skill) => !matched.includes(skill))
  const readiness = calculateWeightedReadiness(required, selectedSkills, skillProficiencies)
  const completedTasks = tasks.filter((task) => task.done).length
  const progress = Math.round((completedTasks / tasks.length) * 100)

  const profileFields = [
    Boolean(profileForm.education.trim()),
    Boolean(profileForm.current_role.trim()),
    Boolean(profileForm.target_domain.trim()),
    Boolean(profileForm.experience_level.trim()),
    profileForm.interests.length > 0,
    profileForm.goals.length > 0,
    Boolean(profileForm.learning_style.trim()),
    profileForm.hours_per_week > 0,
    profileForm.skills.length > 0 || selectedSkills.length > 0,
  ]
  const profileCompletion = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100)
  const nextSkill = gaps[0] ?? required[0]
  const weeklyHours = Math.max(1, Math.min(80, Number(profileForm.hours_per_week) || 5))
  const weeklyMinutes = weeklyHours * 60

  const suggestedProject = useMemo(() => {
    const projects: Record<Career, string> = {
      'Data Analyst': 'Sales insights dashboard using Python, SQL and charts',
      'Frontend Developer': 'Responsive personal portfolio with a project gallery',
      'Backend Developer': 'REST API with authentication, database and tests',
      'ML Engineer': 'End-to-end prediction model with evaluation and an API',
      'Product Manager': 'Product case study with user research and a prioritised roadmap',
      'UI/UX Designer': 'Mobile app redesign with wireframes and usability findings',
    }
    return projects[target]
  }, [target])

  function toggleSkill(skill: string) {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills((current) => current.filter((item) => item !== skill))
      setSkillProficiencies((current) => {
        const next = { ...current }
        delete next[skill]
        return next
      })
      return
    }

    setSelectedSkills((current) => [...current, skill])
    setSkillProficiencies((current) => ({ ...current, [skill]: 'Beginner' }))
  }

  async function sendMessage() {
    const clean = question.trim()
    if (!clean || chatLoading) return
    const previousChat = chat.slice(-10)
    setChat((current) => [...current, { role: 'user', text: clean }])
    setQuestion('')
    setChatError('')
    setChatLoading(true)
    try {
      const result = await sendCoachMessage({
        message: clean,
        current_role: currentRole,
        target_role: target === 'ML Engineer' ? 'Machine Learning Engineer' : target,
        experience_years: experience === 'Beginner' ? 0 : experience === 'Some experience' ? 2 : 5,
        skills: selectedSkills.map((skill) => skill.toLowerCase()),
        goal,
        history: previousChat.map((item) => ({ role: item.role, content: item.text })),
      })
      setChat((current) => [...current, { role: 'coach', text: result.reply }])
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'The coach could not respond.')
      setChat((current) => [...current, {
        role: 'coach',
        text: 'I could not connect to the coaching service. Please check that the backend is running, then try again.',
      }])
    } finally {
      setChatLoading(false)
    }
  }

  const tabs: Tab[] = ['Overview', 'Career assessment', 'Skill gaps', 'Roadmap', 'Career paths', 'AI coach', 'Resume review', 'Interview prep', 'Assessment history', 'AI Interview Studio', 'Profile setup', 'How to use', 'Domain learning', 'Courses & inspiration']

  return (
    <div className={showLanding ? "app-shell landing-shell" : "app-shell"}>
      {showLanding ? <div className="public-landing">
        <nav className="landing-nav"><button className="landing-brand" onClick={()=>setShowLanding(true)}><span className="brand-mark">CP</span><span>CareerPivot<small>CAREER BRIDGE ENGINE</small></span></button><div className="landing-nav-links"><a href="#how-it-works">How it works</a><a href="#career-paths">Explore careers</a><a href="#why-us">Why CareerPivot</a></div><div className="landing-nav-actions"><button className="landing-login" onClick={()=>{setAuthMode('login');setAuthMessage('');setAuthOpen(true)}}>Log in</button><button className="primary-button" onClick={()=>{setAuthMode('signup');setAuthMessage('');setAuthOpen(true)}}>Get started <ArrowRight size={15}/></button></div></nav>
        <section className="landing-hero editorial-hero"><div className="editorial-topline"><span>CAREER DESIGN STUDIO · EST. 2026</span><span>01 / FIND YOUR DIRECTION</span></div><div className="landing-hero-copy"><span className="landing-kicker"><Sparkles size={14}/> YOUR NEXT CHAPTER STARTS HERE</span><h1 className="hero-type"><span className="hero-line hero-line-one">Make your</span><span className="hero-line hero-line-two">next move</span><span className="hero-line hero-line-three"><em>matter.</em></span></h1><p>Not another career quiz. A space to see what you bring, explore where it can take you, and build the bridge between the two.</p><div className="landing-hero-actions"><button className="primary-button" onClick={()=>{setAuthMode('signup');setAuthMessage('');setAuthOpen(true)}}>Build my career path <ArrowRight size={16}/></button><button className="landing-secondary" onClick={()=>document.getElementById('career-paths')?.scrollIntoView({behavior:'smooth'})}>Explore career paths ↗</button></div><div className="landing-proof"><div className="proof-avatars"><span>U</span><span>✦</span><span>↗</span></div><span><strong>Small steps. Real momentum.</strong><small>A workspace built around your goals.</small></span></div></div><div className="landing-hero-art editorial-art"><div className="poster-black"><span className="poster-label">YOUR CAREER<br/>IS NOT A STRAIGHT LINE</span><svg className="career-scribble" viewBox="0 0 620 330" role="img" aria-label="Abstract blue illustrated career path"><path className="scribble-shadow" d="M78 190 C20 110 96 28 178 86 C220 10 300 43 306 115 C360 20 446 54 437 135 C532 75 595 155 527 225 C474 298 393 253 355 218 C302 306 228 275 215 218 C150 285 93 254 78 190Z"/><path className="scribble-blue" d="M78 170 C20 90 96 8 178 66 C220 -10 300 23 306 95 C360 0 446 34 437 115 C532 55 595 135 527 205 C474 278 393 233 355 198 C302 286 228 255 215 198 C150 265 93 234 78 170Z"/><path className="scribble-line" d="M105 153 Q135 116 169 144 M235 72 Q268 92 274 128 M350 65 Q380 90 390 130 M455 165 Q490 139 520 166 M275 205 Q310 233 340 208"/><path className="scribble-highlight" d="M117 95 Q142 61 162 83 M320 46 Q341 28 354 55 M462 205 Q479 224 499 211"/></svg><span className="poster-sticker sticker-a">SKILLS<br/>→ STRENGTHS</span><span className="poster-sticker sticker-b">MAKE<br/>YOUR MOVE ✳</span><span className="poster-number">01—∞</span></div><div className="art-caption"><span>DISCOVER · LEARN · BUILD</span><span>YOUR CAREER, IN MOTION ↗</span></div></div></section>
        <section className="landing-stats"><div><strong>01</strong><span>Know your strengths</span></div><div><strong>02</strong><span>Find your direction</span></div><div><strong>03</strong><span>Build your next chapter</span></div></section>
        <section className="landing-section" id="how-it-works"><div className="landing-section-heading"><span className="eyebrow">A CLEARER WAY FORWARD</span><h2>Less guessing.<br/><em>More meaningful progress.</em></h2><p>Everything you need to turn a career ambition into a plan you can actually follow.</p></div><div className="landing-feature-grid"><article className="landing-feature"><span>◈</span><small>01 · UNDERSTAND</small><h3>Know where you stand</h3><p>Map your existing skills, experience and confidence. See what already transfers to your next role.</p></article><article className="landing-feature"><span>⌁</span><small>02 · DISCOVER</small><h3>Find your next direction</h3><p>Explore career paths, adjacent roles and the skills that connect your current experience to new opportunities.</p></article><article className="landing-feature"><span>✳</span><small>03 · BUILD</small><h3>Make progress visible</h3><p>Follow a personalised roadmap, practise with interview tools and build projects that demonstrate what you can do.</p></article></div></section>
        <section className="landing-careers" id="career-paths"><div className="landing-section-heading"><span className="eyebrow">EXPLORE WHAT'S POSSIBLE</span><h2>Different paths.<br/><em>One place to begin.</em></h2><p>Choose a direction to preview the kind of journey you can build.</p></div><div className="landing-career-grid">{(Object.keys(careerSkills) as Career[]).map((career,i)=><button className="landing-career-card" key={career} onClick={()=>{setTarget(career);setProfileForm(p=>({...p,target_domain:career}));setShowLanding(false);setTab('Career paths')}}><span>{['◈','⌘','⌁','✳','◇','✧'][i%6]}</span><strong>{career}</strong><small>{careerSkills[career].slice(0,3).join(' · ')}</small><b>Explore path <ArrowRight size={14}/></b></button>)}</div></section>
        <section className="landing-quote"><span>✦ A THOUGHT TO KEEP</span><blockquote>“The secret of getting ahead is getting started.”</blockquote><small>— Mark Twain</small></section>
        <section className="landing-bottom" id="why-us"><div><span className="eyebrow">YOUR JOURNEY, YOUR WAY</span><h2>Build a future that<br/><em>feels like yours.</em></h2><p>No one-size-fits-all career advice. Just a thoughtful starting point, practical tools and room to grow.</p></div><button className="primary-button" onClick={()=>{setAuthMode('signup');setAuthMessage('');setAuthOpen(true)}}>Start your journey <ArrowRight size={16}/></button></section>
        <footer className="landing-footer"><span>© 2026 CareerPivotCoach</span><span>Built for clarity, not guesswork ✦</span><button onClick={()=>{setAuthMode('login');setAuthOpen(true)}}>Log in</button></footer>
      </div> : <>
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">CP</div><div><strong>CareerPivot</strong><span>CAREER BRIDGE ENGINE</span></div></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>{tabs.map((item, index) => <button key={item} className={`nav-item ${tab === item ? 'active' : ''}`} onClick={() => { if (item === 'Assessment history') { setHistoryLoading(true); setHistoryError('') }; setTab(item) }}><span className="nav-icon">{['◉', '◎', '⌁', '↗', '◇', '✳', '▤', '☷', '◷', '◉'][index]}</span>{item}{item === 'Career assessment' && !assessmentDone && <i />}</button>)}</nav>
        <div className="sidebar-bottom"><div className="help-card"><div className="help-icon">✦</div><strong>Your next chapter starts here.</strong><p>Small, consistent steps create career momentum.</p><button onClick={() => setTab('Roadmap')}>View my roadmap →</button></div><div className="profile-mini"><div className="avatar">{name.trim().charAt(0).toUpperCase() || 'U'}</div><div><strong>{name || 'Your profile'}</strong><span>{accessToken ? 'Signed-in account' : 'Preview workspace'}</span></div><span className="dots">•••</span></div></div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{tab}</strong></div><div className="top-actions"><div className="global-search"><Search size={16}/><input aria-label="Search CareerPivotCoach" placeholder="Search skills, tools, careers…" value={searchQuery} onFocus={() => setSearchOpen(true)} onChange={(event) => { setSearchQuery(event.target.value); setSearchOpen(true) }} onKeyDown={(event) => { if (event.key === 'Escape') setSearchOpen(false) }} />{searchQuery && <button className="search-clear" onClick={() => { setSearchQuery(''); setSearchOpen(false) }} aria-label="Clear search"><X size={14}/></button>}{searchOpen && searchQuery.trim() && <div className="search-results">{tabs.filter((item) => item.toLowerCase().includes(searchQuery.toLowerCase())).slice(0,4).map((item) => <button key={item} onClick={() => { setTab(item); setSearchOpen(false); setSearchQuery('') }}><span className="search-result-icon">↗</span><span><strong>{item}</strong><small>Open workspace section</small></span><ArrowRight size={14}/></button>)}{allSkills.filter((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase())).slice(0,4).map((skill) => <button key={skill} onClick={() => { setTab('Career assessment'); if (!selectedSkills.includes(skill)) toggleSkill(skill); setSearchOpen(false); setSearchQuery('') }}><span className="search-result-icon">✳</span><span><strong>{skill}</strong><small>Skill · add or review</small></span><ArrowRight size={14}/></button>)}{(tabs.filter((item) => item.toLowerCase().includes(searchQuery.toLowerCase())).length + allSkills.filter((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase())).length === 0) && <p>No matching skills or sections.</p>}</div>}</div><span className="demo-pill"><span /> {accessToken ? 'Account workspace' : 'Preview workspace'}</span><button className="theme-toggle" aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} title={theme === 'light' ? 'Dark mode' : 'Light mode'} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={17}/> : <Sun size={17}/>}</button>{accessToken ? <button className="account-button" onClick={() => { setAccessToken(''); setAccessTokenState(''); setAssessmentHistory([]); setAnalytics(null); setTab('Overview') }}><UserRound size={15}/> <span>Sign out</span></button> : <button className="account-button" onClick={() => { setAuthOpen(true); setAuthMessage('') }}><UserRound size={15}/> <span>Sign in</span></button>}<button
  className="icon-button"
  aria-label="Notifications"
  title="Notifications"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    <path d="M10 21h4" />
  </svg>
</button><div className="avatar small">{name.trim().charAt(0).toUpperCase() || 'U'}</div></div></header>
        <div className="content" onClick={() => { if (searchOpen) setSearchOpen(false) }}>{apiError && <div className="notice">Backend error: {apiError}</div>}{apiLoading && <div className="notice">Analysing your career profile and saving assessment...</div>}
          {tab === 'Overview' && <>
            <div className="welcome-row"><div><div className="eyebrow">YOUR CAREER, REIMAGINED</div><h1>Make your next move <em>with confidence.</em></h1><p className="subheading">A clear bridge from where you are to where you want to be.</p></div><button className="primary-button" onClick={() => setTab('Career assessment')}>✦ {assessmentDone ? 'Update assessment' : 'Start assessment'} <span>→</span></button></div>
            <div className="hero-card"><div className="hero-copy"><span className="tag">YOUR CAREER BRIDGE</span><h2>{assessmentDone ? `Your path to ${target}` : 'Your next chapter is closer than you think.'}</h2><p>{assessmentDone ? `You have identified ${matched.length} matching skills. Build the missing skills one step at a time.` : 'Discover the skills you already have, identify what you need next, and turn your ambition into an actionable plan.'}</p><button className="light-button" onClick={() => setTab('Career assessment')}>{assessmentDone ? 'Review my results' : 'Build my career plan'} <span>→</span></button></div><div className="hero-art"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="art-core">✦</div><div className="float-card card-top">↗ <span>New possibilities</span></div><div className="float-card card-bottom"><span className="mini-check">✓</span><span>Skills that transfer</span></div></div></div>
            <div className="section-heading"><div><h2>Your career snapshot</h2><p>A quick look at your progress so far.</p></div><span className="muted-label">UPDATED JUST NOW</span></div>
            <div className="stats-grid"><div className="stat-card"><div className="stat-top"><span>Career readiness</span><span className="stat-symbol purple">◉</span></div><div className="stat-value">{assessmentDone ? readiness : '—'}<small>{assessmentDone ? '%' : 'Start assessment'}</small></div><div className="progress-track"><div style={{ width: `${assessmentDone ? readiness : 0}%` }} /></div><p>{assessmentDone ? 'Weighted by your reported proficiency' : 'Complete your assessment to calculate'}</p></div><div className="stat-card"><div className="stat-top"><span>Transferable skills</span><span className="stat-symbol green">↗</span></div><div className="stat-value">{assessmentDone ? matched.length : selectedSkills.length}<small> identified</small></div><p className="positive">Skills you can build on</p></div><div className="stat-card"><div className="stat-top"><span>Skills to develop</span><span className="stat-symbol orange">⌁</span></div><div className="stat-value">{assessmentDone ? gaps.length : '—'}<small> priority areas</small></div><p>Focus on the highest-impact gaps first</p></div><div className="stat-card"><div className="stat-top"><span>Roadmap progress</span><span className="stat-symbol blue">↗</span></div><div className="stat-value">{progress}<small>%</small></div><div className="progress-track blue-track"><div style={{ width: `${progress}%` }} /></div><p>{completedTasks} of {tasks.length} milestones completed</p></div></div>
            <div className="bottom-grid"><section className="panel"><div className="panel-heading"><div><h3>Your next best action</h3><p>One small step. Meaningful momentum.</p></div><span className="sparkle">✦</span></div><div className="action-row"><div className="action-icon">⌘</div><div className="action-text"><span className="tag soft-tag">RECOMMENDED FOR YOU</span><h4>{assessmentDone ? `Learn ${gaps[0] ?? 'build your portfolio'}` : 'Complete your career assessment'}</h4><p>{assessmentDone ? `Spend 30 minutes practising ${gaps[0] ?? 'your project idea'} today.` : 'Tell us about your background and destination role to personalise your plan.'}</p></div><button className="arrow-button" onClick={() => setTab(assessmentDone ? 'Skill gaps' : 'Career assessment')}>→</button></div></section><section className="panel quote-panel"><div className="quote-mark">“</div><p>Your past experience isn't a detour. It's part of the bridge to what's next.</p><span>YOUR CAREER JOURNEY, YOUR WAY</span><div className="quote-decoration">✳</div></section></div>
            <div className="dashboard-detail-grid">
              <section className="panel profile-progress-panel">
                <div className="panel-heading"><div><span className="eyebrow">YOUR FOUNDATION</span><h3>Career profile</h3><p>A stronger profile helps make your plan more relevant.</p></div><strong className="completion-score">{profileCompletion}%</strong></div>
                <div className="progress-track"><div style={{width:`${profileCompletion}%`}} /></div>
                <div className="profile-progress-meta"><span>{profileFields.filter(Boolean).length} of {profileFields.length} details completed</span><button className="text-button" onClick={()=>setTab('Profile setup')}>{profileCompletion===100?'Review profile':'Complete profile'} →</button></div>
              </section>
              <section className="panel weekly-focus-panel">
                <div className="panel-heading"><div><span className="eyebrow">YOUR WEEKLY COMMITMENT</span><h3>A pace you can sustain</h3><p>Based on your profile's available study time.</p></div><span className="weekly-hours">{weeklyHours}<small>hrs / wk</small></span></div>
                <div className="weekly-split"><div><strong>{Math.round(weeklyMinutes*0.5)} min</strong><span>Learn & practise</span></div><div><strong>{Math.round(weeklyMinutes*0.3)} min</strong><span>Build a project</span></div><div><strong>{Math.round(weeklyMinutes*0.2)} min</strong><span>Review & reflect</span></div></div>
                <button className="text-button" onClick={()=>setTab('Roadmap')}>Open my roadmap →</button>
              </section>
              <section className="panel focus-skill-panel">
                <span className="eyebrow">SUGGESTED FOCUS</span><h3>{assessmentDone ? nextSkill : 'Start with your skill assessment'}</h3>
                <p>{assessmentDone ? `This is one of the skills in your ${target} skill map that deserves attention next.` : 'Rate your current skills to uncover the most useful areas to work on.'}</p>
                <button className="primary-button" onClick={()=>setTab(assessmentDone?'Skill gaps':'Career assessment')}>{assessmentDone?'Review skill gaps':'Assess my skills'} <ArrowRight size={15}/></button>
              </section>
            </div>
          </>}

          {tab === 'Career assessment' && <><div className="page-intro"><div className="eyebrow">STEP 1 · KNOW YOUR STARTING POINT</div><h1>Let's map your <em>next move.</em></h1><p>Share a little about yourself. We'll use it to build a practical transition plan.</p></div><section className="panel form-panel"><div className="form-section-title"><span>01</span><div><h3>Your background</h3><p>Start with where you are today.</p></div></div><div className="form-grid"><label>Your name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></label><label>Current role or background<input value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} placeholder="e.g. Student, teacher, developer" /></label><label>Experience level<select value={experience} onChange={(e) => setExperience(e.target.value)}><option>Beginner</option><option>Some experience</option><option>Experienced</option></select></label><label>What is your main goal?<select value={goal} onChange={(e) => setGoal(e.target.value)}><option>Get internship-ready</option><option>Switch careers</option><option>Get my first job</option><option>Grow in my current field</option></select></label></div><div className="divider" /><div className="form-section-title"><span>02</span><div><h3>Choose your destination</h3><p>Which role would you like to work towards?</p></div></div><div className="career-choice-grid">{(Object.keys(careerSkills) as Career[]).map((career) => <button key={career} className={`career-choice ${target === career ? 'chosen' : ''}`} onClick={() => setTarget(career)}><span className="choice-icon">{career === 'Data Analyst' ? '◈' : career === 'Frontend Developer' ? '⌘' : career === 'Backend Developer' ? '⌁' : career === 'ML Engineer' ? '✳' : career === 'Product Manager' ? '◇' : '◈'}</span><span><strong>{career}</strong><small>{careerSkills[career].slice(0, 3).join(' · ')}</small></span><span className="radio">{target === career ? '✓' : ''}</span></button>)}</div><div className="divider" /><div className="form-section-title"><span>03</span><div><h3>Skills you already have</h3><p>Select everything you feel comfortable with. You can change this later.</p></div></div><div className="skill-picker">{allSkills.map((skill) => {
              const isSelected = selectedSkills.includes(skill)
              return (
                <div className={`skill-option ${isSelected ? 'selected' : ''}`} key={skill}>
                  <button
                    type="button"
                    className={`skill-chip ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleSkill(skill)}
                    aria-pressed={isSelected}
                  >
                    {isSelected ? '✓ ' : '+ '}{skill}
                  </button>
                  {isSelected && (
                    <select
                      className="proficiency-select"
                      aria-label={`${skill} proficiency`}
                      value={skillProficiencies[skill] ?? 'Beginner'}
                      onChange={(event) => setSkillProficiencies((current) => ({
                        ...current,
                        [skill]: event.target.value as SkillProficiency,
                      }))}
                    >
                      {PROFICIENCY_LEVELS.map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  )}
                </div>
              )
            })}</div><div className="form-footer"><span>{accessToken ? 'Assessment history is saved to your account.' : 'Sign in to save assessments to your private account.'}</span><button className="primary-button" onClick={async () => { if (!accessToken) { setAuthOpen(true); setAuthMessage('Create an account or sign in to save your personal assessment.'); return; } setApiLoading(true); setApiError(''); try { const result = await saveAssessment({ current_role: currentRole, target_role: target === 'ML Engineer' ? 'Machine Learning Engineer' : target, experience_years: experience === 'Beginner' ? 0 : experience === 'Some experience' ? 2 : 5, skills: selectedSkills.map(s => s.toLowerCase()), skill_proficiencies: skillProficiencies }); setApiResult(result); setAssessmentDone(true); setTasks(result.roadmap.map(phase => ({ phase: phase.period, title: phase.title, detail: phase.tasks.map(t => t.task).join(' · '), done: false }))); setTab('Skill gaps'); } catch (e) { setApiError(e instanceof Error ? e.message : 'Could not connect to backend'); } finally { setApiLoading(false); } }}>Generate my career bridge <span>→</span></button></div></section></>}

          {tab === 'Skill gaps' && <><div className="page-intro"><div className="eyebrow">YOUR CAREER BRIDGE</div><h1>See what connects you <em>to your goal.</em></h1><p>{apiResult?.recommendation ?? ''} Your analysis is based on the skills you selected—not a prediction of hiring outcomes.</p></div>{!assessmentDone && <div className="notice">Your results are a starting point. <button onClick={() => setTab('Career assessment')}>Complete the assessment →</button></div>}<div className="analysis-grid"><section className="panel readiness-panel"><div className="panel-heading"><div><h3>Skill coverage</h3><p>{target} · {matched.length} of {required.length} target skills matched</p></div><span className="tag">ESTIMATE</span></div><div className="score-circle" style={{ '--score': `${assessmentDone ? readiness : 0}%` } as React.CSSProperties}><div><strong>{assessmentDone ? readiness : 0}%</strong><span>coverage</span></div></div><p className="center-note">{apiResult?.score_note ?? 'This score measures selected-skill coverage only. It is not a job-readiness or employment prediction.'}</p></section><section className="panel"><div className="panel-heading"><div><h3>Skills you can build on</h3><p>Existing skills that overlap with your target.</p></div><span className="count-badge green-count">{matched.length}</span></div><div className="skill-list">{matched.length ? matched.map((skill) => <div className="skill-line" key={skill}><span className="skill-status matched">✓</span><div><strong>{skill}</strong><small>Selected as an existing skill</small></div><span className="level-label">MATCH</span></div>) : <p className="empty-note">Complete the assessment and select some existing skills.</p>}</div></section><section className="panel gap-panel"><div className="panel-heading"><div><h3>Priority skills to develop</h3><p>Target skills you haven't selected yet.</p></div><span className="count-badge orange-count">{gaps.length}</span></div><div className="skill-list">{gaps.map((skill, index) => <div className="skill-line" key={skill}><span className="skill-status gap">{index + 1}</span><div><strong>{skill}</strong><small>{index === 0 ? 'Start here · first priority' : 'Add to your learning plan'}</small></div><button className="tiny-button" onClick={() => toggleSkill(skill)}>Mark learned</button></div>)}</div></section><section className="panel project-panel"><span className="tag soft-tag">PUT IT INTO PRACTICE</span><h3>Build proof, not just knowledge.</h3><p>A portfolio project helps you practise several skills together and gives you something concrete to discuss.</p><div className="project-suggestion"><span className="project-icon">✦</span><div><strong>{suggestedProject}</strong><small>Suggested starter project for {target}</small></div></div><button className="text-button" onClick={() => setTab('Roadmap')}>Add to my roadmap →</button></section></div></>}

          {tab === 'Roadmap' && <><div className="page-intro"><div className="eyebrow">YOUR 90-DAY PLAN</div><h1>Progress, one <em>step at a time.</em></h1><p>A flexible starter roadmap. Adjust the pace to fit your schedule.</p></div><div className="roadmap-summary"><div><span className="eyebrow">ROADMAP COMPLETION</span><strong>{progress}%</strong><div className="progress-track"><div style={{ width: `${progress}%` }} /></div></div><div><span className="eyebrow">TARGET ROLE</span><strong>{target}</strong><small>{goal}</small></div><div><span className="eyebrow">PROJECT TO BUILD</span><strong className="project-title">{suggestedProject}</strong></div></div><div className="roadmap-list">{tasks.map((task, index) => <section className={`roadmap-item ${task.done ? 'task-done' : ''}`} key={task.phase}><button className={`task-check ${task.done ? 'checked' : ''}`} onClick={() => setTasks((current) => current.map((t, i) => i === index ? { ...t, done: !t.done } : t))}>{task.done ? '✓' : ''}</button><div className="roadmap-content"><span className="eyebrow">{task.phase}</span><h3>{task.title}</h3><p>{task.detail}</p>{index === 0 && <div className="task-tip">Suggested focus: {gaps[0] ?? required[0]}. Practise consistently and keep notes on what you learn.</div>}{index === 1 && <div className="task-tip">Project idea: {suggestedProject}.</div>}{index === 2 && <div className="task-tip">Prepare a short explanation of your project, decisions, and lessons learned.</div>}</div><span className={`status-tag ${task.done ? 'done-tag' : ''}`}>{task.done ? 'COMPLETED' : 'UP NEXT'}</span></section>)}</div></>}

          {tab === 'Career paths' && <><div className="page-intro"><div className="eyebrow">EXPLORE YOUR OPTIONS</div><h1>There is more than <em>one way forward.</em></h1><p>Explore a few common career directions and choose one to analyse.</p></div><div className="career-catalog">{(Object.keys(careerSkills) as Career[]).map((career, index) => <article className={`career-card ${target === career ? 'current-career' : ''}`} key={career}><div className="career-card-top"><span className="choice-icon">{['◈', '⌘', '⌁', '✳', '◇', '◈'][index]}</span>{target === career && <span className="tag">SELECTED</span>}</div><h3>{career}</h3><p>{['Turn data into clear insights that help teams make decisions.', 'Build accessible, responsive interfaces for web experiences.', 'Create APIs, services and systems that power applications.', 'Develop and evaluate machine-learning solutions.', 'Connect user needs, business goals and product delivery.', 'Design intuitive digital experiences around real user needs.'][index]}</p><div className="career-skills">{careerSkills[career].slice(0, 4).map((skill) => <span key={skill}>{skill}</span>)}</div><button className="text-button" onClick={() => { setTarget(career); setTab('Career assessment') }}>Explore this path →</button></article>)}</div></>}

          {tab === 'AI coach' && <><div className="page-intro"><div className="eyebrow">YOUR CAREER COMPANION</div><h1>A little guidance can <em>go a long way.</em></h1><p>Ask for practical next steps based on your current career goal.</p></div><section className="panel chat-panel"><div className="chat-header"><div className="coach-avatar">✦</div><div><h3>Career Coach</h3><p><span className="online-dot" /> Offline career guidance · no API key required</p></div><span className="tag">OFFLINE</span></div><div className="chat-messages">{chat.map((message, index) => <div key={index} className={`chat-message ${message.role}`}>{message.role === 'coach' && <span className="message-avatar">✦</span>}<div>{message.text}</div></div>)}</div>{chatLoading && <div className="chat-message coach"><span className="message-avatar">✦</span><div>Thinking through your career context…</div></div>}<div className="prompt-suggestions"><button onClick={() => setQuestion('What should I learn first?')}>What should I learn first?</button><button onClick={() => setQuestion('Suggest a portfolio project for me')}>Suggest a portfolio project</button><button onClick={() => setQuestion('How can I prepare for an internship?')}>Prepare for an internship</button></div>{chatError && <div className="notice" role="alert">{chatError}</div>}<form className="chat-input" onSubmit={(e) => { e.preventDefault(); void sendMessage() }}><input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about your next career step..." /><button className="primary-button" type="submit" disabled={chatLoading || !question.trim()}>{chatLoading ? 'Thinking…' : 'Send ↑'}</button></form></section></>}

          {tab === 'Resume review' && <>
            <div className="page-intro"><div className="eyebrow">CAREER TOOL · RESUME REVIEW</div><h1>Make your experience <em>stand out.</em></h1><p>Paste your resume text for a first-pass review against your selected role. Your text is sent to your local backend and is not stored by this tool.</p></div>
            <section className="panel form-panel">
              <div className="form-section-title"><span>01</span><div><h3>Your resume text</h3><p>Paste plain text from your resume. Remove phone numbers, addresses, and other private details first.</p></div></div>
              <textarea className="resume-textarea" value={resumeText} onChange={(event) => setResumeText(event.target.value)} placeholder="Paste your resume summary, skills, projects and experience here…" rows={12} />
              <div className="form-footer"><span>{resumeText.trim().length} characters · minimum 80</span><button className="primary-button" disabled={resumeLoading || resumeText.trim().length < 80} onClick={async () => { setResumeLoading(true); setResumeError(''); try { setResumeResult(await reviewResume(resumeText, target === 'ML Engineer' ? 'Machine Learning Engineer' : target)); } catch (error) { setResumeError(error instanceof Error ? error.message : 'Resume review failed.'); } finally { setResumeLoading(false); } }}>{resumeLoading ? 'Reviewing…' : 'Review my resume →'}</button></div>
              {resumeError && <div className="notice" role="alert">{resumeError}</div>}
            </section>
            {resumeResult && <div className="analysis-grid resume-results">
              <section className="panel"><h3>Review summary</h3><p>{resumeResult.summary}</p><h3>Detected skills</h3><div className="career-skills">{resumeResult.detected_skills.map((skill) => <span key={skill}>{skill}</span>)}</div><h3>Relevant keywords not found</h3><div className="career-skills">{resumeResult.missing_keywords.map((skill) => <span key={skill}>{skill}</span>)}</div></section>
              <section className="panel"><h3>What is working</h3><ul className="review-list">{resumeResult.strengths.map((item) => <li key={item}>{item}</li>)}</ul><h3>Recommended improvements</h3><ul className="review-list">{resumeResult.improvements.map((item) => <li key={item}>{item}</li>)}</ul></section>
            </div>}
            <p className="muted-label">This is a rule-based first-pass review, not an ATS score or a guarantee of selection.</p>
          </>}

          {tab === 'Interview prep' && <>
            <div className="page-intro"><div className="eyebrow">CAREER TOOL · INTERVIEW PREPARATION</div><h1>Practise with <em>purpose.</em></h1><p>Generate a role-specific set of practice questions and understand what a strong answer should cover.</p></div>
            <section className="panel"><div className="panel-heading"><div><h3>Your practice context</h3><p>Questions are tailored to your target role and selected skills.</p></div><span className="tag">PRACTICE SET</span></div><div className="form-footer"><span>Target: <strong>{target}</strong> · Experience: <strong>{experience}</strong></span><button className="primary-button" disabled={interviewLoading} onClick={async () => { setInterviewLoading(true); setInterviewError(''); try { setInterviewResult(await generateInterviewPrep(target === 'ML Engineer' ? 'Machine Learning Engineer' : target, selectedSkills, experience)); } catch (error) { setInterviewError(error instanceof Error ? error.message : 'Could not generate questions.'); } finally { setInterviewLoading(false); } }}>{interviewLoading ? 'Preparing…' : 'Generate practice questions →'}</button></div>{interviewError && <div className="notice" role="alert">{interviewError}</div>}</section>
            {interviewResult && <><div className="task-tip">{interviewResult.preparation_tip}</div><div className="interview-grid">{interviewResult.questions.map((item, index) => <article className="panel interview-card" key={item.category}><span className="eyebrow">QUESTION {index + 1} · {item.category}</span><h3>{item.question}</h3><p><strong>What to cover:</strong> {item.what_to_cover}</p></article>)}</div></>}
          </>}
          {tab === 'AI Interview Studio' && <InterviewStudio targetRole={target} currentRole={currentRole} selectedSkills={selectedSkills} />}

          {tab === 'Profile setup' && <><div className="page-intro"><div className="eyebrow">YOUR PERSONAL CAREER PROFILE</div><h1>Let's make this <em>about you.</em></h1><p>Your answers shape the learning resources, projects and recommendations you see.</p></div><section className="panel form-panel"><div className="form-grid">
            <label>Education<input value={profileForm.education} onChange={e=>setProfileForm(p=>({...p,education:e.target.value}))} placeholder="e.g. B.Tech Computer Science"/></label>
            <label>Current role<input value={profileForm.current_role} onChange={e=>setProfileForm(p=>({...p,current_role:e.target.value}))}/></label>
            <label>Target domain<select value={profileForm.target_domain} onChange={e=>setProfileForm(p=>({...p,target_domain:e.target.value}))}>{['Frontend Developer','Backend Developer','ML Engineer','Data Analyst','Product Manager','UI/UX Designer'].map(x=><option key={x}>{x}</option>)}</select></label>
            <label>Experience<select value={profileForm.experience_level} onChange={e=>setProfileForm(p=>({...p,experience_level:e.target.value}))}><option>Beginner</option><option>Some experience</option><option>Experienced</option></select></label>
            <label>Learning style<select value={profileForm.learning_style} onChange={e=>setProfileForm(p=>({...p,learning_style:e.target.value}))}><option>Project-based</option><option>Video-based</option><option>Reading and notes</option><option>Practice-first</option></select></label>
            <label>Hours available per week<input type="number" min="1" max="80" value={profileForm.hours_per_week} onChange={e=>setProfileForm(p=>({...p,hours_per_week:Number(e.target.value)}))}/></label>
          </div><div className="form-footer"><span>Profile information is private to your signed-in account.</span><button className="primary-button" disabled={!accessToken} onClick={async()=>{try{await saveUserProfile(profileForm);setTarget((profileForm.target_domain==='ML Engineer'?'ML Engineer':profileForm.target_domain) as Career);setCurrentRole(profileForm.current_role);setTab('Domain learning');setProfileMessage('Your profile has been saved.');}catch(e){setProfileMessage(e instanceof Error?e.message:'Could not save profile.')}}}>Save profile and personalise →</button></div>{profileMessage&&<div className="notice">{profileMessage}</div>}</section></>}
          {tab === 'How to use' && <><div className="page-intro"><div className="eyebrow">GETTING STARTED</div><h1>Your guide to <em>CareerPivotCoach.</em></h1><p>Follow these steps to turn your career goal into a practical learning plan.</p></div><div className="career-catalog">{[['01','Create your account','Sign up to keep your profile, assessments and progress private to you.'],['02','Complete your profile','Tell us about your education, experience, interests and weekly study time.'],['03','Choose a career direction','Select a target domain and explore the skills commonly used in that role.'],['04','Take your skill assessment','Select skills and rate your proficiency. Treat the result as a starting estimate, not a hiring prediction.'],['05','Follow your roadmap','Work through focused topics and portfolio projects at a pace that fits your schedule.'],['06','Practise and review','Use the coach, resume review and interview studio, then compare your progress over time.']].map(([n,title,desc])=><article className="career-card" key={n}><span className="tag">{n}</span><h3>{title}</h3><p>{desc}</p></article>)}</div></>}
          {tab === 'Domain learning' && <><div className="page-intro"><div className="eyebrow">PERSONALISED LEARNING</div><h1>Learn for your <em>{target} path.</em></h1><p>{domainContent?.overview || 'Explore a curated starter path for your target domain.'}</p></div><div className="analysis-grid"><section className="panel"><h3>Core topics</h3><div className="skill-list">{(domainContent?.topics || ['Fundamentals','Tools and workflows','Applied practice']).map((x,i)=><div className="skill-line" key={x}><span className="skill-status matched">{i+1}</span><div><strong>{x}</strong><small>Suggested learning area</small></div></div>)}</div></section><section className="panel"><h3>Portfolio projects</h3>{(domainContent?.projects || []).map(x=><p className="task-tip" key={x}>{x}</p>)}</section><section className="panel"><h3>Practice questions</h3>{(domainContent?.practice || []).map(x=><p className="task-tip" key={x}>{x}</p>)}</section></div></>}


          {tab === 'Courses & inspiration' && <><div className="page-intro"><div className="eyebrow">YOUR PERSONAL LEARNING UNIVERSE</div><h1>Ideas for your <em>next chapter.</em></h1><p>Profile-aware recommendations for courses, projects, books, creators and a realistic career trajectory. These are curated suggestions ranked using content similarity—not predictions of success.</p></div>
            {!accessToken && <div className="notice">Sign in and complete your profile to save a personal recommendation set. <button onClick={()=>setAuthOpen(true)}>Sign in →</button></div>}
            <div className="analysis-grid"><section className="panel"><h3>Career directions to explore</h3>{(recommendations?.career_paths || [target, 'Backend Developer', 'Data Analyst']).map((x,i)=><div className="skill-line" key={x}><span className="skill-status matched">{i+1}</span><div><strong>{x}</strong><small>Explore adjacent roles and transferable skills</small></div><button className="tiny-button" onClick={()=>{if(Object.keys(careerSkills).includes(x))setTarget(x as Career);setTab('Career paths')}}>Explore</button></div>)}</section>
            <section className="panel"><h3>Portfolio projects picked for you</h3>{(recommendations?.projects || [suggestedProject]).map(x=><p className="task-tip" key={x}>{x}</p>)}</section>
            <section className="panel"><h3>Courses & guided learning</h3>{(recommendations?.courses || []).map(x=><article className="resource-item" key={x.title}><strong>{x.title}</strong><small>{x.provider} · {x.reason}</small><a href={x.url} target="_blank" rel="noreferrer">Explore course ↗</a></article>)}</section>
            <section className="panel"><h3>Books for your bookshelf</h3>{(recommendations?.books || []).map(x=><article className="resource-item" key={x.title}><strong>{x.title}</strong><small>{x.author} · {x.reason}</small></article>)}</section>
            <section className="panel"><h3>People worth learning from</h3>{(recommendations?.creators || []).map(x=><article className="resource-item" key={x.name}><strong>{x.name}</strong><small>{x.platform} · {x.focus}</small><a href={x.url} target="_blank" rel="noreferrer">Follow / learn ↗</a></article>)}</section>
            <section className="panel"><h3>Your career trajectory</h3><div className="trajectory">{(recommendations?.trajectory || ['Strengthen fundamentals','Build a focused portfolio','Get feedback and apply']).map((x,i)=><div className="trajectory-step" key={x}><span>{String(i+1).padStart(2,'0')}</span><p>{x}</p></div>)}</div></section></div>
            <section className="panel inspiration-quote"><span className="eyebrow">A THOUGHT TO CARRY WITH YOU</span><blockquote>“{recommendations?.quote.text || 'Great things are done by a series of small things brought together.'}”</blockquote><p>— {recommendations?.quote.author || 'Vincent van Gogh'}</p></section>
          </>}

          {tab === 'Assessment history' && <>
            <div className="page-intro"><div className="eyebrow">YOUR PROGRESS OVER TIME</div><h1>Every step <em>counts.</em></h1><p>Your account's private assessment history and readiness trend.</p></div>{!accessToken && <div className="notice">Sign in to view your private assessment history. <button onClick={()=>setAuthOpen(true)}>Sign in →</button></div>}{accessToken && analytics && <section className="panel analytics-panel"><div className="panel-heading"><div><h3>Readiness over time</h3><p>{analytics.assessment_count} saved assessments · personal account data</p></div><span className="tag">DATABASE ANALYTICS</span></div>{analytics.readiness_history.length ? <div className="readiness-chart">{analytics.readiness_history.map((point,index)=><div className="readiness-bar-item" key={point.date+'-'+index}><strong>{point.score}%</strong><div className="readiness-bar-track"><div style={{height: point.score+'%'}} /></div><small>{new Date(point.date).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</small><span>{point.target_role}</span></div>)}</div> : <p className="empty-note">Complete a few assessments to see your progress chart.</p>}</section>}
            {historyLoading && <div className="notice">Loading your assessment history…</div>}
            {historyError && <div className="notice" role="alert">{historyError}</div>}
            {accessToken && !historyLoading && assessmentHistory.length === 0 && <section className="panel"><h3>No saved assessments yet</h3><p>Complete your career assessment to create your first history entry.</p><button className="primary-button" onClick={() => setTab('Career assessment')}>Start assessment →</button></section>}
            {assessmentHistory.length > 0 && <div className="history-list">{assessmentHistory.map((item) => <article className="panel history-card" key={item.id}><div><span className="eyebrow">{new Date(item.created_at).toLocaleString()}</span><h3>{item.current_role} → {item.target_role}</h3><p>{item.experience_years} years reported experience</p></div><div className="history-score"><strong>{item.readiness_score}%</strong><span>readiness estimate</span></div></article>)}</div>}
          </>}
          <footer className="footer"><span>© 2026 CareerPivotCoach</span><span>Built for clarity, not guesswork <b>✦</b></span></footer>
        </div>
      </main>
      </>}
      {authOpen && <div className="auth-overlay" role="dialog" aria-modal="true" aria-label={authMode === 'login' ? 'Log in' : 'Create account'}>
        <div className="auth-visual"><button className="auth-close" onClick={() => setAuthOpen(false)} aria-label="Close sign in"><X size={19}/></button><div className="auth-brand"><div className="brand-mark">CP</div><strong>CareerPivot</strong></div><div className="auth-visual-copy"><span className="tag">YOUR NEXT CHAPTER</span><h2>Build a career that feels <em>like you.</em></h2><p>Your skills, your direction, your momentum — all in one thoughtful workspace.</p><div className="auth-orbit"><div className="auth-orbit-ring"/><div className="auth-orbit-ring second"/><div className="auth-orbit-core"><Sparkles size={30}/></div><span className="auth-float one">✦ Skills</span><span className="auth-float two">↗ Growth</span></div></div><span className="auth-visual-foot">CAREERPIVOTCOACH · CAREER BRIDGE ENGINE</span></div>
        <div className="auth-form-side"><div className="auth-form-wrap"><div className="auth-mobile-brand"><div className="brand-mark">CP</div><strong>CareerPivot</strong></div><div className="eyebrow">{authMode === 'login' ? 'WELCOME BACK' : 'START YOUR JOURNEY'}</div><h2>{authMode === 'login' ? 'Good to see you again.' : 'Create your workspace.'}</h2><p className="auth-subtitle">{authMode === 'login' ? 'Sign in to continue building your next move.' : 'A few details and your next chapter begins.'}</p>
          <div className="auth-provider-grid"><button type="button" onClick={() => setAuthMessage('Google sign-in needs OAuth client credentials. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the backend environment to enable it.')}><span className="provider-brand google-brand">G</span> Continue with Google</button><button type="button" onClick={() => setAuthMessage('GitHub sign-in needs OAuth app credentials. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to the backend environment to enable it.')}><span className="provider-brand github-brand">GH</span> GitHub</button></div><div className="auth-divider"><span>or continue with email</span></div>
          <form className="auth-form" onSubmit={async (event) => { event.preventDefault(); setAuthLoading(true); setAuthMessage(''); try { const user = await authenticate(authMode, { ...(authMode === 'signup' ? { name: authName } : {}), email: authEmail, password: authPassword }); setAccessTokenState(localStorage.getItem('cpc-access-token') || ''); setName(user.name); setShowLanding(false); setAuthOpen(false); setAuthPassword(''); if (authMode === 'signup' || !user.profile || Object.keys(user.profile).length === 0) setTab('Profile setup'); else { setProfileForm(p => ({...p, ...(user.profile as Partial<UserProfile>)})); setCurrentRole(String(user.profile.current_role || 'Student')); setTab('Overview'); } } catch (error) { setAuthMessage(error instanceof Error ? error.message : 'Authentication failed.'); } finally { setAuthLoading(false); } }}>{authMode === 'signup' && <label>Full name<input required minLength={2} value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="Your name" /></label>}<label>Email address<input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="you@example.com" /></label><label>Password<input type="password" required minLength={8} value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="At least 8 characters" /></label>{authMode === 'signup' && <label className="auth-check"><input type="checkbox" required/> <span>I agree to the terms and privacy policy.</span></label>}<button className="primary-button auth-submit" type="submit" disabled={authLoading}>{authLoading ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16}/></button></form>
          {authMessage && <div className="auth-message" role="status">{authMessage}</div>}<p className="auth-switch">{authMode === 'login' ? "Don't have an account?" : 'Already have an account?'} <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthMessage('') }}>{authMode === 'login' ? 'Create account' : 'Sign in'}</button></p><button className="guest-link" onClick={() => setAuthOpen(false)}>Continue in preview mode <ArrowRight size={14}/></button><p className="auth-privacy"><LockKeyhole size={12}/> Email and password sign-in is connected. Google/GitHub OAuth is not enabled.</p>
        </div></div>
      </div>}
    </div>
  )
}

export default App




