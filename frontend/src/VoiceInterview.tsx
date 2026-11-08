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

function questionSet(role: string) {
  const value = role.toLowerCase()
  if (/front.?end|react|web developer|ui developer/.test(value)) return QUESTION_BANK.frontend
  if (/data|machine learning|ml|ai engineer/.test(value)) return QUESTION_BANK.data
  return QUESTION_BANK.general
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

export default function VoiceInterview({ targetRole }: { targetRole: string }) {
  const questions = useMemo(() => questionSet(targetRole), [targetRole])
  const [count, setCount] = useState(5)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [transcript, setTranscript] = useState<{ question: string; answer: string; score: ReturnType<typeof assessAnswer> }[]>([])
  const [active, setActive] = useState(false)
  const [finished, setFinished] = useState(false)
  const [listening, setListening] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [notice, setNotice] = useState('')
  const [interim, setInterim] = useState('')
  const recognitionRef = useRef<Recognition | null>(null)
  const answerRef = useRef(answer)
  const questionsForSession = useRef<string[]>([])
  answerRef.current = answer
  const currentQuestion = questionsForSession.current[questionIndex]

  useEffect(() => {
    if (!active || finished) return
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [active, finished])

  useEffect(() => {
    const handleFullscreen = () => {
      if (active && !document.fullscreenElement) {
        setActive(false)
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
    questionsForSession.current = [...questions].sort(() => Math.random() - .5).slice(0, count)
    setQuestionIndex(0)
    setTranscript([])
    setAnswer('')
    setSeconds(0)
    setFinished(false)
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen()
      } catch {
        setNotice('Please allow fullscreen to begin. The interview cannot start without it.')
        return
      }
    }
    setNotice('')
    setActive(true)
    speak(questionsForSession.current[0])
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
    if (questionIndex + 1 >= questionsForSession.current.length) {
      setActive(false)
      setFinished(true)
      window.speechSynthesis?.cancel()
      return
    }
    const next = questionIndex + 1
    setQuestionIndex(next)
    speak(questionsForSession.current[next])
    setNotice('Answer saved. Here is your next question.')
  }

  const endSession = () => {
    stopListening()
    setActive(false)
    setFinished(true)
    window.speechSynthesis?.cancel()
  }

  const average = transcript.length ? Math.round(transcript.reduce((sum, item) => sum + item.score.overall, 0) / transcript.length) : 0
  const mmss = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`

  return (
    <section className="panel voice-interview">
      <div className="voice-heading"><div><span className="eyebrow">STAGE 3 · VOICE INTERVIEW ENGINE</span><h2>Mock interview room</h2><p>Speak your answers, practise under timed conditions, and review a structured feedback summary.</p></div><span className="voice-fullscreen-badge"><Maximize size={13}/> FULLSCREEN REQUIRED</span></div>
      {!active && !finished && <div className="voice-setup">
        <div className="voice-setup-copy"><Brain size={24}/><h3>Prepare for your {targetRole} interview</h3><p>Questions are selected from a built-in role-based bank. The interviewer can read each question aloud and capture your spoken response.</p></div>
        <label>Interview length<select value={count} onChange={(event) => setCount(Number(event.target.value))}><option value={5}>5 questions · quick practice</option><option value={7}>7 questions · full practice</option></select></label>
        <div className="voice-fullscreen-note"><ShieldCheck size={16}/><span>Fullscreen is mandatory once a session starts. If you exit fullscreen, the session pauses. This is a focus setting, not a proctoring or cheating detector.</span></div>
        <button className="primary-button" onClick={() => void start()}><Maximize size={15}/> Enter fullscreen & start interview</button>
      </div>}
      {active && <div className="voice-session">
        <div className="voice-session-top"><span><i/> SESSION LIVE</span><span><Clock3 size={14}/> {mmss}</span><span>QUESTION {questionIndex + 1} / {questionsForSession.current.length}</span></div>
        <div className="voice-question"><span className="eyebrow">INTERVIEWER ASKS</span><h3>{currentQuestion}</h3><button className="voice-secondary" onClick={() => speak(currentQuestion)}><Volume2 size={14}/> Repeat question</button></div>
        <div className="voice-answer-label"><strong>Your answer</strong><span>{listening ? 'Microphone active' : 'Microphone off'}</span></div>
        <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Your speech transcript appears here. You can also type or edit your answer…" rows={6}/>
        {interim && <p className="voice-interim">Hearing: {interim}</p>}
        <div className="voice-controls">{!listening ? <button className="voice-secondary" onClick={startListening}><Mic size={14}/> Start speaking</button> : <button className="voice-stop" onClick={stopListening}><MicOff size={14}/> Stop listening</button>}<button className="primary-button" onClick={submitAnswer}><Send size={14}/> Submit answer</button><button className="voice-text-button" onClick={endSession}>End interview</button></div>
        {notice && <p className="voice-notice" role="status">{notice}</p>}
      </div>}
      {!active && finished && <div className="voice-report">
        <div className="voice-report-score"><span className="eyebrow">PRACTICE SUMMARY</span><strong>{average}<small>/100</small></strong><span>Answer delivery indicator</span></div>
        <div className="voice-report-details"><h3>{transcript.length} answers recorded · {mmss} elapsed</h3><p>This is heuristic practice feedback based on answer length, signposting and use of examples. It does not verify technical correctness or replace expert evaluation.</p>
          {transcript.map((item, index) => <article className="voice-answer-review" key={index}><strong>Q{index + 1}. {item.question}</strong><p>{item.answer}</p><div><span>{item.score.words} words</span><span>Structure {item.score.structure}/100</span><span>Examples {item.score.specificity}/100</span><b>{item.score.overall}/100</b></div></article>)}
          <button className="primary-button" onClick={() => { setFinished(false); setTranscript([]); setQuestionIndex(0); setAnswer(''); setSeconds(0); }}><RotateCcw size={14}/> Set up another interview</button>
          {document.fullscreenElement && <button className="voice-text-button" onClick={() => void document.exitFullscreen()}>Exit fullscreen</button>}
        </div>
      </div>}
      {notice && !active && !finished && <p className="voice-notice" role="status">{notice}</p>}
      <p className="voice-disclaimer"><ShieldCheck size={14}/> Microphone audio is handled through your browser's speech-recognition implementation. Browser support and privacy behaviour vary; speech recognition may use an online service. Review your transcript before submitting.</p>
    </section>
  )
}
