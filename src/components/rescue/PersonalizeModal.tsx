import React, { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTraveler, BoardingPass } from '@/contexts/TravelerContext';
import {
  Camera, Upload, MapPin, Sparkles, Check, X, Loader2,
  Plane, ShieldCheck, Crown, AlertCircle, ChevronRight
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

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

const PersonalizeModal: React.FC<PersonalizeModalProps> = ({ open, onClose }) => {
  const { setBoardingPass, setLocation, completeSetup, profile } = useTraveler();
  const [step, setStep] = useState<Step>('welcome');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<BoardingPass | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => {
    setStep('welcome');
    setScanning(false);
    setScanError(null);
    setParsed(null);
    setPreviewUrl(null);
    setUsedFallback(false);
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 200);
  };

  const handleFile = async (file: File) => {
    setScanError(null);
    setScanning(true);
    setPreviewUrl(URL.createObjectURL(file));
    try {
      const b64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke('parse-boarding-pass', {
        body: { imageBase64: b64 },
      });
      if (error) throw new Error(error.message || 'Scan failed');
      if (!data) throw new Error('No data returned');
      const { usedFallback: fallback, apiConfigured, visionError, ...bp } = data;
      setParsed(bp as BoardingPass);
      setUsedFallback(!!fallback);
      setStep('review');
      if (visionError) console.warn('Vision error:', visionError);
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Could not scan boarding pass');
    } finally {
      setScanning(false);
    }
  };

  const handleSkipScan = () => {
    // Allow demo / manual flow
    handleFile(new File([new Blob(['demo'])], 'demo.txt'));
  };

  const confirmBoardingPass = () => {
    if (!parsed) return;
    setBoardingPass(parsed);
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
              onUseCamera={() => cameraInputRef.current?.click()}
              onSkip={handleSkipScan}
              onBack={() => setStep('welcome')}
            />
          )}

          {step === 'review' && parsed && (
            <ReviewStep
              data={parsed}
              usedFallback={usedFallback}
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
          accept="image/*,.pdf"
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
}> = ({ scanning, error, previewUrl, onPickFile, onUseCamera, onSkip, onBack }) => (
  <div>
    <div className="flex items-center gap-2 mb-1">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Step 1 of 2</span>
    </div>
    <h2 className="text-2xl font-bold text-slate-900 mb-2">Scan your boarding pass</h2>
    <p className="text-slate-600 text-sm mb-6">
      Snap a photo or upload an image / PDF. We'll extract your flight details automatically.
    </p>

    {scanning ? (
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
        <button
          onClick={onUseCamera}
          className="group flex flex-col items-center gap-2 p-6 rounded-2xl border-2 border-slate-200 hover:border-red-500 hover:bg-red-50/40 transition"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow group-hover:scale-105 transition">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <p className="font-semibold text-slate-900 text-sm">Use camera</p>
          <p className="text-xs text-slate-500">Snap a quick photo</p>
        </button>
        <button
          onClick={onPickFile}
          className="group flex flex-col items-center gap-2 p-6 rounded-2xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center shadow group-hover:scale-105 transition">
            <Upload className="w-6 h-6 text-white" />
          </div>
          <p className="font-semibold text-slate-900 text-sm">Upload image / PDF</p>
          <p className="text-xs text-slate-500">From email or wallet</p>
        </button>
      </div>
    )}

    {error && (
      <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs mb-4">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{error}</span>
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
  onChange: (field: keyof BoardingPass, value: string) => void;
  onConfirm: () => void;
  onRescan: () => void;
}> = ({ data, usedFallback, onChange, onConfirm, onRescan }) => (
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
          Demo data shown. Live boarding-pass parsing is not configured in this environment yet, so this review screen is using fallback sample data.
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
