import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useTraveler, BoardingPass } from '@/contexts/TravelerContext';
import {
  Camera, Upload, MapPin, Sparkles, Check, X, Loader2,
  Plane, ShieldCheck, Crown, AlertCircle, ChevronRight
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { getAirportCity } from '@/data/airports';

interface PersonalizeModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'welcome' | 'scan' | 'review' | 'location' | 'done';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

function supportsCameraCapture() {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

const PersonalizeModal: React.FC<PersonalizeModalProps> = ({ open, onClose }) => {
  const { setBoardingPass, setLocation, completeSetup, profile } = useTraveler();
  const [step, setStep] = useState<Step>('welcome');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<BoardingPass | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [fallbackNote, setFallbackNote] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [autoScanCountdown, setAutoScanCountdown] = useState<number | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const reset = () => {
    setStep('welcome');
    setScanning(false);
    setScanError(null);
    setParsed(null);
    setPreviewUrl(null);
    setUsedFallback(false);
    setFallbackNote(null);
    setAutoScanCountdown(null);
    setCameraReady(false);
  };

  const stopCamera = () => {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    setAutoScanCountdown(null);
    setCameraReady(false);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
    setTimeout(reset, 200);
  };

  const handleFile = async (file: File) => {
    setScanError(null);
    setFallbackNote(null);
    setScanning(true);
    setPreviewUrl(URL.createObjectURL(file));
    try {
      const b64 = await fileToBase64(file);
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload a boarding-pass photo or screenshot. PDF and wallet-pass files are not supported yet.');
      }
      if (!isSupabaseConfigured) {
        // Allow the user to continue in environments where Supabase isn't wired.
        setParsed({
          passengerName: null,
          flightNumber: null,
          carrier: null,
          from: null,
          to: null,
          fromCity: null,
          toCity: null,
          departureDate: null,
          departureTime: null,
          boardingTime: null,
          gate: null,
          terminal: null,
          seat: null,
          cabin: null,
          loyaltyNumber: null,
          loyaltyTier: null,
          confirmationCode: null,
        } as BoardingPass);
        setUsedFallback(true);
        setFallbackNote('Supabase is not configured in this build. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable live boarding-pass parsing.');
        setStep('review');
        return;
      }
      const { data, error } = await supabase.functions.invoke('parse-boarding-pass', {
        body: { imageBase64: b64 },
      });
      if (error) throw new Error(error.message || 'Scan failed');
      if (!data) throw new Error('No data returned');
      if (data?.ok === false) throw new Error(data?.error || data?.visionError || 'Scan failed');
      const { usedFallback: fallback, apiConfigured, visionError, ...bp } = data;
      setParsed(bp as BoardingPass);
      setUsedFallback(!!fallback);
      if (fallback) {
        if (!apiConfigured) {
          setFallbackNote('OCR is not configured for boarding-pass parsing in this environment yet.');
        } else if (visionError) {
          setFallbackNote(`OCR fallback: ${String(visionError)}`);
        } else {
          setFallbackNote('Using fallback parsing for this image.');
        }
      }
      setStep('review');
      if (visionError) console.warn('Vision error:', visionError);
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Could not scan boarding pass');
    } finally {
      setScanning(false);
    }
  };

  const handleSkipScan = () => {
    stopCamera();
    setScanError(null);
    setFallbackNote(null);
    setScanning(true);
    try {
      const demoPass = {
        passengerName: 'ConnectionRescue Demo',
        flightNumber: 'AA2487',
        carrier: 'AA',
        from: 'JFK',
        to: 'LAX',
        fromCity: 'New York',
        toCity: 'Los Angeles',
        departureDate: new Date().toISOString().slice(0, 10),
        departureTime: '12:35',
        boardingTime: '12:00',
        gate: 'B12',
        terminal: '4',
        seat: '12A',
        cabin: 'Main',
        loyaltyNumber: null,
        loyaltyTier: null,
        confirmationCode: 'CRDEMO1',
      } as BoardingPass;
      setParsed(demoPass);
      setUsedFallback(true);
      setFallbackNote('Demo data selected. Scan a real image to personalize with your actual boarding pass.');
      setStep('review');
    } finally {
      setScanning(false);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });
      const [track] = stream.getVideoTracks();
      try {
        await track?.applyConstraints?.({
          advanced: [
            { focusMode: 'continuous' },
            { exposureMode: 'continuous' },
            { whiteBalanceMode: 'continuous' },
          ] as MediaTrackConstraintSet[],
        });
      } catch {
        // Mobile browsers expose focus controls unevenly; the camera still works without them.
      }
      setCameraStream(stream);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : 'Camera unavailable.');
    }
  };

  const markCameraReady = () => {
    setCameraReady(true);
    setAutoScanCountdown(3);
  };

  const captureCameraFrame = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setCameraError('Camera is still warming up. Hold the boarding pass steady and try again.');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) {
      setCameraError('Could not capture a camera frame.');
      return;
    }
    stopCamera();
    await handleFile(new File([blob], 'boarding-pass-camera.jpg', { type: 'image/jpeg' }));
  };

  useEffect(() => {
    if (step !== 'scan' || !open) {
      stopCamera();
      return;
    }
    if (!supportsCameraCapture()) return;
    void startCamera();

    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, open]);

  useEffect(() => {
    if (!videoRef.current || !cameraStream) return;
    videoRef.current.srcObject = cameraStream;
  }, [cameraStream]);

  useEffect(() => {
    if (step !== 'scan' || scanning || !cameraStream || !cameraReady || autoScanCountdown === null) return;
    if (autoScanCountdown <= 0) {
      void captureCameraFrame();
      return;
    }
    const timer = window.setTimeout(() => {
      setAutoScanCountdown((value) => (value === null ? null : value - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScanCountdown, cameraReady, cameraStream, scanning, step]);

  const confirmBoardingPass = () => {
    if (!parsed) return;
    setBoardingPass({
      ...parsed,
      from: parsed.from?.toUpperCase() || null,
      to: parsed.to?.toUpperCase() || null,
      fromCity: parsed.fromCity || getAirportCity(parsed.from, ''),
      toCity: parsed.toCity || getAirportCity(parsed.to, ''),
    });
    setStep('location');
  };

  const requestLocation = () => {
    setLocationLoading(true);
    if (!navigator.geolocation) {
      setLocation(null, false);
      toast({ title: 'Location unavailable', description: 'Your browser does not support geolocation.' });
      setLocationLoading(false);
      finish();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          capturedAt: new Date().toISOString(),
        }, true);
        setLocationLoading(false);
        finish();
      },
      (err) => {
        setLocation(null, false);
        setLocationLoading(false);
        toast({
          title: 'Location declined',
          description: err.message || 'Continuing without location — gate-aware features will be limited.',
        });
        finish();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const skipLocation = () => {
    setLocation(null, false);
    finish();
  };

  const finish = () => {
    completeSetup();
    setStep('done');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Decorative top bar */}
        <div className="h-1.5 bg-gradient-to-r from-red-600 via-white to-blue-700" />

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition z-10"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-slate-600" />
        </button>

        <div className="p-6 sm:p-8">
          {step === 'welcome' && (
            <WelcomeStep onNext={() => setStep('scan')} />
          )}

          {step === 'scan' && (
            <ScanStep
              scanning={scanning}
              error={scanError}
              previewUrl={previewUrl}
              onPickFile={() => fileInputRef.current?.click()}
              onUseCamera={startCamera}
              onSkip={handleSkipScan}
              onBack={() => setStep('welcome')}
              cameraStream={cameraStream}
              cameraError={cameraError}
              videoRef={videoRef}
              cameraReady={cameraReady}
              autoScanCountdown={autoScanCountdown}
              supportsCameraCapture={supportsCameraCapture()}
              onCameraReady={markCameraReady}
              onCapture={captureCameraFrame}
            />
          )}

          {step === 'review' && parsed && (
            <ReviewStep
              data={parsed}
              usedFallback={usedFallback}
              fallbackNote={fallbackNote}
              onChange={(field, value) => setParsed({ ...parsed, [field]: value })}
              onConfirm={confirmBoardingPass}
              onRescan={() => { setParsed(null); setStep('scan'); }}
            />
          )}

          {step === 'location' && (
            <LocationStep
              onAllow={requestLocation}
              onSkip={skipLocation}
              loading={locationLoading}
            />
          )}

          {step === 'done' && (
            <DoneStep profileName={profile.boardingPass?.passengerName || parsed?.passengerName} onClose={handleClose} />
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

// ---- Sub-steps ----

const WelcomeStep: React.FC<{ onNext: () => void }> = ({ onNext }) => (
  <div>
    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 shadow-lg shadow-red-600/30 mb-5">
      <Sparkles className="w-8 h-8 text-white" />
    </div>
    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
      Build your rescue profile
    </h2>
    <p className="text-slate-600 text-sm sm:text-base mb-6">
      Two quick steps and ConnectionRescue will be ready to act the second your travel is disrupted,
      personalized to <em>your</em> flight, gate, and lounge access.
    </p>

    <div className="space-y-3 mb-6">
      <Perk icon={<Camera className="w-4 h-4" />} title="Scan your boarding pass" desc="We auto-fill your flight, seat, and elite status." />
      <Perk icon={<MapPin className="w-4 h-4" />} title="Share your location" desc="So we surface lounges by your gate and rebook from where you actually are." />
      <Perk icon={<ShieldCheck className="w-4 h-4" />} title="Stays on this device" desc="Your data is stored locally. You can clear it anytime." />
    </div>

    <button
      onClick={onNext}
      className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold shadow-lg shadow-red-600/20 hover:shadow-red-600/40 transition flex items-center justify-center gap-2"
    >
      Get started <ChevronRight className="w-4 h-4" />
    </button>
  </div>
);

const Perk: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-700 shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="text-xs text-slate-600 mt-0.5">{desc}</p>
    </div>
  </div>
);

const ScanStep: React.FC<{
  scanning: boolean;
  error: string | null;
  previewUrl: string | null;
  onPickFile: () => void;
  onUseCamera: () => void;
  onSkip: () => void;
  onBack: () => void;
  cameraStream: MediaStream | null;
  cameraError: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  cameraReady: boolean;
  autoScanCountdown: number | null;
  supportsCameraCapture: boolean;
  onCameraReady: () => void;
  onCapture: () => void;
}> = ({ scanning, error, previewUrl, onPickFile, onUseCamera, onSkip, onBack, cameraStream, cameraError, videoRef, cameraReady, autoScanCountdown, supportsCameraCapture, onCameraReady, onCapture }) => (
  <div>
    <div className="flex items-center gap-2 mb-1">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Step 1 of 2</span>
    </div>
    <h2 className="text-2xl font-bold text-slate-900 mb-2">Scan your boarding pass</h2>
    <p className="text-slate-600 text-sm mb-6">
      Snap a photo or upload an image. We'll extract your flight details automatically.
    </p>

    {cameraStream && !scanning ? (
      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 mb-4">
        <div className="relative aspect-[4/3]">
          <video ref={videoRef} autoPlay playsInline muted onCanPlay={onCameraReady} className="h-full w-full object-cover" />
          <div className="absolute inset-6 rounded-2xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(2,6,23,0.35)]" />
          <div className="absolute left-0 right-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent p-4 text-white">
            <p className="text-sm font-semibold">Hold the boarding pass inside the frame</p>
            <p className="text-xs text-white/75">
              {!cameraReady
                ? 'Focusing camera...'
                : autoScanCountdown !== null && autoScanCountdown > 0
                ? `Auto-scanning in ${autoScanCountdown}...`
                : 'Capturing...'}
            </p>
          </div>
        </div>
        <div className="flex gap-2 bg-white p-3">
          <button onClick={onCapture} className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
            Scan now
          </button>
          <button onClick={onPickFile} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Upload instead
          </button>
        </div>
      </div>
    ) : scanning ? (
      <div className="border-2 border-dashed border-blue-300 rounded-2xl p-10 text-center bg-blue-50/40">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="font-semibold text-slate-900">Reading your boarding pass…</p>
        <p className="text-xs text-slate-500 mt-1">Extracting flight, seat, gate, and loyalty info</p>
        {previewUrl && (
          <img src={previewUrl} alt="Preview" className="mx-auto mt-4 max-h-32 rounded-lg shadow opacity-80" />
        )}
      </div>
    ) : (
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        {supportsCameraCapture && (
          <button
            onClick={onUseCamera}
            className="group flex flex-col items-center gap-2 p-6 rounded-2xl border-2 border-slate-200 hover:border-red-500 hover:bg-red-50/40 transition"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow group-hover:scale-105 transition">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <p className="font-semibold text-slate-900 text-sm">Use camera</p>
            <p className="text-xs text-slate-500">Auto-captures when ready</p>
          </button>
        )}
        <button
          onClick={onPickFile}
          className="group flex flex-col items-center gap-2 p-6 rounded-2xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center shadow group-hover:scale-105 transition">
            <Upload className="w-6 h-6 text-white" />
          </div>
          <p className="font-semibold text-slate-900 text-sm">Upload image / PDF</p>
          <p className="text-xs text-slate-500">Screenshot or saved image</p>
        </button>
      </div>
    )}

    {(error || cameraError) && (
      <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs mb-4">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{error || cameraError}</span>
      </div>
    )}

    <div className="flex items-center justify-between text-xs">
      <button onClick={onBack} className="text-slate-500 hover:text-slate-800">← Back</button>
      <button onClick={onSkip} className="text-slate-500 hover:text-slate-800 underline-offset-2 hover:underline">
        Skip — use demo data
      </button>
    </div>
  </div>
);

const ReviewStep: React.FC<{
  data: BoardingPass;
  usedFallback: boolean;
  fallbackNote?: string | null;
  onChange: (field: keyof BoardingPass, value: string) => void;
  onConfirm: () => void;
  onRescan: () => void;
}> = ({ data, usedFallback, fallbackNote, onChange, onConfirm, onRescan }) => (
  <div>
    <div className="flex items-center gap-2 mb-1">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Step 1 of 2 · Review</span>
    </div>
    <h2 className="text-2xl font-bold text-slate-900 mb-2">Looks right?</h2>
    <p className="text-slate-600 text-sm mb-4">Tap any field to edit before we lock it in.</p>

    {usedFallback && (
      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs mb-4">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          {fallbackNote || 'Using fallback parsing for this boarding pass.'}
        </span>
      </div>
    )}

    {/* Boarding pass card */}
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg shadow-slate-200/60 bg-gradient-to-br from-slate-50 to-white mb-5">
      <div className="bg-gradient-to-r from-[#0a1d3a] to-[#0d2347] text-white px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plane className="w-4 h-4 text-red-400 -rotate-45" />
          <span className="text-xs font-semibold tracking-wider uppercase">{data.carrier || 'Boarding Pass'}</span>
        </div>
        {data.loyaltyTier && (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-red-600 px-2 py-0.5 rounded-full">
            <Crown className="w-3 h-3" /> {data.loyaltyTier}
          </span>
        )}
      </div>
      <div className="p-5 grid grid-cols-3 gap-4 items-center">
        <div className="col-span-1">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">From</p>
          <EditableField value={data.from || ''} onChange={(v) => onChange('from', v.toUpperCase())} className="text-3xl font-bold text-slate-900" />
          <p className="text-xs text-slate-500 mt-0.5">{data.fromCity || ''}</p>
        </div>
        <div className="col-span-1 flex items-center justify-center">
          <div className="relative w-full">
            <div className="border-t-2 border-dashed border-slate-300" />
            <div className="absolute inset-0 flex items-center justify-center -mt-3">
              <div className="bg-white p-1.5 rounded-full border border-slate-200">
                <Plane className="w-4 h-4 text-red-600" />
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-1 text-right">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">To</p>
          <EditableField value={data.to || ''} onChange={(v) => onChange('to', v.toUpperCase())} className="text-3xl font-bold text-slate-900 text-right" />
          <p className="text-xs text-slate-500 mt-0.5">{data.toCity || ''}</p>
        </div>
      </div>
      <div className="px-5 pb-5 grid grid-cols-4 gap-3 text-xs">
        <Field label="Flight" value={data.flightNumber} onChange={(v) => onChange('flightNumber', v)} />
        <Field label="Seat" value={data.seat} onChange={(v) => onChange('seat', v)} />
        <Field label="Gate" value={data.gate} onChange={(v) => onChange('gate', v)} />
        <Field label="Boarding" value={data.boardingTime} onChange={(v) => onChange('boardingTime', v)} />
      </div>
      <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Passenger</p>
          <EditableField value={data.passengerName || ''} onChange={(v) => onChange('passengerName', v)} className="font-semibold text-slate-900" />
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Conf</p>
          <EditableField value={data.confirmationCode || ''} onChange={(v) => onChange('confirmationCode', v)} className="font-mono font-semibold text-slate-900" />
        </div>
      </div>
    </div>

    <div className="flex gap-3">
      <button onClick={onRescan} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition">
        Re-scan
      </button>
      <button
        onClick={onConfirm}
        className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold shadow-lg shadow-red-600/20 hover:shadow-red-600/40 transition flex items-center justify-center gap-2"
      >
        Confirm & continue <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  </div>
);

const Field: React.FC<{ label: string; value: string | null; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div>
    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
    <EditableField value={value || '—'} onChange={onChange} className="font-semibold text-slate-900" />
  </div>
);

const EditableField: React.FC<{ value: string; onChange: (v: string) => void; className?: string }> = ({ value, onChange, className }) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`bg-transparent border-0 outline-none w-full focus:bg-yellow-50 focus:ring-2 focus:ring-yellow-300 rounded px-1 -mx-1 ${className || ''}`}
  />
);

const LocationStep: React.FC<{ onAllow: () => void; onSkip: () => void; loading: boolean }> = ({ onAllow, onSkip, loading }) => (
  <div>
    <div className="flex items-center gap-2 mb-1">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Step 2 of 2</span>
    </div>
    <h2 className="text-2xl font-bold text-slate-900 mb-2">Share your location?</h2>
    <p className="text-slate-600 text-sm mb-6">
      So we can show you lounges near your gate, the closest hotel rescue option,
      and route you fastest to your replacement flight.
    </p>

    <div className="rounded-2xl overflow-hidden border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 mb-5">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center shadow shrink-0">
          <MapPin className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="font-semibold text-slate-900 text-sm mb-2">Why we ask</p>
          <ul className="space-y-1.5 text-xs text-slate-700">
            <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" /> Surface lounges by your gate, not just by airport</li>
            <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" /> Estimate walk time to your replacement gate</li>
            <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" /> Auto-detect terminal change after a rebook</li>
            <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" /> You can revoke any time in settings</li>
          </ul>
        </div>
      </div>
    </div>

    <div className="flex gap-3">
      <button onClick={onSkip} disabled={loading} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition disabled:opacity-50">
        Not now
      </button>
      <button
        onClick={onAllow}
        disabled={loading}
        className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-blue-700 to-blue-900 text-white font-semibold shadow-lg shadow-blue-700/20 hover:shadow-blue-700/40 transition flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Requesting…</> : <><MapPin className="w-4 h-4" /> Allow location</>}
      </button>
    </div>
  </div>
);

const DoneStep: React.FC<{ profileName?: string | null; onClose: () => void }> = ({ profileName, onClose }) => (
  <div className="text-center py-4">
    <div className="relative inline-flex">
      <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-40" />
      <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-4 mx-auto">
        <Check className="w-8 h-8 text-white" strokeWidth={3} />
      </div>
    </div>
    <h2 className="text-2xl font-bold text-slate-900 mb-2">
      You're set{profileName ? `, ${profileName.split('/').pop()?.split(' ')[0] || ''}` : ''}
    </h2>
    <p className="text-slate-600 text-sm mb-6 max-w-sm mx-auto">
      ConnectionRescue is monitoring your flight. The moment anything changes, your personalized rescue plan kicks in.
    </p>
    <button
      onClick={onClose}
      className="px-8 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold shadow-lg shadow-red-600/20 hover:shadow-red-600/40 transition"
    >
      Enter the app
    </button>
  </div>
);

export default PersonalizeModal;
