export function SkeletonLine({ width = "100%" }: { width?: string }) {
  return <div className="skeleton skeleton-line" style={{ width }} />;
}

export function SkeletonRow({ avatar = true }: { avatar?: boolean }) {
  return (
    <div className="skeleton-row">
      {avatar && <div className="skeleton skeleton-avatar" />}
      <div className="skeleton-row-body">
        <SkeletonLine width="55%" />
        <SkeletonLine width="35%" />
      </div>
    </div>
  );
}

export function SkeletonRows({ count = 3, avatar = true }: { count?: number; avatar?: boolean }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} avatar={avatar} />
      ))}
    </>
  );
}

export function SkeletonCard() {
  return (
    <div className="panel skeleton-card">
      <SkeletonLine width="40%" />
      <SkeletonLine width="70%" />
      <SkeletonLine width="50%" />
    </div>
  );
}
