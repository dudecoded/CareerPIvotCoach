$p = ".\src\App.tsx"
$c = Get-Content $p -Raw

# Remove the unused history state for now.
$c = $c -replace "\s*const \[history, setHistory\] = useState<any\[\]>\(\[\]\)", ""

# Ensure the assessment button calls the backend.
$old = "onClick={()=> { setAssessmentDone(true); setTab('Skill gaps') }}"
$new = @"
onClick={async () => {
  setApiLoading(true);
  setApiError('');
  try {
    const result = await saveAssessment({
      current_role: currentRole,
      target_role: target === 'ML Engineer' ? 'Machine Learning Engineer' : target,
      experience_years: experience === 'Beginner' ? 0 : experience === 'Some experience' ? 2 : 5,
      skills: selectedSkills.map(s => s.toLowerCase())
    });
    setApiResult(result);
    setAssessmentDone(true);
    setTasks(result.roadmap.map(phase => ({
      phase: phase.period,
      title: phase.title,
      detail: phase.tasks.map(t => t.task).join(' · '),
      done: false
    })));
    setTab('Skill gaps');
  } catch (e) {
    setApiError(e instanceof Error ? e.message : 'Could not connect to backend');
  } finally {
    setApiLoading(false);
  }
}}
"@

$c = $c.Replace($old, $new.Trim())

# Show API errors and loading status in the main content area.
$c = $c.Replace(
  '<div className="content">',
  '<div className="content">{apiError && <div className="notice">Backend error: {apiError}</div>}{apiLoading && <div className="notice">Analysing and saving assessment...</div>}'
)

# Display backend recommendation.
$c = $c.Replace(
  '<p>Your analysis is based on the skills you selected',
  '<p>{apiResult?.recommendation ?? ""} Your analysis is based on the skills you selected'
)

# Display the backend's score explanation.
$c = $c.Replace(
  'This score measures selected-skill coverage only. It is not a job-readiness or employment prediction.',
  '{apiResult?.score_note ?? "This score measures selected-skill coverage only. It is not a job-readiness or employment prediction."}'
)

Set-Content -Path $p -Value $c -Encoding UTF8

Write-Host "Repair applied. Testing frontend build..." -ForegroundColor Green
npm run build
