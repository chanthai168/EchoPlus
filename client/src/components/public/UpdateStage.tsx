// some other component
import { useStage } from "../../context/StageContext";

export function UpdateStage() {
  const { stage, setStage, next, prev } = useStage();

  return (
    <div className=" flex gap-2">
      <p>Current: {stage}</p>
      <button onClick={() => setStage('idle')}>Go idle</button>
      <button onClick={() => setStage('speaking')}>Go speaking</button>
      <button onClick={() => setStage('thinking')}>Go thinking</button>
      <button onClick={prev}>Prev</button>
      <button onClick={next}>Next</button>
    </div>
  );
}