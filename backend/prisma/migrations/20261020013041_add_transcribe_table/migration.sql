-- CreateTable
CREATE TABLE "Transcribe" (
    "id" TEXT NOT NULL,
    "audio_name" TEXT NOT NULL,
    "transcription" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "transcription_json" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transcribe_pkey" PRIMARY KEY ("id")
);
