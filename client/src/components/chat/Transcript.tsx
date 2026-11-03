import { useRef,useEffect,useState } from "react";

const  Transcript = ({finals}:{finals:string[]}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const stickToBottomRef  = useRef(true);
    const [lastFinals,setLastFinals] = useState(finals[finals.length -1] ?? '');

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
    }, [lastFinals]);

    setTimeout(()=>{
        setLastFinals('');
    },1000)
    return (
        <>
        {lastFinals.length > 0 && (
            <div 
            ref={scrollRef}
            onScroll={onScroll}
            className='w-full relative -top-2 max-h-20 no-scrollbar rounded-4xl p-4 overflow-y-scroll'>
              <p>{lastFinals}</p>
            </div>
        )}
        </>
    )
}
export default Transcript;