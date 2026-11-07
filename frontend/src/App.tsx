import { useEffect, useMemo, useState } from 'react'
import './index.css'
import { saveAssessment, sendCoachMessage, reviewResume, generateInterviewPrep, getAssessmentHistory, type AssessmentResult, type ResumeReviewResult, type InterviewPrepResult } from './api'

type SkillProficiency = 'Beginner' | 'Intermediate' | 'Advanced'
type Career = 'Data Analyst' | 'Frontend Developer' | 'Backend Developer' | 'ML Engineer' | 'Product Manager' | 'UI/UX Designer'
type Tab = 'Overview' | 'Career assessment' | 'Skill gaps' | 'Roadmap' | 'Career paths' | 'AI coach' | 'Resume review' | 'Interview prep' | 'Assessment history'

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
    const saved: SavedState = { name, currentRole, target, experience, selectedSkills, skillProficiencies, goal, assessmentDone, tasks, chat }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    } catch (error) {
      console.warn('CareerPivotCoach could not save data in this browser.', error)
    }
  }, [name, currentRole, target, experience, selectedSkills, skillProficiencies, goal, assessmentDone, tasks, chat])

  useEffect(() => {
    if (tab !== 'Assessment history') return
    let active = true
    setHistoryLoading(true)
    getAssessmentHistory().then((result) => { if (active) setAssessmentHistory(result.assessments) }).catch((error) => { if (active) setHistoryError(error instanceof Error ? error.message : 'Could not load assessment history.') }).finally(() => { if (active) setHistoryLoading(false) })
    return () => { active = false }
  }, [tab])

  const required = careerSkills[target]
  const matched = apiResult ? apiResult.matched_skills : required.filter((skill) => selectedSkills.some((s) => s.toLowerCase() === skill.toLowerCase()))
  const gaps = apiResult ? apiResult.skill_gaps.map((g) => g.skill) : required.filter((skill) => !matched.includes(skill))
  const readiness = calculateWeightedReadiness(required, selectedSkills, skillProficiencies)
  const completedTasks = tasks.filter((task) => task.done).length
  const progress = Math.round((completedTasks / tasks.length) * 100)

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

  const tabs: Tab[] = ['Overview', 'Career assessment', 'Skill gaps', 'Roadmap', 'Career paths', 'AI coach', 'Resume review', 'Interview prep', 'Assessment history']

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">CP</div><div><strong>CareerPivot</strong><span>CAREER BRIDGE ENGINE</span></div></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>{tabs.map((item, index) => <button key={item} className={`nav-item ${tab === item ? 'active' : ''}`} onClick={() => setTab(item)}><span className="nav-icon">{['◉', '◎', '⌁', '↗', '◇', '✳', '▤', '☷', '◷'][index]}</span>{item}{item === 'Career assessment' && !assessmentDone && <i />}</button>)}</nav>
        <div className="sidebar-bottom"><div className="help-card"><div className="help-icon">✦</div><strong>Your next chapter starts here.</strong><p>Small, consistent steps create career momentum.</p><button onClick={() => setTab('Roadmap')}>View my roadmap →</button></div><div className="profile-mini"><div className="avatar">{name.trim().charAt(0).toUpperCase() || 'U'}</div><div><strong>{name || 'Your profile'}</strong><span>Personal workspace</span></div><span className="dots">•••</span></div></div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{tab}</strong></div><div className="top-actions"><span className="demo-pill"><span /> Demo mode</span><button
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
        <div className="content">{apiError && <div className="notice">Backend error: {apiError}</div>}{apiLoading && <div className="notice">Analysing your career profile and saving assessment...</div>}
          {tab === 'Overview' && <>
            <div className="welcome-row"><div><div className="eyebrow">YOUR CAREER, REIMAGINED</div><h1>Make your next move <em>with confidence.</em></h1><p className="subheading">A clear bridge from where you are to where you want to be.</p></div><button className="primary-button" onClick={() => setTab('Career assessment')}>✦ {assessmentDone ? 'Update assessment' : 'Start assessment'} <span>→</span></button></div>
            <div className="hero-card"><div className="hero-copy"><span className="tag">YOUR CAREER BRIDGE</span><h2>{assessmentDone ? `Your path to ${target}` : 'Your next chapter is closer than you think.'}</h2><p>{assessmentDone ? `You have identified ${matched.length} matching skills. Build the missing skills one step at a time.` : 'Discover the skills you already have, identify what you need next, and turn your ambition into an actionable plan.'}</p><button className="light-button" onClick={() => setTab('Career assessment')}>{assessmentDone ? 'Review my results' : 'Build my career plan'} <span>→</span></button></div><div className="hero-art"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="art-core">✦</div><div className="float-card card-top">↗ <span>New possibilities</span></div><div className="float-card card-bottom"><span className="mini-check">✓</span><span>Skills that transfer</span></div></div></div>
            <div className="section-heading"><div><h2>Your career snapshot</h2><p>A quick look at your progress so far.</p></div><span className="muted-label">UPDATED JUST NOW</span></div>
            <div className="stats-grid"><div className="stat-card"><div className="stat-top"><span>Career readiness</span><span className="stat-symbol purple">◉</span></div><div className="stat-value">{assessmentDone ? readiness : '—'}<small>{assessmentDone ? '%' : 'Start assessment'}</small></div><div className="progress-track"><div style={{ width: `${assessmentDone ? readiness : 0}%` }} /></div><p>{assessmentDone ? 'Weighted by your reported proficiency' : 'Complete your assessment to calculate'}</p></div><div className="stat-card"><div className="stat-top"><span>Transferable skills</span><span className="stat-symbol green">↗</span></div><div className="stat-value">{assessmentDone ? matched.length : selectedSkills.length}<small> identified</small></div><p className="positive">Skills you can build on</p></div><div className="stat-card"><div className="stat-top"><span>Skills to develop</span><span className="stat-symbol orange">⌁</span></div><div className="stat-value">{assessmentDone ? gaps.length : '—'}<small> priority areas</small></div><p>Focus on the highest-impact gaps first</p></div><div className="stat-card"><div className="stat-top"><span>Roadmap progress</span><span className="stat-symbol blue">↗</span></div><div className="stat-value">{progress}<small>%</small></div><div className="progress-track blue-track"><div style={{ width: `${progress}%` }} /></div><p>{completedTasks} of {tasks.length} milestones completed</p></div></div>
            <div className="bottom-grid"><section className="panel"><div className="panel-heading"><div><h3>Your next best action</h3><p>One small step. Meaningful momentum.</p></div><span className="sparkle">✦</span></div><div className="action-row"><div className="action-icon">⌘</div><div className="action-text"><span className="tag soft-tag">RECOMMENDED FOR YOU</span><h4>{assessmentDone ? `Learn ${gaps[0] ?? 'build your portfolio'}` : 'Complete your career assessment'}</h4><p>{assessmentDone ? `Spend 30 minutes practising ${gaps[0] ?? 'your project idea'} today.` : 'Tell us about your background and destination role to personalise your plan.'}</p></div><button className="arrow-button" onClick={() => setTab(assessmentDone ? 'Skill gaps' : 'Career assessment')}>→</button></div></section><section className="panel quote-panel"><div className="quote-mark">“</div><p>Your past experience isn't a detour. It's part of the bridge to what's next.</p><span>YOUR CAREER JOURNEY, YOUR WAY</span><div className="quote-decoration">✳</div></section></div>
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
            })}</div><div className="form-footer"><span>Your data stays in this browser for this demo.</span><button className="primary-button" onClick={async () => { setApiLoading(true); setApiError(''); try { const result = await saveAssessment({ current_role: currentRole, target_role: target === 'ML Engineer' ? 'Machine Learning Engineer' : target, experience_years: experience === 'Beginner' ? 0 : experience === 'Some experience' ? 2 : 5, skills: selectedSkills.map(s => s.toLowerCase()), skill_proficiencies: skillProficiencies }); setApiResult(result); setAssessmentDone(true); setTasks(result.roadmap.map(phase => ({ phase: phase.period, title: phase.title, detail: phase.tasks.map(t => t.task).join(' · '), done: false }))); setTab('Skill gaps'); } catch (e) { setApiError(e instanceof Error ? e.message : 'Could not connect to backend'); } finally { setApiLoading(false); } }}>Generate my career bridge <span>→</span></button></div></section></>}

          {tab === 'Skill gaps' && <><div className="page-intro"><div className="eyebrow">YOUR CAREER BRIDGE</div><h1>See what connects you <em>to your goal.</em></h1><p>{apiResult?.recommendation ?? ''} Your analysis is based on the skills you selected—not a prediction of hiring outcomes.</p></div>{!assessmentDone && <div className="notice">Your results are a starting point. <button onClick={() => setTab('Career assessment')}>Complete the assessment →</button></div>}<div className="analysis-grid"><section className="panel readiness-panel"><div className="panel-heading"><div><h3>Skill coverage</h3><p>{target} · {matched.length} of {required.length} target skills matched</p></div><span className="tag">ESTIMATE</span></div><div className="score-circle" style={{ '--score': `${assessmentDone ? readiness : 0}%` } as React.CSSProperties}><div><strong>{assessmentDone ? readiness : 0}%</strong><span>coverage</span></div></div><p className="center-note">{apiResult?.score_note ?? 'This score measures selected-skill coverage only. It is not a job-readiness or employment prediction.'}</p></section><section className="panel"><div className="panel-heading"><div><h3>Skills you can build on</h3><p>Existing skills that overlap with your target.</p></div><span className="count-badge green-count">{matched.length}</span></div><div className="skill-list">{matched.length ? matched.map((skill) => <div className="skill-line" key={skill}><span className="skill-status matched">✓</span><div><strong>{skill}</strong><small>Selected as an existing skill</small></div><span className="level-label">MATCH</span></div>) : <p className="empty-note">Complete the assessment and select some existing skills.</p>}</div></section><section className="panel gap-panel"><div className="panel-heading"><div><h3>Priority skills to develop</h3><p>Target skills you haven't selected yet.</p></div><span className="count-badge orange-count">{gaps.length}</span></div><div className="skill-list">{gaps.map((skill, index) => <div className="skill-line" key={skill}><span className="skill-status gap">{index + 1}</span><div><strong>{skill}</strong><small>{index === 0 ? 'Start here · first priority' : 'Add to your learning plan'}</small></div><button className="tiny-button" onClick={() => toggleSkill(skill)}>Mark learned</button></div>)}</div></section><section className="panel project-panel"><span className="tag soft-tag">PUT IT INTO PRACTICE</span><h3>Build proof, not just knowledge.</h3><p>A portfolio project helps you practise several skills together and gives you something concrete to discuss.</p><div className="project-suggestion"><span className="project-icon">✦</span><div><strong>{suggestedProject}</strong><small>Suggested starter project for {target}</small></div></div><button className="text-button" onClick={() => setTab('Roadmap')}>Add to my roadmap →</button></section></div></>}

          {tab === 'Roadmap' && <><div className="page-intro"><div className="eyebrow">YOUR 90-DAY PLAN</div><h1>Progress, one <em>step at a time.</em></h1><p>A flexible starter roadmap. Adjust the pace to fit your schedule.</p></div><div className="roadmap-summary"><div><span className="eyebrow">ROADMAP COMPLETION</span><strong>{progress}%</strong><div className="progress-track"><div style={{ width: `${progress}%` }} /></div></div><div><span className="eyebrow">TARGET ROLE</span><strong>{target}</strong><small>{goal}</small></div><div><span className="eyebrow">PROJECT TO BUILD</span><strong className="project-title">{suggestedProject}</strong></div></div><div className="roadmap-list">{tasks.map((task, index) => <section className={`roadmap-item ${task.done ? 'task-done' : ''}`} key={task.phase}><button className={`task-check ${task.done ? 'checked' : ''}`} onClick={() => setTasks((current) => current.map((t, i) => i === index ? { ...t, done: !t.done } : t))}>{task.done ? '✓' : ''}</button><div className="roadmap-content"><span className="eyebrow">{task.phase}</span><h3>{task.title}</h3><p>{task.detail}</p>{index === 0 && <div className="task-tip">Suggested focus: {gaps[0] ?? required[0]}. Practise consistently and keep notes on what you learn.</div>}{index === 1 && <div className="task-tip">Project idea: {suggestedProject}.</div>}{index === 2 && <div className="task-tip">Prepare a short explanation of your project, decisions, and lessons learned.</div>}</div><span className={`status-tag ${task.done ? 'done-tag' : ''}`}>{task.done ? 'COMPLETED' : 'UP NEXT'}</span></section>)}</div></>}

          {tab === 'Career paths' && <><div className="page-intro"><div className="eyebrow">EXPLORE YOUR OPTIONS</div><h1>There is more than <em>one way forward.</em></h1><p>Explore a few common career directions and choose one to analyse.</p></div><div className="career-catalog">{(Object.keys(careerSkills) as Career[]).map((career, index) => <article className={`career-card ${target === career ? 'current-career' : ''}`} key={career}><div className="career-card-top"><span className="choice-icon">{['◈', '⌘', '⌁', '✳', '◇', '◈'][index]}</span>{target === career && <span className="tag">SELECTED</span>}</div><h3>{career}</h3><p>{['Turn data into clear insights that help teams make decisions.', 'Build accessible, responsive interfaces for web experiences.', 'Create APIs, services and systems that power applications.', 'Develop and evaluate machine-learning solutions.', 'Connect user needs, business goals and product delivery.', 'Design intuitive digital experiences around real user needs.'][index]}</p><div className="career-skills">{careerSkills[career].slice(0, 4).map((skill) => <span key={skill}>{skill}</span>)}</div><button className="text-button" onClick={() => { setTarget(career); setAssessmentDone(true); setTab('Skill gaps') }}>Explore this path →</button></article>)}</div></>}

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
          {tab === 'Assessment history' && <>
            <div className="page-intro"><div className="eyebrow">YOUR PROGRESS OVER TIME</div><h1>Every step <em>counts.</em></h1><p>Review assessments saved to the local CareerPivotCoach database.</p></div>
            {historyLoading && <div className="notice">Loading your assessment history…</div>}
            {historyError && <div className="notice" role="alert">{historyError}</div>}
            {!historyLoading && assessmentHistory.length === 0 && <section className="panel"><h3>No saved assessments yet</h3><p>Complete your career assessment to create your first history entry.</p><button className="primary-button" onClick={() => setTab('Career assessment')}>Start assessment →</button></section>}
            {assessmentHistory.length > 0 && <div className="history-list">{assessmentHistory.map((item) => <article className="panel history-card" key={item.id}><div><span className="eyebrow">{new Date(item.created_at).toLocaleString()}</span><h3>{item.current_role} → {item.target_role}</h3><p>{item.experience_years} years reported experience</p></div><div className="history-score"><strong>{item.readiness_score}%</strong><span>readiness estimate</span></div></article>)}</div>}
          </>}
          <footer className="footer"><span>© 2026 CareerPivotCoach</span><span>Built for clarity, not guesswork <b>✦</b></span></footer>
        </div>
      </main>
    </div>
  )
}

export default App




