// gemini-transcribe.type.ts

export interface TranscriptionModeConfig {
  type?: 'verbatim';
  timestamp_granularities?: ('word')[];
  diarization_mode?: 'speaker';
}

// if choosing smart then timestamp and diarization must be disabled
export interface TranscriptionConfigOptions {
  language_codes?: string[];
  custom_vocabulary?: string[];
  mode?: 'smart' | TranscriptionModeConfig;
}

export interface TranscribeOptions {
  filePath: string;
  mimeType: string;
  fileName:string;
  originalPath:string;
  transcriptionConfig?: TranscriptionConfigOptions;
}

// ---------- Raw annotations coming from Gemini ----------
export interface WordAnnotation {
  type: string;
  text: string;
  speaker?: string;
  start_offset?: string;
  end_offset?: string;
}

// ---------- Structured transcript format ----------
export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptSegment {
  speaker: string;
  start: number;
  end: number;
  text: string;
  language: string; // "mixed" | "en" | "km" | ...
  words: TranscriptWord[];
}

export interface TranscriptResult {
  metadata: {
    source_file: string;
    duration_seconds: number;
    language_detected: string;
  };
  transcript_segments: TranscriptSegment[];
}

// ---------- Service return type ----------
export interface TranscribeResult {
  outputText: string;
  words?: WordAnnotation[];       // raw annotations (for frontend chips)
  structured?: TranscriptResult;  // clean JSON format you wanted
}