import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Play,
  Pause,
  RotateCcw,
  Check,
  Trash2,
  Download,
  Copy,
  Plus,
  Search,
  Filter,
  Volume2,
  VolumeX,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  Shield,
  Tag,
  AlertCircle,
  FileText,
  CheckCircle2,
  Sliders,
  Share2,
  Radio,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Cpu
} from 'lucide-react';
import { Pipeline, UserRole, ArchitecturalVoiceMemo, VoiceMemoCategory } from '../types';
import {
  createSyntheticAudioDataUri,
  formatAudioDuration,
  formatFileSize,
  blobToDataUrl
} from '../utils/audioUtils';

interface VoiceMemoRecorderProps {
  activePipeline?: Pipeline;
  pipelines: Pipeline[];
  activeRole: UserRole;
  onOpenPipeline?: (pipelineId: string) => void;
}

const CATEGORY_COLORS: Record<VoiceMemoCategory, { bg: string; text: string; border: string }> = {
  'Partitioning': {
    bg: 'bg-cyan-50 dark:bg-cyan-950/60',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800/60'
  },
  'FinOps & Cost': {
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/60'
  },
  'SLA & Latency': {
    bg: 'bg-amber-50 dark:bg-amber-950/60',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/60'
  },
  'Security & PII': {
    bg: 'bg-rose-50 dark:bg-rose-950/60',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-900/60'
  },
  'Scale & Topology': {
    bg: 'bg-indigo-50 dark:bg-indigo-950/60',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-850'
  },
  'Governance': {
    bg: 'bg-purple-50 dark:bg-purple-950/60',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-900/60'
  },
  'General': {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700'
  }
};

const SUGGESTED_DECISION_TITLES = [
  'Tenant-ID Hash Bucketing & Daily Partitioning Strategy',
  'Micro-batch vs Streaming Latency Trade-off Decision',
  'Kafka Ingestion Buffer Sizing for 3x Peak Spike Resistance',
  'PII Column Redaction Stage Prior to Warehouse Load',
  'Warehouse Auto-Suspend & Credit Burn Guardrails',
  'dbt Incremental Merge Window & Late-Arriving Event Buffer'
];

export const VoiceMemoRecorder: React.FC<VoiceMemoRecorderProps> = ({
  activePipeline,
  pipelines,
  activeRole,
  onOpenPipeline
}) => {
  // Saved Memos State
  const [memos, setMemos] = useState<ArchitecturalVoiceMemo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedPipelineFilter, setSelectedPipelineFilter] = useState<string>('all');

  // Recorder State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  // Review Draft State (After recording stopped)
  const [draftAudioUrl, setDraftAudioUrl] = useState<string | null>(null);
  const [draftDuration, setDraftDuration] = useState<number>(0);
  const [draftFileSize, setDraftFileSize] = useState<number>(0);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftCategory, setDraftCategory] = useState<VoiceMemoCategory>('Partitioning');
  const [draftPipelineId, setDraftPipelineId] = useState<string>(activePipeline?.id || 'global');
  const [draftTranscript, setDraftTranscript] = useState('');
  const [draftKeyDecisions, setDraftKeyDecisions] = useState<string[]>([]);
  const [newDecisionInput, setNewDecisionInput] = useState('');

  // Audio Playback State (for library items)
  const [playingMemoId, setPlayingMemoId] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [playbackDuration, setPlaybackDuration] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedTranscripts, setExpandedTranscripts] = useState<Record<string, boolean>>({});

  // Audio Elements & Web API references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const activeAudioElemRef = useRef<HTMLAudioElement | null>(null);
  const draftAudioElemRef = useRef<HTMLAudioElement | null>(null);

  // Initialize and load saved memos from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('shoonya_architect_voice_memos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMemos(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved voice memos:', e);
    }

    // Default Seed Memos with clean synthetic audio
    const initialDemoMemos: ArchitecturalVoiceMemo[] = [
      {
        id: 'memo-seed-01',
        title: 'Tenant-ID Hash Bucketing & Daily Partitioning Strategy',
        category: 'Partitioning',
        pipelineId: activePipeline?.id || 'pipe-01',
        pipelineName: activePipeline?.name || 'Customer Orders CDC Ingestion',
        audioUrl: createSyntheticAudioDataUri(5, 440),
        durationSeconds: 18,
        recordedAt: 'Today at 10:14 AM',
        architectName: 'Chief Data Architect',
        architectRole: 'architect',
        transcript:
          "After reviewing micro-partition statistics in Snowflake, we confirmed that daily clustering on tenant_id combined with event_timestamp reduces query scanning costs by 38%. We rejected hourly bucketing due to file-fragmentation overhead on S3 object storage.",
        keyDecisions: [
          'Clustering key: (tenant_id, event_date) for orders_fact table',
          'Avoid hourly micro-files; set minimum batch compaction to 15MB',
          'Saves estimated 38% Snowflake warehouse credits per daily analytical run'
        ],
        audioFormat: 'audio/wav',
        fileSizeBytes: 220500
      },
      {
        id: 'memo-seed-02',
        title: 'Kafka Consumer Buffer & Backpressure Spike Protection',
        category: 'Scale & Topology',
        pipelineId: 'pipe-02',
        pipelineName: 'High-Throughput Financial Ledger Stream',
        audioUrl: createSyntheticAudioDataUri(4, 523.25),
        durationSeconds: 24,
        recordedAt: 'Yesterday at 3:45 PM',
        architectName: 'Principal Streaming Engineer',
        architectRole: 'engineer',
        transcript:
          "For the payment events stream, we agreed to size the in-memory circular buffer to 64MB per worker node. When broker lag exceeds 15,000 offsets, the pipeline throttles downstream enrichment stages instead of crashing the dbt staging consumer.",
        keyDecisions: [
          'Circular buffer capacity set to 64MB per worker container',
          'Auto-throttle triggered when Kafka lag exceeds 15k offsets',
          'Prevents out-of-memory container restarts during 3x flash-sale surges'
        ],
        audioFormat: 'audio/wav',
        fileSizeBytes: 176400
      },
      {
        id: 'memo-seed-03',
        title: 'PII Cryptographic Salt Rotation & GDPR Masking Stage',
        category: 'Security & PII',
        pipelineId: 'pipe-03',
        pipelineName: 'Customer 360 Unified Profile Sync',
        audioUrl: createSyntheticAudioDataUri(4, 392),
        durationSeconds: 15,
        recordedAt: 'Sep 14, 2026, 11:20 AM',
        architectName: 'Enterprise Security Architect',
        architectRole: 'security_officer',
        transcript:
          "All credit card numbers and passport IDs must undergo SHA-256 HMAC salting before writing to the raw staging bucket. Raw payloads are permanently purged after 72 hours in compliance with GDPR Article 17.",
        keyDecisions: [
          'Pre-staging SHA-256 HMAC salting for credit card and email columns',
          'Key rotation scheduled every 30 days via GCP KMS integration',
          'Automated lifecycle rule permanently purges raw stage objects after 72 hours'
        ],
        audioFormat: 'audio/wav',
        fileSizeBytes: 176400
      }
    ];

    setMemos(initialDemoMemos);
    try {
      localStorage.setItem('shoonya_architect_voice_memos', JSON.stringify(initialDemoMemos));
    } catch (e) {
      // ignore
    }
  }, [activePipeline]);

  // Persist memos on change
  const saveMemosToStorage = (updated: ArchitecturalVoiceMemo[]) => {
    setMemos(updated);
    try {
      localStorage.setItem('shoonya_architect_voice_memos', JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage quota exceeded for voice memos:', e);
    }
  };

  // Sync draft pipeline id when activePipeline changes
  useEffect(() => {
    if (activePipeline?.id && !isReviewing) {
      setDraftPipelineId(activePipeline.id);
    }
  }, [activePipeline, isReviewing]);

  // Cleanup microphone resources on unmount
  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, []);

  const cleanupRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // ignore
      }
      audioContextRef.current = null;
    }
  };

  // Start Recording
  const handleStartRecording = async () => {
    setMicError(null);
    setInterimTranscript('');
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    // Check mediaDevices support
    if (!navigator?.mediaDevices?.getUserMedia) {
      setMicError('Microphone API is not supported by your browser environment.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      // Web Audio Analyser for live waveform visualization
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateAudioMeter = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(updateAudioMeter);
        };
        updateAudioMeter();
      } catch (audioErr) {
        console.warn('Web Audio meter initialization skipped:', audioErr);
      }

      // Web Speech API for real-time transcription
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const rec = new SpeechRec();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'en-US';

          rec.onresult = (event: any) => {
            let fullText = '';
            for (let i = 0; i < event.results.length; i++) {
              fullText += event.results[i][0].transcript + ' ';
            }
            setInterimTranscript(fullText.trim());
          };

          rec.onerror = (e: any) => {
            console.warn('Speech recognition warning:', e);
          };

          rec.start();
          recognitionRef.current = rec;
        } catch (speechErr) {
          console.warn('Speech recognition error:', speechErr);
        }
      }

      // MediaRecorder setup with supported mimeType
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const dataUrl = await blobToDataUrl(audioBlob);

        setDraftAudioUrl(dataUrl);
        setDraftDuration(recordingSecondsRef.current || 1);
        setDraftFileSize(audioBlob.size);
        setDraftTranscript(interimTranscriptRef.current || '');

        // Pre-fill smart title based on active pipeline
        const suggestedTitle = activePipeline
          ? `Architectural Design Rationale: ${activePipeline.name}`
          : 'Core Pipeline Topology & SLA Design Decision';
        setDraftTitle(suggestedTitle);

        // Pre-fill initial key decision point
        if (interimTranscriptRef.current) {
          setDraftKeyDecisions([interimTranscriptRef.current.substring(0, 100) + '...']);
        } else {
          setDraftKeyDecisions([
            'Partitioning keys verified for low-skew analytical distribution',
            'SLA latency tolerances aligned with consumer applications'
          ]);
        }

        setIsReviewing(true);
      };

      mediaRecorder.start(250); // Collect in 250ms chunks
      setIsRecording(true);

      // Start elapsed timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          recordingSecondsRef.current = prev + 1;
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      setMicError(
        err.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Please allow microphone access in your browser settings to record voice decisions.'
          : `Unable to access microphone: ${err.message || 'Unknown device error'}`
      );
    }
  };

  // Mutable refs for callbacks
  const recordingSecondsRef = useRef(0);
  const interimTranscriptRef = useRef('');
  useEffect(() => {
    interimTranscriptRef.current = interimTranscript;
  }, [interimTranscript]);

  // Stop Recording
  const handleStopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setAudioLevel(0);
  };

  // Test / Simulated Voice Memo (for sandboxed iframe or testing without mic)
  const handleCreateSimulatedMemo = () => {
    const syntheticUrl = createSyntheticAudioDataUri(6, 440);
    setDraftAudioUrl(syntheticUrl);
    setDraftDuration(12);
    setDraftFileSize(264600);
    const suggestedTitle = activePipeline
      ? `Simulated Design Decision: ${activePipeline.name}`
      : 'Micro-Batch Buffer & SLA Partitioning Decision';
    setDraftTitle(suggestedTitle);
    setDraftTranscript(
      "Architectural Decision: We benchmarked streaming Kafka CDC ingest against Snowflake multi-cluster compute. By setting micro-batch intervals to 30 seconds, we attained P95 latency of 420ms while reducing credit burn by 28%."
    );
    setDraftKeyDecisions([
      'Adopted 30-second micro-batching window for high-throughput tables',
      'P95 latency benchmarked under 420ms (well within 1000ms SLA limit)',
      'Snowflake warehouse auto-suspension enabled after 60s idle timeout'
    ]);
    setIsReviewing(true);
  };

  // Add a key decision bullet to draft
  const handleAddDraftDecision = () => {
    if (!newDecisionInput.trim()) return;
    setDraftKeyDecisions((prev) => [...prev, newDecisionInput.trim()]);
    setNewDecisionInput('');
  };

  const handleRemoveDraftDecision = (idx: number) => {
    setDraftKeyDecisions((prev) => prev.filter((_, i) => i !== idx));
  };

  // Save Memo
  const handleSaveDraftMemo = () => {
    if (!draftAudioUrl) return;

    const pipelineObj = pipelines.find((p) => p.id === draftPipelineId);
    const newMemo: ArchitecturalVoiceMemo = {
      id: `memo-${Date.now()}`,
      title: draftTitle.trim() || 'Untitled Architectural Decision',
      category: draftCategory,
      pipelineId: draftPipelineId === 'global' ? undefined : draftPipelineId,
      pipelineName:
        draftPipelineId === 'global'
          ? 'Global Enterprise Architecture'
          : pipelineObj?.name || 'Selected Pipeline',
      audioUrl: draftAudioUrl,
      durationSeconds: draftDuration || 1,
      recordedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today',
      architectName:
        activeRole === 'architect'
          ? 'Chief AI Architect'
          : activeRole === 'engineer'
          ? 'Lead Data Engineer'
          : activeRole === 'security_officer'
          ? 'Security & Governance Officer'
          : 'Platform Architect',
      architectRole: activeRole,
      transcript: draftTranscript.trim() || 'No audio transcript provided.',
      keyDecisions: draftKeyDecisions.length > 0 ? draftKeyDecisions : ['Decision recorded and archived.'],
      audioFormat: draftAudioUrl.startsWith('data:audio/wav') ? 'audio/wav' : 'audio/webm',
      fileSizeBytes: draftFileSize
    };

    saveMemosToStorage([newMemo, ...memos]);
    setIsReviewing(false);
    setDraftAudioUrl(null);
    setDraftTitle('');
    setDraftTranscript('');
    setDraftKeyDecisions([]);
    setRecordingSeconds(0);
  };

  const handleDiscardDraft = () => {
    setIsReviewing(false);
    setDraftAudioUrl(null);
    setDraftTitle('');
    setDraftTranscript('');
    setDraftKeyDecisions([]);
    setRecordingSeconds(0);
  };

  // Playback Handler for Library Items
  const handleTogglePlayMemo = (memo: ArchitecturalVoiceMemo) => {
    if (playingMemoId === memo.id) {
      if (activeAudioElemRef.current) {
        activeAudioElemRef.current.pause();
      }
      setPlayingMemoId(null);
    } else {
      if (activeAudioElemRef.current) {
        activeAudioElemRef.current.pause();
      }

      const audio = new Audio(memo.audioUrl);
      audio.playbackRate = playbackSpeed;
      audio.muted = isMuted;

      audio.ontimeupdate = () => {
        setPlaybackTime(audio.currentTime);
      };

      audio.onloadedmetadata = () => {
        setPlaybackDuration(audio.duration || memo.durationSeconds);
      };

      audio.onended = () => {
        setPlayingMemoId(null);
        setPlaybackTime(0);
      };

      audio.play().catch((err) => {
        console.warn('Playback error:', err);
      });

      activeAudioElemRef.current = audio;
      setPlayingMemoId(memo.id);
    }
  };

  // Change Playback Speed
  const handleChangeSpeed = () => {
    const nextSpeed = playbackSpeed === 1 ? 1.25 : playbackSpeed === 1.25 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
    setPlaybackSpeed(nextSpeed);
    if (activeAudioElemRef.current) {
      activeAudioElemRef.current.playbackRate = nextSpeed;
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (activeAudioElemRef.current) {
      activeAudioElemRef.current.muted = nextMuted;
    }
  };

  // Delete a memo
  const handleDeleteMemo = (id: string) => {
    if (playingMemoId === id && activeAudioElemRef.current) {
      activeAudioElemRef.current.pause();
      setPlayingMemoId(null);
    }
    const updated = memos.filter((m) => m.id !== id);
    saveMemosToStorage(updated);
  };

  // Copy transcript text
  const handleCopyTranscript = (memo: ArchitecturalVoiceMemo) => {
    const text = `[Architectural Voice Memo]\nTitle: ${memo.title}\nCategory: ${memo.category}\nPipeline: ${memo.pipelineName}\nDate: ${memo.recordedAt}\nArchitect: ${memo.architectName}\n\nKey Decisions:\n${memo.keyDecisions.map((d) => `• ${d}`).join('\n')}\n\nTranscript:\n"${memo.transcript}"`;
    navigator.clipboard.writeText(text);
    setCopiedId(memo.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Download audio file
  const handleDownloadAudio = (memo: ArchitecturalVoiceMemo) => {
    const link = document.createElement('a');
    link.href = memo.audioUrl;
    const ext = memo.audioFormat?.includes('wav') ? 'wav' : 'webm';
    link.download = `voice_memo_${memo.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Memos
  const filteredMemos = memos.filter((memo) => {
    const matchesSearch =
      !searchTerm.trim() ||
      memo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      memo.transcript.toLowerCase().includes(searchTerm.toLowerCase()) ||
      memo.keyDecisions.some((d) => d.toLowerCase().includes(searchTerm.toLowerCase())) ||
      memo.pipelineName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategoryFilter === 'all' || memo.category === selectedCategoryFilter;

    const matchesPipeline =
      selectedPipelineFilter === 'all' ||
      (selectedPipelineFilter === 'global' ? !memo.pipelineId : memo.pipelineId === selectedPipelineFilter);

    return matchesSearch && matchesCategory && matchesPipeline;
  });

  // Aggregated Stats
  const totalDurationSeconds = memos.reduce((sum, m) => sum + m.durationSeconds, 0);
  const categoriesCount = new Set(memos.map((m) => m.category)).size;

  return (
    <div className="space-y-6">
      {/* Top Banner with Platform Context & Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 shrink-0">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Architectural Voice Memos &amp; Audio Decision Logs
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Microphone Ready
                </span>
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                  Engineering Governance
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Record brief verbal architectural design decisions, SLA trade-offs, and partition rationales directly via microphone to maintain an auditable voice log.
              </p>
            </div>
          </div>

          {/* Quick Record Trigger & Test Trigger */}
          <div className="flex flex-wrap items-center gap-2.5">
            {!isRecording && !isReviewing && (
              <>
                <button
                  id="btn-simulate-voice-memo"
                  onClick={handleCreateSimulatedMemo}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                  title="Generate a sample synthesized audio memo without microphone"
                >
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>Sample Memo</span>
                </button>

                <button
                  id="btn-start-recording-memo"
                  onClick={handleStartRecording}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                  <Mic className="w-4 h-4" />
                  <span>Record Decision</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Telemetry Metric Ribbon */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Total Logs</div>
              <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {memos.length} decisions
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Audio Log Time</div>
              <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {formatAudioDuration(totalDurationSeconds)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Active Pipeline</div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                {activePipeline?.name || 'General Architecture'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 shrink-0">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Categories</div>
              <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {categoriesCount} domains
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recording Error Alert */}
      {micError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">Microphone Access Notification:</div>
              <div>{micError}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                You can still generate test audio logs using the &quot;Sample Memo&quot; button above to explore the complete playback and decision archiving workflow.
              </div>
            </div>
          </div>
          <button
            onClick={() => setMicError(null)}
            className="text-rose-600 hover:text-rose-800 text-xs font-semibold underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active Recording Studio Card */}
      {isRecording && (
        <div className="bg-slate-950 text-white rounded-2xl border-2 border-rose-500/80 p-5 sm:p-6 shadow-xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            {/* Left: Microphone Pulsing Badge & Elapsed Timer */}
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative">
                <div
                  className="w-16 h-16 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition-transform"
                  style={{
                    transform: `scale(${1 + (audioLevel / 100) * 0.15})`
                  }}
                >
                  <Mic className="w-8 h-8 animate-pulse" />
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-bold text-rose-400">
                    Recording Live Audio Log
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800">
                    REC
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-white mt-0.5">
                  {formatAudioDuration(recordingSeconds)}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Associated with: <span className="text-slate-200 font-semibold">{activePipeline?.name || 'Enterprise Topology'}</span>
                </div>
              </div>
            </div>

            {/* Middle: Live Audio Waveform Level Meter */}
            <div className="w-full md:flex-1 max-w-md bg-slate-900/80 rounded-xl p-3 border border-slate-800">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                <span>Microphone Input Level</span>
                <span className="font-mono text-cyan-400">{audioLevel}%</span>
              </div>
              {/* Visualizer Bars */}
              <div className="flex items-end justify-between h-8 gap-1 px-1">
                {[...Array(24)].map((_, i) => {
                  const factor = Math.sin((i / 24) * Math.PI);
                  const barHeight = Math.max(12, Math.min(100, audioLevel * factor * 1.5 + (i % 3) * 6));
                  return (
                    <div
                      key={i}
                      className="w-full bg-gradient-to-t from-indigo-500 via-cyan-400 to-rose-400 rounded-full transition-all duration-75"
                      style={{ height: `${barHeight}%` }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Right: Stop Recording Button */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <button
                id="btn-stop-recording-memo"
                onClick={handleStopRecording}
                className="w-full md:w-auto px-6 py-3 rounded-xl text-sm font-bold bg-white text-slate-950 hover:bg-slate-100 shadow-lg shadow-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <div className="w-3 h-3 rounded-sm bg-rose-600"></div>
                <span>Finish &amp; Review</span>
              </button>
            </div>
          </div>

          {/* Real-time Transcription Stream */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs">
            <span className="text-slate-400 font-semibold mr-2">Live Voice Transcription:</span>
            <span className="text-slate-300 font-mono italic">
              {interimTranscript || 'Speak your architectural decision into your microphone... (e.g. "We chose tenant_id hashing to minimize partition skews")'}
            </span>
          </div>
        </div>
      )}

      {/* Review & Edit Draft Decision Card (Post-Recording) */}
      {isReviewing && draftAudioUrl && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-indigo-500/80 p-5 sm:p-6 shadow-lg space-y-5 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Review &amp; Annotate Architectural Decision
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Listen to your recorded audio log, assign metadata, and verify key takeaways before saving.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <span>Duration: <strong className="text-slate-900 dark:text-white">{formatAudioDuration(draftDuration)}</strong></span>
              <span>&bull;</span>
              <span>Size: <strong className="text-slate-900 dark:text-white">{formatFileSize(draftFileSize)}</strong></span>
            </div>
          </div>

          {/* Audio Player Preview */}
          <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <audio
                ref={draftAudioElemRef}
                src={draftAudioUrl}
                controls
                className="w-full sm:w-80 h-10 rounded-lg focus:outline-none"
              />
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center sm:text-right">
              Use standard audio controls to test microphone playback clarity
            </div>
          </div>

          {/* Form Fields: Title, Pipeline, Category */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Title Input */}
            <div className="md:col-span-6 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Architectural Decision Title
              </label>
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="e.g. Tenant-ID Hash Bucketing & Daily Partitioning Strategy"
                className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />

              {/* Suggested Quick Titles */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1">
                <span className="text-[10px] text-slate-400 shrink-0">Quick suggestions:</span>
                {SUGGESTED_DECISION_TITLES.slice(0, 3).map((st, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDraftTitle(st)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors shrink-0 truncate max-w-[160px] cursor-pointer"
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Pipeline Selector */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Associated Pipeline
              </label>
              <select
                value={draftPipelineId}
                onChange={(e) => setDraftPipelineId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="global">Global Enterprise Topology</option>
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Selector */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Decision Domain
              </label>
              <select
                value={draftCategory}
                onChange={(e) => setDraftCategory(e.target.value as VoiceMemoCategory)}
                className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="Partitioning">Partitioning &amp; Bucketing</option>
                <option value="FinOps & Cost">FinOps &amp; Cost Control</option>
                <option value="SLA & Latency">SLA &amp; Latency</option>
                <option value="Security & PII">Security &amp; PII Masking</option>
                <option value="Scale & Topology">Scale &amp; Topology</option>
                <option value="Governance">Governance &amp; Lineage</option>
                <option value="General">General Architecture</option>
              </select>
            </div>
          </div>

          {/* Transcript & Rationale Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Spoken Transcript / Decision Rationale
              </label>
              <span className="text-[10px] text-slate-400">Captured via Speech-to-Text (Editable)</span>
            </div>
            <textarea
              rows={3}
              value={draftTranscript}
              onChange={(e) => setDraftTranscript(e.target.value)}
              placeholder="Detailed architectural trade-offs, reasons for rejecting alternative solutions, and expected performance characteristics..."
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Key Decision Points (Takeaways) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Bullet Takeaways &amp; Architectural Rules
            </label>

            <div className="space-y-1.5">
              {draftKeyDecisions.map((decision, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <span className="truncate">{decision}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDraftDecision(idx)}
                    className="text-slate-400 hover:text-rose-500 text-xs p-1 cursor-pointer shrink-0"
                    title="Remove point"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>

            {/* Add Decision Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newDecisionInput}
                onChange={(e) => setNewDecisionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDraftDecision();
                  }
                }}
                placeholder="Add specific rule (e.g. 'Set minimum micro-batch buffer to 15MB')..."
                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddDraftDecision}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Point</span>
              </button>
            </div>
          </div>

          {/* Action Buttons: Save & Discard */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              id="btn-discard-draft-memo"
              type="button"
              onClick={handleDiscardDraft}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Discard Audio
            </button>
            <button
              id="btn-save-draft-memo"
              type="button"
              onClick={handleSaveDraftMemo}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save &amp; Archive Audio Decision</span>
            </button>
          </div>
        </div>
      )}

      {/* Audio Logs Library Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-4">
        {/* Section Header & Filter Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Archived Architectural Voice Logs</span>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {filteredMemos.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Auditable voice repository documenting infrastructure trade-offs and team engineering decisions.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search audio logs..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="Partitioning">Partitioning</option>
              <option value="FinOps & Cost">FinOps &amp; Cost</option>
              <option value="SLA & Latency">SLA &amp; Latency</option>
              <option value="Security & PII">Security &amp; PII</option>
              <option value="Scale & Topology">Scale &amp; Topology</option>
              <option value="Governance">Governance</option>
            </select>

            {/* Pipeline Filter */}
            <select
              value={selectedPipelineFilter}
              onChange={(e) => setSelectedPipelineFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              <option value="all">All Pipelines</option>
              <option value="global">Global Topology</option>
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Memos List */}
        {filteredMemos.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Mic className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No matching architectural voice memos found
            </div>
            <p className="text-xs max-w-sm mx-auto">
              Click &quot;Record Decision&quot; to dictate your first engineering rationale or adjust your search filter criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredMemos.map((memo) => {
              const isPlaying = playingMemoId === memo.id;
              const categoryStyle = CATEGORY_COLORS[memo.category] || CATEGORY_COLORS['General'];
              const isExpanded = !!expandedTranscripts[memo.id];

              return (
                <div
                  key={memo.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isPlaying
                      ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-400 dark:border-indigo-600 shadow-sm'
                      : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Card Header: Category Badge, Pipeline Pill, Timestamp */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md border uppercase tracking-wider ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border}`}
                      >
                        {memo.category}
                      </span>

                      {memo.pipelineName && (
                        <span
                          onClick={() => memo.pipelineId && onOpenPipeline && onOpenPipeline(memo.pipelineId)}
                          className={`text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 ${
                            memo.pipelineId ? 'hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer underline' : ''
                          }`}
                          title={memo.pipelineId ? 'Switch to this pipeline' : undefined}
                        >
                          <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate max-w-[200px]">{memo.pipelineName}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <span>{memo.recordedAt}</span>
                      <span>&bull;</span>
                      <span className="font-sans text-slate-600 dark:text-slate-300 font-medium">
                        {memo.architectName}
                      </span>
                    </div>
                  </div>

                  {/* Decision Title */}
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-2.5">
                    {memo.title}
                  </h4>

                  {/* Interactive Audio Player Bar */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-750 flex flex-col sm:flex-row items-center justify-between gap-3 mb-3 shadow-2xs">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {/* Play/Pause Button */}
                      <button
                        onClick={() => handleTogglePlayMemo(memo)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-sm ${
                          isPlaying
                            ? 'bg-rose-600 text-white'
                            : 'bg-indigo-600 text-white hover:bg-indigo-500'
                        }`}
                        title={isPlaying ? 'Pause playback' : 'Play audio decision'}
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </button>

                      {/* Playing Waveform Animation or Idle Bar */}
                      <div className="flex items-center gap-1 h-6">
                        {[...Array(16)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-1 rounded-full transition-all duration-150 ${
                              isPlaying
                                ? 'bg-indigo-500 animate-pulse'
                                : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                            style={{
                              height: isPlaying
                                ? `${Math.max(25, ((i * 17) % 85) + 15)}%`
                                : `${Math.max(20, ((i * 7) % 60) + 20)}%`
                            }}
                          />
                        ))}
                      </div>

                      {/* Duration Display */}
                      <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                        {isPlaying
                          ? `${formatAudioDuration(playbackTime)} / ${formatAudioDuration(playbackDuration || memo.durationSeconds)}`
                          : formatAudioDuration(memo.durationSeconds)}
                      </div>
                    </div>

                    {/* Audio Controls: Speed, Mute, Format Info */}
                    <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-500">
                      {isPlaying && (
                        <>
                          <button
                            onClick={handleChangeSpeed}
                            className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-bold cursor-pointer"
                            title="Toggle playback speed"
                          >
                            {playbackSpeed}x
                          </button>
                          <button
                            onClick={handleToggleMute}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                            title={isMuted ? 'Unmute' : 'Mute'}
                          >
                            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </button>
                        </>
                      )}

                      <span className="text-[11px] font-mono text-slate-400">
                        {memo.audioFormat?.replace('audio/', '').toUpperCase() || 'AUDIO'}
                      </span>
                    </div>
                  </div>

                  {/* Key Takeaways Bullets */}
                  {memo.keyDecisions && memo.keyDecisions.length > 0 && (
                    <div className="space-y-1 mb-3">
                      <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                        Architectural Directives:
                      </div>
                      <div className="space-y-1">
                        {memo.keyDecisions.map((decision, dIdx) => (
                          <div
                            key={dIdx}
                            className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                            <span>{decision}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expandable Transcript Accordion */}
                  {memo.transcript && (
                    <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/70">
                      <button
                        onClick={() =>
                          setExpandedTranscripts((prev) => ({
                            ...prev,
                            [memo.id]: !prev[memo.id]
                          }))
                        }
                        className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Hide Transcript</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>View Full Spoken Transcript</span>
                          </>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 font-mono leading-relaxed">
                          &ldquo;{memo.transcript}&rdquo;
                        </div>
                      )}
                    </div>
                  )}

                  {/* Card Bottom Actions: Download, Copy, Delete */}
                  <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-200/50 dark:border-slate-800/50 text-xs">
                    <div className="text-[11px] text-slate-400">
                      File Size: {formatFileSize(memo.fileSizeBytes)}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyTranscript(memo)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Copy memo transcript and directives to clipboard"
                      >
                        {copiedId === memo.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-500 font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Notes</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDownloadAudio(memo)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Download audio recording file"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>

                      <button
                        onClick={() => handleDeleteMemo(memo.id)}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        title="Delete audio log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
