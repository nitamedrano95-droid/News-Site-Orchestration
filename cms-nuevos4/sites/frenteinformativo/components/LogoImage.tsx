'use client';

import { useState } from 'react';

interface LogoImageProps {
  src: string;
  alt: string;
  className?: string;
}

export default function LogoImage({ src, alt, className = '' }: LogoImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
