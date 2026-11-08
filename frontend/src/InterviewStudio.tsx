import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Eye, Hand, ScanFace, ShieldCheck, AlertCircle, Sparkles, RefreshCw } from 'lucide-react'
import { analyzeInterviewFrame, type InterviewFrameAnalysis } from './api'
import VoiceInterview from './VoiceInterview'

type Landmark = { x: number; y: number; z?: number }
type FaceResult = { faceLandmarks: Landmark[][] }
type HandResult = { landmarks: Landmark[][] }
type VisionModule = {
  FilesetResolver: { forVisionTasks: (path: string) => Promise<unknown> }
  FaceLandmarker: { createFromOptions: (fileset: unknown, options: Record<string, unknown>) => Promise<{ detectForVideo: (video: HTMLVideoElement, timestamp: number) => FaceResult; close: () => void }> }
  HandLandmarker: { createFromOptions: (fileset: unknown, options: Record<string, unknown>) => Promise<{ detectForVideo: (video: HTMLVideoElement, timestamp: number) => HandResult; close: () => void }> }
}

type LiveMetrics = { faceVisible: boolean; handsVisible: number; gaze: string; fps: string }

const VISION_VERSION = '0.10.14'
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VISION_VERSION}/wasm`
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
const HAND_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

function estimateScreenGaze(landmarks: Landmark[]): string {
  // Iris position relative to eye corners is a rough screen-facing proxy,
  // not a calibrated eye tracker or a measure of attention.
  if (landmarks.length < 478) return 'Not estimated'
  const ratio = (irisIndex: number, leftCorner: number, rightCorner: number) => {
    const iris = landmarks[irisIndex]
    const left = landmarks[leftCorner]
    const right = landmarks[rightCorner]
    const width = Math.abs(right.x - left.x)
    return width > 0 ? (iris.x - Math.min(left.x, right.x)) / width : 0.5
  }
  const leftEye = ratio(468, 33, 133)
  const rightEye = ratio(473, 362, 263)
  return [leftEye, rightEye].every((value) => value > 0.2 && value < 0.8)
    ? 'Generally toward screen'
    : 'Looking away from screen'
}

export default function InterviewStudio({ targetRole, currentRole, selectedSkills }: {
  targetRole: string
  currentRole: string
  selectedSkills: string[]
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const faceRef = useRef<Awaited<ReturnType<VisionModule['FaceLandmarker']['createFromOptions']>> | null>(null)
  const handRef = useRef<Awaited<ReturnType<VisionModule['HandLandmarker']['createFromOptions']>> | null>(null)
  const animationRef = useRef<number | null>(null)
  const lastVisionRef = useRef(0)
  const lastOpenCvRef = useRef(0)
  const [cameraActive, setCameraActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [visionReady, setVisionReady] = useState(false)
  const [metrics, setMetrics] = useState<LiveMetrics>({ faceVisible: false, handsVisible: 0, gaze: 'Waiting for camera', fps: '—' })
  const [opencv, setOpencv] = useState<InterviewFrameAnalysis | null>(null)
  const [opencvLoading, setOpencvLoading] = useState(false)

  const stopCamera = useCallback(() => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
    animationRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    faceRef.current?.close()
    handRef.current?.close()
    faceRef.current = null
    handRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraActive(false)
    setVisionReady(false)
    setMetrics({ faceVisible: false, handsVisible: 0, gaze: 'Camera stopped', fps: '—' })
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  const startCamera = async () => {
    setError('')
    setLoading(true)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access requires localhost or HTTPS and a browser that supports MediaDevices.')
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 540 } },
        audio: false,
      })
      streamRef.current = stream
      if (!videoRef.current) throw new Error('Camera preview could not be created.')
      videoRef.current.srcObject = stream
      await videoRef.current.play()

      // Load MediaPipe Tasks Vision from its official CDN. The video remains in
      // the browser; only small periodic snapshots go to the local OpenCV API.
      const importModule = new Function('url', 'return import(url)') as (url: string) => Promise<VisionModule>
      const vision = await importModule(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VISION_VERSION}/+esm`)
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL)
      const faceOptions = {
        baseOptions: { modelAssetPath: FACE_MODEL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 2,
        outputFaceBlendshapes: false,
      }
      const handOptions = {
        baseOptions: { modelAssetPath: HAND_MODEL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 2,
      }
      try {
        faceRef.current = await vision.FaceLandmarker.createFromOptions(fileset, faceOptions)
        handRef.current = await vision.HandLandmarker.createFromOptions(fileset, handOptions)
      } catch {
        faceRef.current?.close()
        handRef.current?.close()
        faceRef.current = await vision.FaceLandmarker.createFromOptions(fileset, {
          ...faceOptions,
          baseOptions: { modelAssetPath: FACE_MODEL, delegate: 'CPU' },
        })
        handRef.current = await vision.HandLandmarker.createFromOptions(fileset, {
          ...handOptions,
          baseOptions: { modelAssetPath: HAND_MODEL, delegate: 'CPU' },
        })
      }
      setVisionReady(true)
      setCameraActive(true)
      let previousTime = 0
      const analyse = (time: number) => {
        const video = videoRef.current
        if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          animationRef.current = requestAnimationFrame(analyse)
          return
        }
        if (time - lastVisionRef.current > 180) {
          lastVisionRef.current = time
          try {
            const faces = faceRef.current?.detectForVideo(video, time)
            const hands = handRef.current?.detectForVideo(video, time)
            const faceLandmarks = faces?.faceLandmarks ?? []
            const handsLandmarks = hands?.landmarks ?? []
            const face = faceLandmarks[0]
            const delta = previousTime > 0 ? Math.round(1000 / Math.max(1, time - previousTime)) : 0
            previousTime = time
            setMetrics({
              faceVisible: faceLandmarks.length === 1,
              handsVisible: handsLandmarks.length,
              gaze: face ? estimateScreenGaze(face) : faceLandmarks.length > 1 ? 'Multiple faces' : 'No face detected',
              fps: delta ? `${delta} fps` : '…',
            })
          } catch {
            setError('Live landmark detection paused. Try restarting the camera or using a browser with WebGL support.')
          }
        }
        if (time - lastOpenCvRef.current > 3000) {
          lastOpenCvRef.current = time
          const canvas = canvasRef.current
          if (canvas && video.videoWidth > 0) {
            canvas.width = 640
            canvas.height = Math.round(640 * video.videoHeight / video.videoWidth)
            const context = canvas.getContext('2d')
            context?.drawImage(video, 0, 0, canvas.width, canvas.height)
            const imageBase64 = canvas.toDataURL('image/jpeg', 0.55)
            setOpencvLoading(true)
            void analyzeInterviewFrame(imageBase64)
              .then(setOpencv)
              .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'OpenCV frame analysis failed.'))
              .finally(() => setOpencvLoading(false))
          }
        }
        animationRef.current = requestAnimationFrame(analyse)
      }
      animationRef.current = requestAnimationFrame(analyse)
    } catch (reason) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setCameraActive(false)
      setError(reason instanceof Error ? reason.message : 'Could not start the camera or load the vision models.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="interview-studio">
      <div className="page-intro">
        <div className="eyebrow">AI INTERVIEW STUDIO · STAGE 1–2</div>
        <h1>Show up as your <em>best self.</em></h1>
        <p>Set up your camera and get real-time, private practice feedback on framing, face visibility and natural movement.</p>
      </div>

      <div className="interview-studio-banner">
        <div className="studio-banner-icon"><Sparkles size={19}/></div>
        <div><strong>Camera confidence check</strong><p>This first build focuses on live camera and landmark tracking. The voice interviewer and answer evaluation are the next development stage.</p></div>
        <span className="studio-stage-pill">VISION BETA</span>
      </div>

      {error && <div className="notice studio-error" role="alert"><AlertCircle size={15}/>{error}</div>}

      <div className="studio-layout">
        <section className="panel studio-camera-panel">
          <div className="panel-heading"><div><h3>Live camera preview</h3><p>Your camera feed stays in this browser tab.</p></div><span className={cameraActive ? 'studio-live-pill' : 'studio-idle-pill'}><i/>{cameraActive ? 'LIVE' : 'OFFLINE'}</span></div>
          <div className="studio-video-wrap">
            <video ref={videoRef} className={cameraActive ? 'studio-video active' : 'studio-video'} autoPlay muted playsInline />
            {!cameraActive && <div className="studio-camera-placeholder"><div><Camera size={31}/></div><strong>Your interview space</strong><span>Enable your camera when you're ready.</span></div>}
            {cameraActive && <div className="studio-video-overlay"><span><i/> CAMERA ACTIVE</span><span>{metrics.fps}</span></div>}
          </div>
          <canvas ref={canvasRef} className="studio-hidden-canvas" aria-hidden="true"/>
          <div className="studio-camera-actions">
            {!cameraActive ? <button className="primary-button" onClick={() => void startCamera()} disabled={loading}><Camera size={15}/>{loading ? 'Starting camera & models…' : 'Start camera check'}</button> : <button className="studio-stop-button" onClick={stopCamera}><CameraOff size={15}/> Stop camera</button>}
            <span>{visionReady ? 'MediaPipe face + hand models ready' : 'Camera and model permission required'}</span>
          </div>
        </section>

        <section className="studio-side-column">
          <div className="panel studio-role-card"><span className="eyebrow">YOUR PRACTICE CONTEXT</span><h3>{targetRole}</h3><p>Preparing from: {currentRole}</p><div className="career-skills">{selectedSkills.slice(0,5).map((skill) => <span key={skill}>{skill}</span>)}</div></div>
          <div className="panel studio-metrics-panel"><div className="panel-heading"><div><h3>Live signals</h3><p>Visual indicators, not a personality score.</p></div><RefreshCw size={15} className={cameraActive ? 'studio-spin' : ''}/></div>
            <div className="studio-metric-row"><span className="studio-metric-icon"><ScanFace size={17}/></span><div><strong>Face visibility</strong><small>{metrics.faceVisible ? 'One face detected' : metrics.gaze}</small></div><b className={metrics.faceVisible ? 'metric-good' : 'metric-neutral'}>{metrics.faceVisible ? 'DETECTED' : 'WAITING'}</b></div>
            <div className="studio-metric-row"><span className="studio-metric-icon"><Eye size={17}/></span><div><strong>Approximate gaze</strong><small>{metrics.gaze}</small></div><b className="metric-neutral">ESTIMATE</b></div>
            <div className="studio-metric-row"><span className="studio-metric-icon"><Hand size={17}/></span><div><strong>Hand landmarks</strong><small>{metrics.handsVisible ? `${metrics.handsVisible} hand(s) in frame` : 'No hands currently detected'}</small></div><b className="metric-neutral">{metrics.handsVisible}/2</b></div>
            <div className="studio-metric-row"><span className="studio-metric-icon"><Sparkles size={17}/></span><div><strong>OpenCV frame check</strong><small>{opencv?.camera_note ?? 'Waiting for first camera snapshot'}</small></div><b className={opencvLoading ? 'metric-neutral' : opencv?.face_count === 1 ? 'metric-good' : 'metric-neutral'}>{opencvLoading ? 'CHECKING' : opencv ? 'READY' : 'PENDING'}</b></div>
            {opencv && <div className="studio-opencv-details"><span>Faces: {opencv.face_count}</span><span>Eyes detected: {opencv.eyes_detected ? 'Yes' : 'Uncertain'}</span><span>Lighting: {opencv.brightness}/255</span><span>Centred: {opencv.face_centered ? 'Yes' : 'Adjust'}</span></div>}
          </div>
        </section>
      </div>

      <VoiceInterview targetRole={targetRole} />

      <div className="studio-bottom-grid">
        <section className="panel studio-guidance"><div className="studio-guidance-icon"><Eye size={18}/></div><div><h3>Natural eye contact</h3><p>Look towards the camera when speaking, but feel free to glance away naturally while thinking. The gaze estimate is approximate and can be affected by glasses, lighting and camera angle.</p></div></section>
        <section className="panel studio-guidance"><div className="studio-guidance-icon"><Hand size={18}/></div><div><h3>Comfortable gestures</h3><p>Use your hands naturally. The system detects visible hand landmarks only; it does not label gestures as good, bad, nervous or dishonest.</p></div></section>
      </div>

      <div className="studio-privacy"><ShieldCheck size={16}/><p><strong>Privacy by design:</strong> MediaPipe face and hand landmarks run in your browser. A low-resolution snapshot is sent every few seconds to your local FastAPI backend for OpenCV face, eye-region and lighting checks. Frames are processed in memory and never saved by this endpoint. No cheating score or emotion recognition is produced.</p></div>
    </div>
  )
}
