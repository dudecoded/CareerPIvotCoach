$p = ".\src\App.tsx"
$c = Get-Content $p -Raw

if ($c -notmatch "from './api'") {
  $c = $c.Replace(
    "import './index.css'",
    "import './index.css'`r`nimport { saveAssessment, getAssessmentHistory, type AssessmentResult } from './api'"
  )
}

$c = $c.Replace(
  "  const [question, setQuestion] = useState('')",
  "  const [question, setQuestion] = useState('')`r`n  const [apiResult, setApiResult] = useState<AssessmentResult | null>(null)`r`n  const [apiError, setApiError] = useState('')`r`n  const [apiLoading, setApiLoading] = useState(false)`r`n  const [history, setHistory] = useState<any[]>([])"
)

$c = $c.Replace(
  "  const required = careerSkills[target]",
  "  const required = careerSkills[target]"
)

$c = $c.Replace(
  "  const matched = required.filter((skill) => selectedSkills.some((s) => s.toLowerCase() === skill.toLowerCase()))",
  "  const matched = apiResult ? apiResult.matched_skills : required.filter((skill) => selectedSkills.some((s) => s.toLowerCase() === skill.toLowerCase()))"
)

$c = $c.Replace(
  "  const gaps = required.filter((skill) => !matched.includes(skill))",
  "  const gaps = apiResult ? apiResult.skill_gaps.map((g) => g.skill) : required.filter((skill) => !matched.includes(skill))"
)

$c = $c.Replace(
  "  const readiness = Math.round((matched.length / required.length) * 100)",
  "  const readiness = apiResult ? apiResult.readiness_score : Math.round((matched.length / required.length) * 100)"
)

$old = "onClick={()=> { setAssessmentDone(true); setTab('Skill gaps') }}"
$new = "onClick={async () => { setApiLoading(true); setApiError(''); try { const result = await saveAssessment({ current_role: currentRole, target_role: target === 'ML Engineer' ? 'Machine Learning Engineer' : target, experience_years: experience === 'Beginner' ? 0 : experience === 'Some experience' ? 2 : 5, skills: selectedSkills.map(s => s.toLowerCase()) }); setApiResult(result); setAssessmentDone(true); setTasks(result.roadmap.map((phase, i) => ({ phase: phase.period, title: phase.title, detail: phase.tasks.map(t => t.task).join(' · '), done: false }))); setTab('Skill gaps'); } catch (e) { setApiError(e instanceof Error ? e.message : 'Could not connect to backend'); } finally { setApiLoading(false); } }}"
$c = $c.Replace($old, $new)

$c = $c.Replace(
  "<div className=`"content`">",
  "<div className=`"content`">{apiError && <div className=`"notice`">Backend error: {apiError}</div>}{apiLoading && <div className=`"notice`">Analysing your career profile and saving assessment...</div>}"
)

$c = $c.Replace(
  "Your analysis is based on the skills you selected",
  "Your analysis is based on the skills you selected"
)

$c = $c.Replace(
  "<p>Your analysis is based on the skills you selected",
  "<p>{apiResult?.recommendation ?? ''} Your analysis is based on the skills you selected"
)

$c = $c.Replace(
  "This score measures selected-skill coverage only. It is not a job-readiness or employment prediction.",
  "{apiResult?.score_note ?? 'This score measures selected-skill coverage only. It is not a job-readiness or employment prediction.'}"
)

Set-Content -Path $p -Value $c -Encoding UTF8
Write-Host "App.tsx updated. Running the production build now..." -ForegroundColor Green
npm run build
