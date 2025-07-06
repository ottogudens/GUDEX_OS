'use client';

import Image from 'next/image';
import { useSettings } from '@/context/SettingsContext';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type LogoProps = {
  width: number;
  height: number;
  className?: string;
};

export function Logo({ width, height, className }: LogoProps) {
  const { settings, loading: settingsLoading } = useSettings();

  if (settingsLoading) {
    return <Skeleton style={{ width: `${width}px`, height: `${height}px` }} className={className} />;
  }

  return (
    <Image
      src={settings.logoUrl}
      data-ai-hint="logo"
      alt={`${settings.name} Logo`}
      width={width}
      height={height}
      className={cn("object-contain", className)}
      priority
    />
  );
}
