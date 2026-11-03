import type { SetStateAction } from "react";
import type React from "react";

interface VoiceRecorderProps {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  setIsReady: React.Dispatch<SetStateAction<boolean>>;
}

const StopIcon = <svg xmlns="http://www.w3.org/2000/svg" width="1.4em" height="1.4em" viewBox="0 0 24 24">
	<path d="M0 0h24v24H0z" fill="none" />
	<path fill="currentColor" d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10s10-4.49 10-10S17.51 2 12 2m4 14H8V8h8z" />
</svg>

const RecordIcon = <svg xmlns="http://www.w3.org/2000/svg" width="1.4em" height="1.4em" viewBox="0 0 28 28">
	<path d="M0 0h28v28H0z" fill="none" />
	<path fill="currentColor" d="M8.5 6.5a4.5 4.5 0 1 1 9 0v7.124a7.51 7.51 0 0 0-4.35 5.373L13 19a4.5 4.5 0 0 1-4.5-4.5zM13.016 21H13a6.5 6.5 0 0 1-6.5-6.5v-.75a.75.75 0 1 0-1.5 0v.75a8 8 0 0 0 7.25 7.965v2.785a.75.75 0 0 0 1.5 0v-1.477A7.5 7.5 0 0 1 13.016 21m7.484 4.5a5 5 0 1 1 0-10a5 5 0 0 1 0 10m0 1.5a6.5 6.5 0 1 0 0-13a6.5 6.5 0 0 0 0 13m0-3a3.5 3.5 0 1 0 0-7a3.5 3.5 0 0 0 0 7" />
</svg>



export default function VoiceRecorder({
  isRecording,
  startRecording,
  stopRecording,
  setIsReady,
}: VoiceRecorderProps) {
  
function handlestopRecording(){
  stopRecording();
  setIsReady(false);
}
function handleStartRecording(){
  startRecording();
}
  return (
    <button className=" glass w-11 h-11 flex justify-center items-center text-white rounded-full"
        onClick={isRecording ? handlestopRecording : handleStartRecording}>
        {isRecording ? StopIcon : RecordIcon}
    </button>
  );
}
