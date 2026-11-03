import { useRef, useState, useEffect } from 'react';
import { useVoiceChat } from '../components/hooks/useVoiceChat';
const url = import.meta.env.VITE_BACKEND_URL; // the socket.io backend, not VITE_STREAM
import { useStage } from '../context/StageContext';
import razeFlirt from '../assets/pain/pain4x4.png';
import Lyric from '../components/chat/Lyric';
import { ToggleChat } from '../components/chat/ToggleChat';
import { useNotifications } from '../components/hooks/useNotification';
import { NotificationContainer } from '../components/public/Notification';
import VoiceRecorder from '../components/chat/Recorder';
import { useVoiceStreamer } from '../components/hooks/useVoiceStreamer';
import RecordingIndicator from '../components/public/RecordingIndicator';
import Transcript from '../components/chat/Transcript';

import { VoiceVisualizer } from '../components/chat/visualizer/VoiceVisualizer';
import { SphereVisualizer } from '../components/chat/visualizer/SphereVisualizer';

// a single message
interface Message {
  text: string;
  thinking:boolean;
}

// one exchange (her turn + your turn)
interface Exchange {
  she: Message;
  me: Message;
}

// the whole conversation
type Conversation = Exchange[];

const mydata:Conversation = [
  {
   she:{text:"Hello ? you speak to who?",thinking:false},
   me:{text:"Hello",thinking:false}
  }
]

const SendIcon = <svg xmlns="http://www.w3.org/2000/svg" width="1.4em" height="1.4em" viewBox="0 0 16 16">
	<path d="M0 0h16v16H0z" fill="none" />
	<path fill="currentColor" d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26l.001.002l4.995 3.178l3.178 4.995l.002.002l.26.41a.5.5 0 0 0 .886-.083zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215l7.494-7.494l1.178-.471z" />
</svg>

const StopIcon = <svg xmlns="http://www.w3.org/2000/svg" width="1.4em" height="1.4em" viewBox="0 0 24 24">
	<path d="M0 0h24v24H0z" fill="none" />
	<path fill="currentColor" d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10s10-4.49 10-10S17.51 2 12 2m4 14H8V8h8z" />
</svg>


export function Chat() {
  const [prompt, setPrompt] = useState('');
  const [formError, setFormError] = useState('');
  const [conversation, setConversation] = useState<Conversation>(mydata);
  const { setStage } = useStage();
  const [isChatListOpen,setIsChatListOpen] = useState<boolean>(true);

  const { text: spokenText, phase, error, send, stop,analyser } = useVoiceChat(url);

  const isBusy = phase === 'processing' || phase === 'playing' || phase === 'buffering';

  const outerScrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickInnerBottomRef = useRef(true);

  const { notifications, removeNotification, NotificationSuccess, NotificationError } = useNotifications();
  const { isRecording, startRecording, stopRecording,interim,finals,isReady,setIsReady } = useVoiceStreamer();

  // phase -> character stage
  useEffect(() => {
    if (phase === 'processing' || phase === 'buffering') setStage('thinking');
    else if (phase === 'playing') setStage('speaking');
    else setStage('idle'); // idle | ended
  }, [phase, setStage]);

  // revealed text -> last exchange (her side)
  useEffect(() => {
    if (!spokenText) return;
    setConversation((prev) => {
      const next = prev.slice();
      const last = next[next.length - 1];
      if (!last) return prev;
      next[next.length - 1] = { she: { text: spokenText, thinking: false }, me: last.me };
      return next;
    });
  }, [spokenText]);

  // revealed text -> last exchange (my side)
  useEffect(() => {
    const lastFinals = finals[finals.length -1];
    if (!lastFinals) return;
    setConversation((prev) => [
      ...prev,
      { she: { text: '...', thinking: true }, me: { text: lastFinals, thinking: false } },
    ]);
  }, [finals]);

  async function handleSend() {
    const trimmed = prompt.trim();
    if (!trimmed) return setFormError('Please enter a message');
    setFormError('');

    const ok = await send(trimmed);
    if (!ok) return;

    setConversation((prev) => [
      ...prev,
      { she: { text: '...', thinking: true }, me: { text: trimmed, thinking: false } },
    ]);
    setPrompt('');
  }

  function typing(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setPrompt(e.target.value);
  }

  function onOuterScroll() {
    const el = outerScrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
  }

  useEffect(() => {
    const el = outerScrollRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [conversation]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickInnerBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickInnerBottomRef.current) return; // was checking the outer ref before
    el.scrollTop = el.scrollHeight;
  }, [spokenText]);

  const shownError = formError || error;

  useEffect(() => {
    if (shownError) {
      NotificationError('Something went wrong. Please try again.', {
        autoClose: true,
        autoCloseDuration: 5000,
      });
    }
  }, [shownError, NotificationError]);

  useEffect(() => {
    if (isReady) {
      NotificationSuccess('Call connected.', {
        autoClose: true,
        autoCloseDuration: 5000,
      });
    }
  }, [isReady, NotificationSuccess]);

  useEffect(() => {
    if (isReady == false && isRecording == true) {
      NotificationSuccess('Calling...', {
        autoClose: true,
        autoCloseDuration: 5000,
      });
    }
  }, [isReady,isRecording, NotificationSuccess]);

  return (
    <div>

      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
        position="top-right"
      />

      <Lyric output={spokenText} isStreaming={isBusy} />

      {/* conversation list: unchanged, but add key={i} to the .map item */}

      <div className='h-150 flex justify-end '>
        {isChatListOpen && (
          <div 
              ref={outerScrollRef}
              onScroll={onOuterScroll}
              className=' flex flex-col overflow-auto no-scrollbar items-end px-4'>
              {conversation.map(data =>(
                <div className='w-[35vw] '>

                  <div>
                      <div className='mt-12 flex gap-2 flex-col items-end'>
                
                        <p className=' text-xl '><span className=' glass rounded-full px-2'><span className='bg-linear-to-r from-orange-700 to-blue-500 bg-clip-text text-transparent'>Nobody</span></span></p>
                        <div className='relative max-h-28 overflow-y-scroll no-scrollbar '
                        >
                          <div className=' flex justify-end'>
                            <p className='text-gray-800 wrap-break-word whitespace-pre-wrap'>{data.me.text}</p>
                          </div>
                      </div> 
                    </div>
                  </div>

                  <div>
                    <div className='mt-12 flex flex-col  gap-4 '>
                      <div className='flex gap-2'>
                      
                        <div className=' w-18 h-18 overflow-hidden  shrink-0 bg-gray-300 shader-2xl border-2 border-white overflow-hidden rounded-full flex items-center justify-center '>
                          <img
                            src={razeFlirt}
                            alt="raze"
                            className="h-auto  "
                          />
                        </div>

                        <div className=' w-full flex flex-col gap-2'>
                          <p className=' text-xl '><span className=' glass rounded-full px-2'><span className='bg-linear-to-r from-green-700 to-blue-500 bg-clip-text text-transparent'>Pain</span></span></p>
                          <div className='relative max-h-28 overflow-y-scroll no-scrollbar '
                            ref={scrollRef}
                            onScroll={onScroll}
                          >
                            <div className='flex items-end'>
                              {data.she.thinking ? (<div>
                                <p className=' text-sm text-gray-700'>seen...</p>
                              </div>):
                              (
                                <p className='wrap-break-word text-gray-800 whitespace-pre-wrap'>{data.she.text}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
            ))}
          </div>
        )}
       </div>


      <div className=" relative mt-6  flex flex-col items-end gap-4 mx-4">

        <div className='absolute  bottom-20 pointer-events-none'>
          <SphereVisualizer analyser={analyser} size={220}/>
        </div>


        <div className="glass relative rounded-3xl flex gap-4 justify-end items-end w-[35vw]">
          {isRecording && (
            <div className='absolute z-30 left-0 -top-4'>
              <RecordingIndicator dotCount={6} color='blue'/>
            </div>
          )}

          {!isRecording && (
            <textarea
              className="w-full min-h-24 max-h-48 rounded-4xl p-4 no-scrollbar focus:outline-none focus:ring-0 focus:border-0"
              value={prompt}
              onChange={typing}
              disabled={isBusy}
              placeholder="Say hi to Mikasa…"
            />
          )}

          <Transcript finals={finals}/>

          <div className=' m-2 flex flex-col gap-2 items-center'>
            <div className=' flex gap-2'>
              {!isRecording && (
                <button
                  className="glass text-white w-11 h-11 shrink-0 flex shadow-sm items-center justify-center rounded-full"
                  onClick={isBusy ? stop : handleSend}
                >
                  {isBusy ? StopIcon : SendIcon}
                </button>
              )}

              <VoiceRecorder
                isRecording={isRecording}
                startRecording={startRecording}
                stopRecording={stopRecording}
                setIsReady={setIsReady}
              />
            </div>
            <ToggleChat theme={isChatListOpen} setThemeState={setIsChatListOpen} />

          </div>
        </div>
      </div>
    </div>
  );
}