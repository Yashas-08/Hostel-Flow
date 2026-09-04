import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { api, ApiError } from '../../lib/api';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { Input } from '../../components/primitives';
import type { CheckInResult } from '../../types';

type CameraState = 'requesting' | 'active' | 'denied' | 'no-camera' | 'unsupported' | 'error';

type ResultBanner =
  | { kind: 'success'; message: string }
  | { kind: 'invalid'; message: string }
  | { kind: 'duplicate'; message: string }
  | { kind: 'network'; message: string };

const RESUME_DELAY_MS = 1800;

function formatTime(iso: string) {
  // Backend stores SQLite datetime as "YYYY-MM-DD HH:MM:SS" (UTC, no offset marker).
  const safe = iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z';
  const d = new Date(safe);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export default function ScanPage() {
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  // Synchronous lock checked inside the rAF decode loop (state updates are async
  // and would let multiple frames slip through before a re-render lands).
  const processingRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCodeRef = useRef<string>('');

  const [cameraState, setCameraState] = useState<CameraState>('requesting');
  // Mirrors processingRef for rendering — refs alone don't trigger re-renders.
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ResultBanner | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState('');

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const submitCode = useCallback(async (code: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    lastCodeRef.current = code;

    try {
      const res = await api.post<CheckInResult>('/attendance/check-in', { code });
      setResult({ kind: 'success', message: `Checked in at ${res.checkpointLabel} · ${formatTime(res.checkedInAt)}` });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setResult({ kind: 'duplicate', message: err.message });
        } else if (err.status === 404 || err.status === 400) {
          setResult({ kind: 'invalid', message: err.message });
        } else {
          setResult({ kind: 'network', message: err.message });
        }
      } else {
        setResult({ kind: 'network', message: 'Could not reach the server. Check your connection and try again.' });
      }
    } finally {
      setIsProcessing(false);
      resumeTimerRef.current = setTimeout(() => {
        processingRef.current = false;
        setResult(null);
      }, RESUME_DELAY_MS);
    }
  }, []);

  const decodeLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
        if (code && code.data && !processingRef.current) {
          submitCode(code.data);
        }
      }
    }
    rafRef.current = requestAnimationFrame(decodeLoop);
  }, [submitCode]);

  const startCamera = useCallback(async () => {
    setCameraState('requesting');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState('active');
      rafRef.current = requestAnimationFrame(decodeLoop);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraState('denied');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraState('no-camera');
      } else {
        setCameraState('error');
      }
    }
  }, [decodeLoop]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = manualValue.trim();
    if (!value) return;
    submitCode(value);
    setManualValue('');
  }

  function retryLastCode() {
    if (lastCodeRef.current) {
      processingRef.current = false;
      submitCode(lastCodeRef.current);
    }
  }

  const bannerStyles: Record<ResultBanner['kind'], string> = {
    success: 'bg-[var(--color-success)] text-white',
    invalid: 'bg-[var(--color-danger)] text-white',
    duplicate: 'bg-[var(--color-warning)] text-white',
    network: 'bg-[var(--color-ink)] text-white',
  };

  return (
    <Screen>
      <div className="pt-[calc(env(safe-area-inset-top)+18px)] pb-4 flex items-center gap-3">
        <button
          onClick={() => {
            stopCamera();
            navigate(-1);
          }}
          aria-label="Back"
          className="h-9 w-9 flex items-center justify-center rounded-full border border-[var(--color-border)]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="font-display font-bold text-lg text-[var(--color-ink)]">Scan QR</h1>
      </div>

      <div className="relative rounded-[var(--radius-lg)] overflow-hidden bg-black aspect-[3/4]">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />

        {cameraState === 'active' && !result && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative h-56 w-56">
              {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((corner) => (
                <span
                  key={corner}
                  className={[
                    'absolute h-8 w-8 border-white',
                    corner === 'top-left' && 'top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-lg',
                    corner === 'top-right' && 'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-lg',
                    corner === 'bottom-left' && 'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-lg',
                    corner === 'bottom-right' && 'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-lg',
                  ].filter(Boolean).join(' ')}
                />
              ))}
            </div>
          </div>
        )}

        {cameraState === 'active' && !result && (
          <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm font-medium drop-shadow">
            Point your camera at a hostel check-in QR code
          </p>
        )}

        {cameraState === 'requesting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
            <span className="h-6 w-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
            <p className="text-sm">Requesting camera access…</p>
          </div>
        )}

        {(cameraState === 'denied' || cameraState === 'no-camera' || cameraState === 'unsupported' || cameraState === 'error') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white px-6 text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 2l20 20M9.5 5H16a2 2 0 0 1 2 2v9.5M14.5 19H5a2 2 0 0 1-2-2V8.5" />
              <circle cx="12" cy="13" r="3" />
            </svg>
            <p className="font-semibold text-[15px]">
              {cameraState === 'denied' && 'Camera access denied'}
              {cameraState === 'no-camera' && 'No camera found'}
              {cameraState === 'unsupported' && 'Camera not supported on this browser'}
              {cameraState === 'error' && 'Could not start the camera'}
            </p>
            <p className="text-sm text-white/70">
              {cameraState === 'denied'
                ? 'Allow camera access in your browser settings, or check in using the code below.'
                : 'You can still check in by entering the code below.'}
            </p>
            {cameraState === 'denied' && (
              <Button size="sm" variant="secondary" onClick={startCamera}>
                Try again
              </Button>
            )}
          </div>
        )}

        {result && (
          <div className={['absolute inset-x-3 bottom-3 rounded-[var(--radius-md)] px-4 py-3 flex items-center gap-2.5', bannerStyles[result.kind]].join(' ')}>
            {result.kind === 'success' && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M20 6 9 17l-5-5" /></svg>
            )}
            {(result.kind === 'invalid' || result.kind === 'network') && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
            )}
            {result.kind === 'duplicate' && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>
            )}
            <p className="text-sm font-medium leading-snug flex-1">{result.message}</p>
            {result.kind === 'network' && (
              <button onClick={retryLastCode} className="text-sm font-semibold underline shrink-0">
                Retry
              </button>
            )}
          </div>
        )}

        {isProcessing && !result && (
          <div className="absolute inset-x-3 bottom-3 rounded-[var(--radius-md)] px-4 py-3 flex items-center gap-2.5 bg-black/70 text-white">
            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            <p className="text-sm font-medium">Checking in…</p>
          </div>
        )}
      </div>

      <div className="mt-4">
        {!manualOpen ? (
          <button
            type="button"
            onClick={() => setManualOpen(true)}
            className="text-sm font-medium text-[var(--color-primary)] underline underline-offset-2"
          >
            Trouble scanning? Enter the code manually
          </button>
        ) : (
          <form onSubmit={handleManualSubmit} className="flex gap-2 items-start">
            <div className="flex-1">
              <Input
                placeholder="Enter check-in code"
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" size="md">Submit</Button>
          </form>
        )}
      </div>
    </Screen>
  );
}
