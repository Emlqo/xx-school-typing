import { useMemo } from 'react';

export default function CherryBlossomBackground() {
  const petals = useMemo(() => {
    return Array.from({ length: 72 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      animationDuration: `${Math.random() * 12 + 14}s`,
      animationDelay: `-${Math.random() * 26}s`,
      size: `${Math.random() * 6 + 3}px`,
      drift: `${Math.random() * 70 - 35}px`,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {petals.map((p) => (
        <div
          key={p.id}
          className="petal"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            '--snow-drift': p.drift,
            animationDuration: p.animationDuration,
            animationDelay: p.animationDelay,
          }}
        />
      ))}
    </div>
  );
}
