import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

const RATIO = 510 / 427;

export function LogoMark({
  className,
  imageClassName,
}: {
  className?: string;
  imageClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <Image
        src="/logos/logo_maw3idi.png"
        alt="MAW3IDI"
        width={60}
        height={Math.round(60 / RATIO)}
        priority
        className={cn("h-10 w-auto object-contain", imageClassName)}
      />
    </span>
  );
}

export function Logo({
  className,
  href = "/",
  imageClassName,
}: {
  className?: string;
  href?: string;
  imageClassName?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="MAW3IDI — retour à l'accueil"
      className={cn("inline-flex items-center gap-2.5", className)}
    >
      <LogoMark imageClassName={imageClassName} />
    </Link>
  );
}

export function LogoWhite({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="MAW3IDI — retour à l'accueil"
      className={cn("inline-flex items-center", className)}
    >
      <span className="inline-flex items-center">
        <Image
          src="/logos/logo_maw3idi.png"
          alt="MAW3IDI"
          width={60}
          height={Math.round(60 / RATIO)}
          className="h-10 w-auto object-contain brightness-0 invert"
        />
      </span>
    </Link>
  );
}