import { useRef,useEffect } from "react";
import background from '../../assets/manga.png';

const Lyric = ({output,isStreaming}:{output:string,isStreaming:boolean}) => {
        const scrollRef = useRef<HTMLDivElement>(null);
        const stickToBottomRef  = useRef(true);

        function onScroll() {
            const el = scrollRef.current;
            if (!el) return;
            const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
            stickToBottomRef.current = distFromBottom < 20; // within 20px = "at bottom"
        }

        useEffect(() => {
            const el = scrollRef.current;
            if (!el) return;
            if (stickToBottomRef.current) {
            el.scrollTop = el.scrollHeight;
            }
        }, [output]);

      return (
        <>
            {output.length > 0 && isStreaming && (
                <div className='fixed left-[20vw] top-[22vw] z-20 h-32'>
                    <img src={background} className="absolute left-[-1.5rem] top-0 z-0 max-w-none w-80 h-48"/>
                    <div className='relative z-10 mt-12 max-h-32 flex gap-2 w-64 rounded-4xl p-4 rounded-tr-sm flex-col'>
                    
                    <div
                        ref={scrollRef}
                        onScroll={onScroll}
                     className='relative max-h-28 overflow-y-scroll no-scrollbar '
                    >
                        <div className=' flex'>
                        <p className='text-gray-800 wrap-break-word whitespace-pre-wrap'>{output}</p>
                        </div>
                    </div> 
                </div>
                </div>
            )}
        </>
      )
}

export default Lyric;