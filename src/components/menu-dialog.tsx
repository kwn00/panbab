"use client";

import { ArrowUpRight, ChevronLeft, ChevronRight, MapPin, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/dates";
import { preferredImageIndex } from "@/lib/menu-images";
import type { LunchMenu } from "@/lib/model";
import { MenuPhoto } from "./menu-photo";

export function MenuDialog({ menu, onDismiss }: { menu: LunchMenu; onDismiss: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(() => preferredImageIndex(menu));
  const [zoomed, setZoomed] = useState(false);
  const image = menu.images[index];

  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function move(direction: number) {
    setIndex((current) => (current + direction + menu.images.length) % menu.images.length);
    setZoomed(false);
  }

  return (
    <dialog
      ref={dialog}
      className="menu-dialog"
      aria-labelledby="menu-dialog-title"
      onClose={onDismiss}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialog.current?.close();
      }}
      onKeyDown={(event) => {
        if (menu.images.length < 2) return;
        if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
        if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
      }}
    >
      <div className="dialog-shell">
        <header className="dialog-header">
          <div>
            <p className="overline">TODAY&apos;S MENU</p>
            <h2 id="menu-dialog-title">{menu.restaurant.name}</h2>
            <p className="dialog-location">
              <MapPin size={13} aria-hidden="true" />
              {menu.restaurant.building} {menu.restaurant.location}
            </p>
          </div>
          <button className="icon-button close-dialog" onClick={() => dialog.current?.close()} aria-label="메뉴판 닫기">
            <X size={23} />
          </button>
        </header>
        {image && (
          <div className="dialog-image-section">
            <div className="image-tools">
              <span>원본 메뉴판 <b>{index + 1}</b> / {menu.images.length}</span>
              <button className="text-button" onClick={() => setZoomed(!zoomed)} aria-pressed={zoomed}>
                {zoomed ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
                {zoomed ? "화면에 맞추기" : "원본 크기"}
              </button>
            </div>
            <div className={`dialog-image-canvas ${zoomed ? "is-zoomed" : ""}`}>
              <MenuPhoto key={image.originalUrl} image={image} name={menu.restaurant.name} original eager />
            </div>
            {menu.images.length > 1 && (
              <div className="image-pagination" aria-label="메뉴판 이미지 이동">
                <button className="icon-button" onClick={() => move(-1)} aria-label="이전 메뉴판"><ChevronLeft size={20} /></button>
                <span aria-live="polite">{index + 1} / {menu.images.length}</span>
                <button className="icon-button" onClick={() => move(1)} aria-label="다음 메뉴판"><ChevronRight size={20} /></button>
              </div>
            )}
          </div>
        )}
        {menu.text && <div className="dialog-menu-text">{menu.text}</div>}
        <footer className="dialog-footer">
          <div><p>{menu.title}</p><span>{formatTime(menu.publishedAt)} 게시 · 네이버 카페 2판교 라이프</span></div>
          <a className="primary-button" href={menu.sourceUrl} target="_blank" rel="noopener noreferrer">
            카페 원문 <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </footer>
      </div>
    </dialog>
  );
}
