export default function MemoryKingEffect() {
  return <span className="cosmetic-effect cosmetic-effect-title-memory" aria-hidden="true">
    <span className="memory-master-crest"><span className="memory-master-crown">♛</span><span className="memory-master-line">④</span></span>
    <span className="memory-master-route">
      {Array.from({ length: 7 }, (_, index) => <span key={index} className="memory-master-station" style={{ left: `${8 + index * 14}%`, animationDelay: `${index * 0.55}s` }} />)}
      <span className="memory-master-train"><i /><i /><i /></span>
    </span>
  </span>;
}
