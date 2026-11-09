"use client";

import { ArrowUpRight, Check, ChevronLeft, ChevronRight, CircleAlert, Copy, LoaderCircle, MapPin, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copyMenuImage } from "@/lib/copy-menu-image";
import { formatTime } from "@/lib/dates";
import { preferredImageIndex } from "@/lib/menu-images";
import type { LunchMenu } from "@/lib/model";
import { MenuPhoto } from "./menu-photo";

type CopyState = "idle" | "copying" | "copied" | "failed";

export function MenuDialog({ menu, onDismiss }: { menu: LunchMenu; onDismiss: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(() => preferredImageIndex(menu));
  const [zoomed, setZoomed] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const copyGeneration = useRef(0);
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

  useEffect(() => {
    if (copyState !== "copied" && copyState !== "failed") return;
    const timer = window.setTimeout(() => setCopyState("idle"), 4_000);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  function move(direction: number) {
    copyGeneration.current += 1;
    setCopyState("idle");
    setIndex((current) => (current + direction + menu.images.length) % menu.images.length);
    setZoomed(false);
  }

  function copyCurrent() {
    if (!image || copyState === "copying") return;
    const generation = copyGeneration.current + 1;
    copyGeneration.current = generation;
    setCopyState("copying");
    void copyMenuImage(image.originalUrl).then(
      () => {
        if (copyGeneration.current === generation) setCopyState("copied");
      },
      (error: unknown) => {
        console.error("[panbab:copy]", error);
        if (copyGeneration.current === generation) setCopyState("failed");
      },
    );
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
              <div className="image-tool-actions">
                <button
                  className={`text-button${copyState === "copied" ? " is-copied" : ""}${copyState === "copying" ? " is-copying" : ""}`}
                  onClick={copyCurrent}
                  disabled={copyState === "copying"}
                  aria-live="polite"
                  aria-busy={copyState === "copying"}
                  aria-label={copyAccessibleName(copyState)}
                >
                  <CopyStateIcon state={copyState} />
                  {copyLabel(copyState)}
                </button>
                <button className="text-button" onClick={() => setZoomed(!zoomed)} aria-pressed={zoomed}>
                  {zoomed ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
                  {zoomed ? "화면에 맞추기" : "원본 크기"}
                </button>
              </div>
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

function copyLabel(state: CopyState): string {
  switch (state) {
    case "idle":
      return "이미지 복사";
    case "copying":
      return "복사 중";
    case "copied":
      return "복사됨";
    case "failed":
      return "복사 실패";
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}

function copyAccessibleName(state: CopyState): string {
  switch (state) {
    case "idle":
      return "메뉴판 이미지 복사";
    case "copying":
      return "메뉴판 이미지를 복사하는 중";
    case "copied":
      return "메뉴판 이미지를 클립보드에 복사했어요";
    case "failed":
      return "메뉴판 이미지를 복사하지 못했어요";
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}

function CopyStateIcon({ state }: { state: CopyState }) {
  switch (state) {
    case "idle":
      return <Copy size={16} aria-hidden="true" />;
    case "copying":
      return <LoaderCircle size={16} aria-hidden="true" />;
    case "copied":
      return <Check size={16} aria-hidden="true" />;
    case "failed":
      return <CircleAlert size={16} aria-hidden="true" />;
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}
