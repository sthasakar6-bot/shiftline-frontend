import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Avatar({
  userId,
  name,
  hasAvatar,
  size = 32,
}: {
  userId: number;
  name: string;
  hasAvatar: boolean;
  size?: number;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!hasAvatar) {
      setUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    api
      .getAvatarBlob(userId)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => setUrl(null));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [userId, hasAvatar]);

  const style = { width: size, height: size, fontSize: size * 0.44 };

  if (url) {
    return <img src={url} alt={name} className="user-avatar" style={style} />;
  }
  return (
    <span className="user-avatar" style={style}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
