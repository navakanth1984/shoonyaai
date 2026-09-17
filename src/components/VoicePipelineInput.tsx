import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  Volume2, 
  Check, 
  RotateCcw, 
  AlertCircle, 
  ArrowRight,
  Radio,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface VoicePipelineInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onApplyPipelineParams?: (source?: string, destination?: string, mode?: string) => void;
  onTriggerGenerate?: () => void;
  isGenerating?: boolean;
}

export const VoicePipelineInput: React.FC<VoicePipelineInputProps> = ({
  prompt,
  setPrompt,
  onApplyPipelineParams,
  onTriggerGenerate,
  isGenerating = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [inferredData, setInferredData] = useState<{
    inferredSource?: string;
    inferredDestination?: string;
    inferredMode?: string;
    refinedPrompt?: string;
  } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Web Speech API reference
  const recognitionRef = useRef<any>(null);
  // MediaRecorder & Web Audio API references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check if Web Speech API is supported
  const hasWebSpeech = typeof window !== 'undefined' && 
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopListeningCleanup();
    };
  }, []);

  const stopListeningCleanup = () => {
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
      streamRef.current.getTracks().forEach(track => track.stop());
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

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Start microphone and speech recognition
  const handleStartListening = async () => {
    setErrorMessage(null);
    setInterimText('');
    setInferredData(null);
    setIsExpanded(true);

    try {
      // 1. Request microphone access for audio visualizer and fallback recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 2. Setup Web Audio API for live amplitude visualizer
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            animationFrameRef.current = requestAnimationFrame(updateLevel);
          }
        };
        updateLevel();
      } catch (audioErr) {
        console.warn('Web Audio API visualization not initialized:', audioErr);
      }

      // 3. Setup MediaRecorder for backend AI transcription backup
      audioChunksRef.current = [];
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      } catch {
        recorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 1000) {
          // Send to Gemini voice transcriber for intelligent parameter extraction
          await processVoiceWithGemini(audioBlob);
        }
      };

      recorder.start(250);

      // 4. Setup Web Speech API for instantaneous real-time transcription
      if (hasWebSpeech) {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRec();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentInterim = '';
          let currentFinal = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              currentFinal += transcript + ' ';
            } else {
              currentInterim += transcript;
            }
          }

          if (currentInterim) {
            setInterimText(currentInterim);
          }

          if (currentFinal) {
            setPrompt((prev) => {
              const cleaned = prev.trim();
              const addition = currentFinal.trim();
              return cleaned ? `${cleaned} ${addition}` : addition;
            });
            setInterimText('');
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          if (event.error === 'not-allowed') {
            setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser.');
            handleStopListening();
          }
        };

        recognition.onend = () => {
          // If still marked as listening and no error, keep going or finalize
          if (isListening) {
            try {
              recognition.start();
            } catch (e) {
              // ignore
            }
          }
        };

        recognition.start();
      }

      setIsListening(true);
    } catch (err: any) {
      console.error('Error starting voice dictation:', err);
      setErrorMessage(
        err.name === 'NotAllowedError' || err.message?.includes('Permission')
          ? 'Microphone permission denied. Please grant microphone access to enable voice pipeline creation.'
          : 'Failed to access audio input device. Please verify your microphone connection.'
      );
      stopListeningCleanup();
      setIsListening(false);
    }
  };

  // Stop listening and finalize audio
  const handleStopListening = () => {
    setIsListening(false);
    setAudioLevel(0);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Process audio blob with Gemini backend transcriber & topology extractor
  const processVoiceWithGemini = async (audioBlob: Blob) => {
    setIsProcessingAudio(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const base64Audio = await base64Promise;

      const res = await fetch('/api/gemini/voice-transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: base64Audio,
          mimeType: audioBlob.type || 'audio/webm'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.transcription && (!prompt.trim() || prompt.length < 10)) {
          setPrompt(data.transcription);
        }
        setInferredData({
          inferredSource: data.inferredSource,
          inferredDestination: data.inferredDestination,
          inferredMode: data.inferredMode,
          refinedPrompt: data.refinedPrompt
        });

        // Automatically apply inferred parameters if provided
        if (onApplyPipelineParams && (data.inferredSource || data.inferredDestination || data.inferredMode)) {
          onApplyPipelineParams(data.inferredSource, data.inferredDestination, data.inferredMode);
        }
      }
    } catch (err) {
      console.warn('Gemini voice transcription fallback error:', err);
    } finally {
      setIsProcessingAudio(false);
    }
  };

  // Sample voice dictation phrases
  const sampleVoicePhrases = [
    "Build a real-time CDC pipeline from Kafka to Snowflake with PII masking and micro-batch deduplication.",
    "Ingest AWS Kinesis web clickstream into BigQuery with bot filtering and session attribution.",
    "Stream PostgreSQL Debezium events into Databricks Delta Lake with automatic schema reconciliation."
  ];

  const handleSimulateVoice = (phrase: string) => {
    setPrompt(phrase);
    setIsExpanded(true);
    setInferredData({
      inferredSource: phrase.includes('Kafka') ? 'Apache Kafka (CDC Stream)' : phrase.includes('Kinesis') ? 'AWS Kinesis (web-events)' : 'PostgreSQL Debezium CDC',
      inferredDestination: phrase.includes('Snowflake') ? 'Snowflake (Enterprise Mart)' : phrase.includes('BigQuery') ? 'Google BigQuery (CDP Lake)' : 'Databricks Delta Lake',
      inferredMode: 'streaming',
      refinedPrompt: phrase
    });
    if (onApplyPipelineParams) {
      if (phrase.includes('Kafka')) onApplyPipelineParams('Apache Kafka (CDC Stream)', 'Snowflake (Enterprise Mart)', 'streaming');
      else if (phrase.includes('Kinesis')) onApplyPipelineParams('AWS Kinesis (web-events)', 'Google BigQuery (CDP Lake)', 'streaming');
      else onApplyPipelineParams('PostgreSQL Debezium CDC', 'Databricks Delta Lake', 'streaming');
    }
  };

  return (
    <div className="space-y-2">
      {/* Voice Controls Header / Trigger Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="voice-dictate-toggle-btn"
            onClick={isListening ? handleStopListening : handleStartListening}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] cursor-pointer shadow-md ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse ring-4 ring-rose-500/30'
                : 'bg-indigo-600/90 hover:bg-indigo-600 text-white border border-indigo-400/40 hover:border-indigo-400'
            }`}
            title={isListening ? 'Click to stop listening' : 'Speak your pipeline requirements using microphone'}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4 text-white animate-bounce shrink-0" />
                <span>Stop Voice Dictation</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 text-cyan-300 shrink-0" />
                <span>Dictate Pipeline (Voice)</span>
              </>
            )}
          </button>

          {/* Real-time speech status pill */}
          {isListening && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span>Listening... Speak now</span>
            </div>
          )}

          {isProcessingAudio && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-500/50 text-indigo-200 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              <span>Transcribing & Inferring Topology...</span>
            </div>
          )}
        </div>

        {/* Expand / Collapse studio toggle */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
        >
          <span>Voice Studio</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded Voice Studio Panel */}
      {isExpanded && (
        <div className="p-4 rounded-xl bg-slate-950/90 border border-indigo-900/50 space-y-3.5 animate-in fade-in duration-150">
          {/* Live Waveform & Volume Level Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isListening ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Microphone Voice-to-Text Studio</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono">
                    {hasWebSpeech ? 'WebSpeech + Gemini Live' : 'Gemini AI Transcribe'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isListening 
                    ? 'Capturing audio stream. Say your source, destination, and transformation logic...'
                    : 'Click "Dictate Pipeline" or choose a voice phrase below.'}
                </p>
              </div>
            </div>

            {/* Audio Waveform Bars */}
            <div className="flex items-center gap-1 h-6 px-3 py-1 bg-slate-950 rounded-lg border border-slate-800 shrink-0">
              {[12, 28, 45, 80, 60, 35, 70, 90, 50, 30, 65, 40].map((baseHeight, idx) => {
                const dynamicHeight = isListening 
                  ? Math.max(4, Math.round((baseHeight * (audioLevel + 20)) / 100))
                  : 4;
                return (
                  <div
                    key={idx}
                    className={`w-1 rounded-full transition-all duration-75 ${
                      isListening ? 'bg-cyan-400' : 'bg-slate-700'
                    }`}
                    style={{ height: `${dynamicHeight}px` }}
                  />
                );
              })}
            </div>
          </div>

          {/* Real-time Interim Live Speech Transcription Box */}
          {(isListening || interimText) && (
            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-100 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>Live Speech Recognition:</span>
              </div>
              <p className="text-sm font-medium italic text-cyan-200">
                "{interimText || 'Listening for speech...'}"
              </p>
            </div>
          )}

          {/* Inferred Topology Card */}
          {inferredData && (
            <div className="p-3.5 rounded-xl bg-slate-900 border border-cyan-500/30 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>AI Inferred Pipeline Topology</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Auto-Applied
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Detected Source</span>
                  <span className="text-white font-semibold">{inferredData.inferredSource || 'Apache Kafka'}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Detected Sink</span>
                  <span className="text-white font-semibold">{inferredData.inferredDestination || 'Snowflake'}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Detected Mode</span>
                  <span className="text-white font-semibold uppercase">{inferredData.inferredMode || 'Continuous Streaming'}</span>
                </div>
              </div>

              {onTriggerGenerate && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={onTriggerGenerate}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md cursor-pointer transition-all disabled:opacity-50"
                  >
                    <span>Synthesize DAG from Voice Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick Voice Dictation Suggestions */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Or Click to Test Spoken Voice Pipeline Creation:
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {sampleVoicePhrases.map((phrase, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSimulateVoice(phrase)}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 text-left transition-colors text-xs text-slate-300 hover:text-white group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Mic className="w-3.5 h-3.5 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
                    <span>"{phrase}"</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pl-2">
                    Use Voice Prompt →
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Error message banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
