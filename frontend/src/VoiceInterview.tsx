import { useEffect, useMemo, useRef, useState } from 'react'
import { Brain, Clock3, Maximize, Mic, MicOff, RotateCcw, Send, ShieldCheck, Volume2 } from 'lucide-react'

type SpeechResult = { 0: { transcript: string }; isFinal: boolean }
type RecognitionEvent = { resultIndex: number; results: ArrayLike<SpeechResult> }
type RecognitionError = { error: string }
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: RecognitionError) => void) | null
  onend: (() => void) | null
  start: () => void; stop: () => void
}
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }

const QUESTION_BANK: Record<string, string[]> = {
  frontend: [
    'Tell me about yourself and why you are interested in frontend development.',
    'What happens when a user enters a URL in the browser and presses Enter?',
    'Explain the difference between state and props in React.',
    'How would you improve the performance of a slow React application?',
    'How do you make a web interface accessible and responsive?',
    'Describe a project you built, the hardest problem you faced, and how you solved it.',
    'How would you debug an API request that works locally but fails in production?',
  ],
  data: [
    'Tell me about yourself and why you are interested in data science or machine learning.',
    'Explain the bias-variance trade-off in your own words.',
    'What is the difference between classification and regression?',
    'How would you handle missing values and categorical features in a dataset?',
    'Explain precision, recall and why accuracy can be misleading.',
    'How would you detect data leakage in a machine learning workflow?',
    'Describe a machine learning project and how you evaluated its results.',
  ],
  general: [
    'Tell me about yourself and what you are looking for in your next role.',
    'Walk me through a project or achievement you are proud of.',
    'Describe a difficult problem you solved. What was your approach?',
    'Tell me about a time you received critical feedback.',
    'How do you prioritise tasks when several deadlines overlap?',
    'What is one skill you are actively improving, and how?',
    'Why should we select you for this opportunity?',
  ],
}

const DOMAIN_QUESTIONS: Record<string, string[]> = {
  frontend: QUESTION_BANK.frontend,
  backend: ['Design a REST API for user management.', 'Explain authentication versus authorization.', 'How do database indexes affect performance?', 'How would you debug a slow API?', 'Explain transactions and ACID.', 'How would you secure an API?', 'Describe a backend project and a trade-off you made.'],
  data: QUESTION_BANK.data,
  cybersecurity: ['Explain vulnerability, threat and risk.', 'How would you investigate suspicious login activity?', 'Compare symmetric and asymmetric encryption.', 'How would you prioritise security findings?', 'Explain SQL injection and prevention.', 'How would you investigate an intrusion alert?', 'Describe a security project and its evaluation.'],
  general: QUESTION_BANK.general,
}
function questionSet(domain: string, role: string, difficulty: string, focus: string) {
  const base = DOMAIN_QUESTIONS[domain] ?? QUESTION_BANK.general
  const topic = focus || domain
  const specific = difficulty === 'Advanced'
    ? `Design and defend an end-to-end ${topic} solution for ${role}, including trade-offs and failure modes.`
    : difficulty === 'Beginner'
      ? `Explain the core concepts of ${topic} that a beginner ${role} should understand, using a simple example.`
      : `Walk through a practical ${topic} problem for a ${role} and explain your solution step by step.`
  return [...base, specific]
}

function assessAnswer(answer: string) {
  const words = answer.trim().split(/\\s+/).filter(Boolean)
  const lower = answer.toLowerCase()
  const hasStructure = /first|second|finally|because|therefore|for example|result|impact|learned/.test(lower)
  const hasExample = /for example|such as|project|when i|i built|i worked/.test(lower)
  const length = Math.min(100, Math.round(words.length / 1.2))
  const structure = hasStructure ? 85 : words.length > 35 ? 60 : 35
  const specificity = hasExample ? 85 : 40
  const overall = Math.round(length * .35 + structure * .3 + specificity * .35)
  return { overall, length, structure, specificity, words: words.length }
}

export default function VoiceInterview({ targetRole, startCamera, cameraActive, cameraStream, cameraMetrics }: {
  targetRole: string
  startCamera: () => Promise<boolean>
  cameraActive: boolean
  cameraStream: MediaStream | null
  cameraMetrics: { faceVisible: boolean; handsVisible: number; gaze: string }
}) {
  const [domain, setDomain] = useState('frontend')
  const [focus, setFocus] = useState('')
  const [difficulty, setDifficulty] = useState('Intermediate')
  const [timeLimit, setTimeLimit] = useState(15)
  const questions = useMemo(() => questionSet(domain, targetRole, difficulty, focus), [domain, targetRole, difficulty, focus])
  const [count, setCount] = useState(5)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [transcript, setTranscript] = useState<{ question: string; answer: string; score: ReturnType<typeof assessAnswer> }[]>([])
  const [active, setActive] = useState(false)
  const [paused, setPaused] = useState(false)
  const [finished, setFinished] = useState(false)
  const [listening, setListening] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [cameraSamples, setCameraSamples] = useState({ total: 0, face: 0, screen: 0, hands: 0 })
  const [notice, setNotice] = useState('')
  const [interim, setInterim] = useState('')
  const recognitionRef = useRef<Recognition | null>(null)
  const roomRef = useRef<HTMLElement>(null)
  const liveVideoRef = useRef<HTMLVideoElement>(null)
  const [questionsForSession, setQuestionsForSession] = useState<string[]>([])
  const currentQuestion = questionsForSession[questionIndex] ?? ''
  const cameraMetricsRef = useRef(cameraMetrics)
  cameraMetricsRef.current = cameraMetrics

  useEffect(() => {
    if (!active || finished) return
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    const cameraTimer = window.setInterval(() => setCameraSamples((old) => ({
      total: old.total + 1,
      face: old.face + (cameraMetricsRef.current.faceVisible ? 1 : 0),
      screen: old.screen + (cameraMetricsRef.current.gaze === 'Generally toward screen' ? 1 : 0),
      hands: old.hands + (cameraMetricsRef.current.handsVisible > 0 ? 1 : 0),
    })), 1000)
    return () => { window.clearInterval(timer); window.clearInterval(cameraTimer) }
  }, [active, finished])

  useEffect(() => {
    const handleFullscreen = () => {
      if (active && document.fullscreenElement !== roomRef.current) {
        setActive(false)
        setPaused(true)
        setListening(false)
        recognitionRef.current?.stop()
        window.speechSynthesis?.cancel()
        setNotice('Fullscreen was exited. Your session is paused. Re-enter fullscreen to continue.')
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreen)
    return () => document.removeEventListener('fullscreenchange', handleFullscreen)
  }, [active])

  useEffect(() => () => {
    recognitionRef.current?.stop()
    window.speechSynthesis?.cancel()
  }, [])

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.94
    window.speechSynthesis.speak(utterance)
  }

  const start = async () => {
    const sessionQuestions = [...questions].sort(() => Math.random() - .5).slice(0, count)
    setQuestionsForSession(sessionQuestions)
    setQuestionIndex(0)
    setTranscript([])
    setAnswer('')
    setSeconds(0)
    setCameraSamples({ total: 0, face: 0, screen: 0, hands: 0 })
    setFinished(false)
    if (!document.fullscreenElement) {
      try {
        await roomRef.current?.requestFullscreen()
      } catch {
        setNotice('Please allow fullscreen to begin. The interview cannot start without it.')
        return
      }
    }
    const cameraReady = cameraActive || await startCamera()
    if (!cameraReady) { setNotice('Camera access is required. Allow camera permission and try again.'); return }
    setNotice('')
    setActive(true)
    setPaused(false)
    speak(sessionQuestions[0] ?? '')
  }

  const startListening = () => {
    const SpeechRecognitionCtor = (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition
    if (!SpeechRecognitionCtor) {
      setNotice('Speech recognition is not supported in this browser. Use the answer box below, or try the latest Chrome or Edge.')
      return
    }
    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'en-IN'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) finalText += result[0].transcript + ' '
        else interimText += result[0].transcript
      }
      if (finalText) setAnswer((previous) => (previous + ' ' + finalText).trim())
      setInterim(interimText)
    }
    recognition.onerror = (event) => setNotice(`Microphone recognition: ${event.error}. You can continue by typing your answer.`)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    try {
      recognition.start()
      setListening(true)
      setNotice('Listening… speak clearly. Select Stop listening when you finish.')
    } catch {
      setNotice('Could not start speech recognition. Check microphone permission and try again.')
    }
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setListening(false)
    setInterim('')
  }

  const submitAnswer = () => {
    stopListening()
    const clean = answer.trim()
    if (!clean) {
      setNotice('Add or dictate an answer before moving to the next question.')
      return
    }
    const question = currentQuestion
    setTranscript((previous) => [...previous, { question, answer: clean, score: assessAnswer(clean) }])
    setAnswer('')
    setInterim('')
    if (questionIndex + 1 >= questionsForSession.length) {
      setActive(false)
      setFinished(true)
      window.speechSynthesis?.cancel()
      return
    }
    const next = questionIndex + 1
    setQuestionIndex(next)
    speak(questionsForSession[next])
    setNotice('Answer saved. Here is your next question.')
  }

  const endSession = () => {
    stopListening()
    setActive(false)
    setFinished(true)
    window.speechSynthesis?.cancel()
  }

  const remaining = Math.max(0, timeLimit * 60 - seconds)
  useEffect(() => { if (active && remaining === 0) endSession() }, [active, remaining])
  const average = transcript.length ? Math.round(transcript.reduce((sum, item) => sum + item.score.overall, 0) / transcript.length) : 0
  const mmss = `${Math.floor(remaining / 60).toString().padStart(2, '0')}:${(remaining % 60).toString().padStart(2, '0')}`

  return (
    <section ref={roomRef} className="panel voice-interview">
      <div className="voice-heading"><div><span className="eyebrow">STAGE 3 · VOICE INTERVIEW ENGINE</span><h2>Mock interview room</h2><p>Speak your answers, practise under timed conditions, and review a structured feedback summary.</p></div><span className="voice-fullscreen-badge"><Maximize size={13}/> FULLSCREEN REQUIRED</span></div>
      {!active && !finished && !paused && <div className="voice-setup">
        <div className="voice-setup-copy"><Brain size={24}/><h3>Prepare for your {targetRole} interview</h3><p>Questions are selected from a built-in role-based bank. The interviewer can read each question aloud and capture your spoken response.</p></div>
        <div className="voice-config-grid">
        <label>Domain<select value={domain} onChange={(event) => setDomain(event.target.value)}><option value="frontend">Frontend development</option><option value="backend">Backend development</option><option value="data">Data science / ML</option><option value="cybersecurity">Cybersecurity</option><option value="general">General / behavioural</option></select></label>
        <label>Specific topic<input value={focus} onChange={(event) => setFocus(event.target.value)} placeholder="e.g. React hooks, FastAPI, NLP"/></label>
        <label>Difficulty<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
        <label>Time limit<select value={timeLimit} onChange={(event) => setTimeLimit(Number(event.target.value))}><option value={10}>10 minutes</option><option value={15}>15 minutes</option><option value={20}>20 minutes</option><option value={30}>30 minutes</option></select></label>
        <label>Question count<select value={count} onChange={(event) => setCount(Number(event.target.value))}><option value={5}>5 questions</option><option value={7}>7 questions</option></select></label>
      </div>
      <p className="voice-camera-required">Camera is required and stays active while you answer. Visual signals are sampled throughout.</p>
        <div className="voice-fullscreen-note"><ShieldCheck size={16}/><span>Fullscreen is mandatory once a session starts. If you exit fullscreen, the session pauses. This is a focus setting, not a proctoring or cheating detector.</span></div>
        <button className="primary-button" onClick={() => void start()}><Maximize size={15}/> Enter fullscreen & start interview</button>
      </div>}
      {paused && !active && <div className="voice-paused"><strong>Interview paused</strong><p>Fullscreen was exited. Re-enter it to continue from the same question.</p><button className="primary-button" onClick={async () => { try { await roomRef.current?.requestFullscreen(); setPaused(false); setActive(true); speak(currentQuestion); setNotice(''); } catch { setNotice('Fullscreen is required to resume this interview.'); } }}><Maximize size={14}/> Resume in fullscreen</button></div>}
      {active && <div className="voice-session">
        <div className="voice-session-top"><span><i/> SESSION LIVE</span><span><Clock3 size={14}/> {mmss} remaining</span><span className="voice-camera-live">● CAMERA LIVE</span><span>QUESTION {questionIndex + 1} / {questionsForSession.length}</span></div>
        <div className="voice-live-preview"><video ref={liveVideoRef} autoPlay muted playsInline aria-label="Live interview camera preview"/><div className="voice-live-camera-strip"><span>Face: {cameraMetrics.faceVisible ? "visible" : "not detected"}</span><span>Gaze: {cameraMetrics.gaze}</span><span>Hands: {cameraMetrics.handsVisible}/2</span></div></div>
        <div className="voice-question"><span className="eyebrow">INTERVIEWER ASKS</span><h3>{currentQuestion}</h3><button className="voice-secondary" onClick={() => speak(currentQuestion)}><Volume2 size={14}/> Repeat question</button></div>
        <div className="voice-answer-label"><strong>Your answer</strong><span>{listening ? 'Microphone active' : 'Microphone off'}</span></div>
        <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Your speech transcript appears here. You can also type or edit your answer…" rows={6}/>
        {interim && <p className="voice-interim">Hearing: {interim}</p>}
        <div className="voice-controls">{!listening ? <button className="voice-secondary" onClick={startListening}><Mic size={14}/> Start speaking</button> : <button className="voice-stop" onClick={stopListening}><MicOff size={14}/> Stop listening</button>}<button className="primary-button" onClick={submitAnswer}><Send size={14}/> Submit answer</button><button className="voice-text-button" onClick={endSession}>End interview</button></div>
        {notice && <p className="voice-notice" role="status">{notice}</p>}
      </div>}
      {!active && finished && <div className="voice-report">
        <div className="voice-report-score"><span className="eyebrow">PRACTICE SUMMARY</span><strong>{average}<small>/100</small></strong><span>Answer delivery indicator</span></div>
        <div className="voice-report-details"><h3>{transcript.length} answers recorded · {Math.floor(seconds / 60)}m {seconds % 60}s elapsed</h3><div className="voice-camera-report"><strong>Camera observations during interview</strong><span>Face visible: {cameraSamples.total ? Math.round(cameraSamples.face / cameraSamples.total * 100) : 0}% of samples</span><span>Generally screen-facing: {cameraSamples.total ? Math.round(cameraSamples.screen / cameraSamples.total * 100) : 0}% of samples</span><span>Hands visible: {cameraSamples.total ? Math.round(cameraSamples.hands / cameraSamples.total * 100) : 0}% of samples</span><small>Approximate observations only; not confidence, emotion, honesty or candidate-quality scores.</small></div><p>This is heuristic practice feedback based on answer length, signposting and use of examples. It does not verify technical correctness or replace expert evaluation.</p>
          {transcript.map((item, index) => <article className="voice-answer-review" key={index}><strong>Q{index + 1}. {item.question}</strong><p>{item.answer}</p><div><span>{item.score.words} words</span><span>Structure {item.score.structure}/100</span><span>Examples {item.score.specificity}/100</span><b>{item.score.overall}/100</b></div></article>)}
          <button className="primary-button" onClick={() => { setFinished(false); setPaused(false); setTranscript([]); setQuestionIndex(0); setAnswer(''); setSeconds(0); }}><RotateCcw size={14}/> Set up another interview</button>
          {document.fullscreenElement === roomRef.current && <button className="voice-text-button" onClick={() => void document.exitFullscreen()}>Finish & exit fullscreen</button>}
        </div>
      </div>}
      {notice && !active && !finished && <p className="voice-notice" role="status">{notice}</p>}
      <p className="voice-disclaimer"><ShieldCheck size={14}/> Microphone audio is handled through your browser's speech-recognition implementation. Browser support and privacy behaviour vary; speech recognition may use an online service. Review your transcript before submitting.</p>
    </section>
  )
}
