"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useState } from "react";
import type { MenuImage } from "@/lib/model";

export function MenuPhoto({
  image,
  name,
  original = false,
  eager = false,
}: {
  image: MenuImage;
  name: string;
  original?: boolean;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="photo-error">
        <ImageOff size={25} strokeWidth={1.5} aria-hidden="true" />
        <span>메뉴판 이미지를 불러오지 못했어요.</span>
        <span>카페 원문에서 확인해주세요.</span>
      </span>
    );
  }
  return (
    <Image
      src={original ? image.originalUrl : image.url}
      alt={`${name} 메뉴판`}
      width={image.width ?? 1200}
      height={image.height ?? 1600}
      unoptimized
      referrerPolicy="no-referrer"
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailed(true)}
    />
  );
}
