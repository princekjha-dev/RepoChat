/**
 * Loading skeleton with shimmer animation.
 * Variants: text, card, message, stats
 */
function LoadingSkeleton({ variant = 'text', count = 1 }) {
  const base = 'animate-shimmer rounded-lg bg-gradient-to-r dark:from-surface-800 dark:via-surface-700 dark:to-surface-800 from-surface-200 via-surface-100 to-surface-200 bg-[length:200%_100%]';

  const variants = {
    text: () => (
      <div className="space-y-2.5">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`${base} h-4`} style={{ width: `${85 - i * 15}%` }} />
        ))}
      </div>
    ),
    card: () => (
      <div className={`${base} h-24 w-full`} />
    ),
    message: () => (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
            <div className={`${base} h-16 rounded-2xl`} style={{ width: `${50 + Math.random() * 30}%` }} />
          </div>
        ))}
      </div>
    ),
    stats: () => (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`${base} h-20 rounded-xl`} />
        ))}
      </div>
    ),
  };

  const render = variants[variant] || variants.text;
  return <div className="animate-fade-in">{render()}</div>;
}

export default LoadingSkeleton;
