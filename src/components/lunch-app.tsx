"use client";

import Link from "next/link";
import {
  ArrowDown, ArrowRight, ArrowUpRight, Bookmark, Check, ChevronLeft, ChevronRight,
  ImageIcon, MapPin, RefreshCw, Search, Soup, Sparkles,
  Utensils, X, CalendarDays, CircleAlert, Expand,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CACHE_REVALIDATE_SECONDS, HISTORY_DAYS, SOURCE } from "@/lib/config";
import { formatDate, formatTime, shiftDate, todayInSeoul, validateRequestedDate } from "@/lib/dates";
import { useFavorites } from "@/lib/favorites";
import { preferredImageIndex } from "@/lib/menu-images";
import { menuStateSchema, type LunchMenu, type MenuState } from "@/lib/model";
import { LunchIllustration } from "./lunch-illustration";
import { MenuDialog } from "./menu-dialog";
import { MenuPhoto } from "./menu-photo";

const categories = ["전체", "한식뷔페", "구내식당"] as const;
type Category = (typeof categories)[number];

function Brand({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand ${small ? "brand-small" : ""}`} translate="no">
      <span className="brand-symbol"><Soup size={small ? 19 : 26} strokeWidth={1.8} aria-hidden="true" /></span>
      <span className="brand-name">판밥<span className="brand-period">.</span></span>
      {!small && <span className="brand-description">판교의<br />점심시간</span>}
    </span>
  );
}

function MenuCard({
  menu, saved, onSave, onOpen, index,
}: {
  menu: LunchMenu;
  saved: boolean;
  onSave: () => void;
  onOpen: () => void;
  index: number;
}) {
  const image = menu.images[preferredImageIndex(menu)];
  return (
    <article className="menu-card" style={{ animationDelay: `${Math.min(index, 5) * 45}ms` }}>
      <div className="card-heading">
        <div>
          <span className={`category-label ${menu.restaurant.category === "구내식당" ? "category-green" : ""}`}>
            {menu.restaurant.category}
          </span>
          <h3>{menu.restaurant.name}</h3>
          <p className="card-location"><MapPin size={13} aria-hidden="true" />{menu.restaurant.building}{menu.restaurant.location && <><span>·</span>{menu.restaurant.location}</>}</p>
        </div>
        <button
          className={`save-button ${saved ? "is-saved" : ""}`}
          onClick={onSave}
          aria-label={`${menu.restaurant.name} ${saved ? "저장 해제" : "저장"}`}
          aria-pressed={saved}
          title={saved ? "저장한 식당" : "식당 저장"}
        >
          <Bookmark size={19} fill={saved ? "currentColor" : "none"} strokeWidth={1.7} />
        </button>
      </div>
      <button className={`menu-preview ${image ? "" : "text-preview"}`} onClick={onOpen} aria-label={`${menu.restaurant.name} 메뉴 크게 보기`}>
        {image ? (
          <MenuPhoto key={image.url} image={image} name={menu.restaurant.name} eager={index < 3} />
        ) : (
          <span className="text-menu-paper"><Utensils size={21} /><span className="text-menu-heading">오늘의 메뉴</span><span className="text-menu-content">{menu.text}</span></span>
        )}
        <span className="preview-label">{image ? <ImageIcon size={12} /> : <Utensils size={12} />}{image ? "원본 메뉴판" : "텍스트 메뉴"}{menu.images.length > 1 && ` · ${menu.images.length}장`}</span>
        <span className="preview-expand"><Expand size={16} aria-hidden="true" /></span>
      </button>
      <div className="card-footer">
        <span className="posted-time"><span className="status-dot" />{formatTime(menu.publishedAt)} 올라왔어요</span>
        <button className="card-open" onClick={onOpen}>메뉴 보기<ArrowUpRight size={16} aria-hidden="true" /></button>
      </div>
    </article>
  );
}

export function LunchApp({
  today, initialDate, initialState, initialCategory, initialQuery, initialSavedOnly,
}: {
  today: string;
  initialDate: string;
  initialState: MenuState;
  initialCategory: Category;
  initialQuery: string;
  initialSavedOnly: boolean;
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [state, setState] = useState<MenuState>(initialState);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [savedOnly, setSavedOnly] = useState(initialSavedOnly);
  const [category, setCategory] = useState<Category>(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const [searchExpanded, setSearchExpanded] = useState(Boolean(initialQuery));
  const [openedMenu, setOpenedMenu] = useState<LunchMenu | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const favorites = useFavorites();
  const earliestDate = shiftDate(today, -(HISTORY_DAYS - 1));
  const menus = state.status === "ready" ? state.snapshot.menus : [];
  const normalizedQuery = query.replace(/\s/g, "").toLocaleLowerCase("ko-KR");
  const viewMenus = savedOnly ? menus.filter((menu) => favorites.ids.includes(menu.restaurant.id)) : menus;
  const filtered = viewMenus.filter((menu) => (
    (category === "전체" || menu.restaurant.category === category) &&
    `${menu.restaurant.name}${menu.restaurant.building}${menu.restaurant.location}`
      .replace(/\s/g, "").toLocaleLowerCase("ko-KR").includes(normalizedQuery)
  ));
  const restaurantCount = new Set(menus.map((menu) => menu.restaurant.id)).size;

  const loadDate = useCallback(async (date: string, quiet = false) => {
    if (quiet && activeRequest.current) return;
    try {
      validateRequestedDate(date);
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : "날짜를 확인해주세요.");
      return;
    }
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setSelectedDate(date);
    if (!quiet) setLoading(true);
    setRefreshing(true);
    try {
      const response = await fetch(`/api/menus?date=${encodeURIComponent(date)}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      const payload: unknown = await response.json();
      const parsed = menuStateSchema.safeParse(payload);
      if (!parsed.success || (!response.ok && parsed.data.status !== "error")) {
        throw new Error("메뉴 응답을 확인할 수 없습니다.");
      }
      if (!controller.signal.aborted) {
        if (quiet && parsed.data.status === "error") {
          setRefreshError(parsed.data.message);
        } else {
          setState(parsed.data);
          setRefreshError(null);
        }
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error("[panbab:client]", error);
      const message = "메뉴를 불러오지 못했어요. 연결 상태를 확인하고 다시 시도해주세요.";
      if (quiet) setRefreshError(message);
      else setState({ status: "error", date, message });
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
        activeRequest.current = null;
      }
    }
  }, []);

  useEffect(() => () => activeRequest.current?.abort(), []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const values = {
      date: selectedDate === today ? "" : selectedDate,
      category: category === "전체" ? "" : category,
      q: query,
      view: savedOnly ? "saved" : "",
    };
    for (const [key, value] of Object.entries(values)) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    if (url.href !== window.location.href) {
      window.history.replaceState(window.history.state, "", url.href);
    }
  }, [selectedDate, category, query, savedOnly, today]);

  useEffect(() => {
    function checkDay() {
      if (document.visibilityState === "visible" && todayInSeoul() !== today) {
        window.location.reload();
      }
    }
    const timer = window.setInterval(checkDay, 60_000);
    window.addEventListener("focus", checkDay);
    document.addEventListener("visibilitychange", checkDay);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", checkDay);
      document.removeEventListener("visibilitychange", checkDay);
    };
  }, [today]);

  useEffect(() => {
    if (state.status !== "ready" || loading || refreshing) return;
    const expiresAt = Date.parse(state.snapshot.collectedAt) + CACHE_REVALIDATE_SECONDS * 1000;
    const delay = refreshError
      ? 60_000
      : state.stale
        ? (Date.now() - expiresAt > 60_000 ? 60_000 : 15_000)
        : Math.max(15_000, expiresAt - Date.now() + 1_000);
    function refreshVisiblePage() {
      if (
        document.visibilityState === "visible" &&
        todayInSeoul() === today &&
        Date.now() >= expiresAt
      ) {
        void loadDate(selectedDate, true);
      }
    }
    const timer = window.setTimeout(refreshVisiblePage, delay);
    window.addEventListener("focus", refreshVisiblePage);
    document.addEventListener("visibilitychange", refreshVisiblePage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", refreshVisiblePage);
      document.removeEventListener("visibilitychange", refreshVisiblePage);
    };
  }, [state, loading, refreshing, refreshError, selectedDate, loadDate, today]);

  function selectView(saved: boolean, scroll = true) {
    setSavedOnly(saved);
    setCategory("전체");
    setQuery("");
    if (scroll) {
      document.getElementById("menus")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    }
  }

  function resetFilters() {
    setCategory("전체");
    setQuery("");
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#menus">메뉴 목록으로 바로가기</a>
      <header className="app-header">
        <div className="header-inner">
          <Link href="/" className="brand-link" aria-label="판밥 홈" onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            selectView(false, false);
            if (selectedDate !== today) void loadDate(today);
          }}><Brand /></Link>
          <nav className="desktop-nav" aria-label="주요 메뉴">
            <button className={!savedOnly ? "nav-active" : ""} onClick={() => selectView(false)} aria-pressed={!savedOnly}>오늘의 메뉴</button>
            <button className={savedOnly ? "nav-active" : ""} onClick={() => selectView(true)} aria-pressed={savedOnly}><Bookmark size={15} />저장한 식당{favorites.ids.length > 0 && <span className="nav-count">{favorites.ids.length}</span>}</button>
          </nav>
          <a className="source-link" href={SOURCE.url} target="_blank" rel="noopener noreferrer"><span className="naver-n">N</span><span>카페로 가기</span><ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
      </header>

      <main className="main-content">
        <div className="day-line">
          <span><span className="tiny-sun" aria-hidden="true">✳</span>{formatDate(selectedDate, { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</span>
          <span className="neighborhood"><MapPin size={13} aria-hidden="true" />판교 제2테크노밸리</span>
        </div>

        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="hero-eyebrow"><span className="status-dot" /> OUR LITTLE LUNCH BREAK</span>
            <h1 id="hero-title">오늘 점심,<br /><span className="hero-highlight">뭐 먹을까요?</span></h1>
            <p>흩어져 있는 2판교 메뉴판,<br className="mobile-break" /> 한 곳에 모아뒀어요.</p>
            <a className="hero-update" href="#menus"><RefreshCw size={13} aria-hidden="true" /><span>오늘의 메뉴, <strong>5분</strong>마다 새롭게</span><ArrowDown size={13} aria-hidden="true" /></a>
          </div>
          <div className="hero-art">
            <span className="handwritten-note">잘 먹고, 잘 일하기<span>↘</span></span>
            <LunchIllustration />
            <div className="menu-count-sticker">
              <span>{state.status === "ready" && !loading ? String(restaurantCount).padStart(2, "0") : "—"}</span>
              <span>{state.status === "ready" && !loading ? "곳의 점심 메뉴" : "메뉴를 모아요"}</span>
              <Sparkles size={13} strokeWidth={1.5} aria-hidden="true" />
            </div>
          </div>
          <span className="hero-bottom-note">GOOD FOOD, GOOD MOOD.</span>
        </section>

        <section id="menus" className="menus-section" aria-labelledby="menus-title" aria-busy={loading}>
          <div className="section-heading">
            <div className="section-title-group">
              <p className="overline">{savedOnly ? "YOUR LUNCH FAVORITES" : "THE LUNCH LINEUP"}</p>
              <h2 id="menus-title">{savedOnly ? "저장한 식당" : selectedDate === today ? "오늘의 메뉴" : "지난 점심 메뉴"}<span className="menu-total">{loading ? "—" : String(viewMenus.length).padStart(2, "0")}</span></h2>
            </div>
            <div className="date-actions">
              <div className="date-picker">
                <button className="icon-button" aria-label="이전 날짜 메뉴" disabled={selectedDate <= earliestDate || loading} onClick={() => void loadDate(shiftDate(selectedDate, -1))}><ChevronLeft size={17} /></button>
                <label className="date-input-label"><CalendarDays size={14} aria-hidden="true" /><span>{formatDate(selectedDate)}</span><input type="date" name="date" autoComplete="off" aria-label={`메뉴 날짜 선택, 최근 ${HISTORY_DAYS}일`} value={selectedDate} min={earliestDate} max={today} disabled={loading} onChange={(event) => { if (event.target.value) void loadDate(event.target.value); }} /></label>
                <button className="icon-button" aria-label="다음 날짜 메뉴" disabled={selectedDate >= today || loading} onClick={() => void loadDate(shiftDate(selectedDate, 1))}><ChevronRight size={17} /></button>
              </div>
              <button className={`icon-button refresh-button ${refreshing ? "is-loading" : ""}`} aria-label="메뉴 다시 불러오기" title="메뉴 다시 불러오기" disabled={refreshing} onClick={() => void loadDate(selectedDate)}><RefreshCw size={16} aria-hidden="true" /></button>
            </div>
          </div>

          <div className="filter-row">
            <div className="category-filters" aria-label="식당 종류">
              {categories.map((item) => (
                <button key={item} className={`filter-chip ${category === item ? "chip-active" : ""}`} onClick={() => setCategory(item)} aria-pressed={category === item}>
                  {item === "전체" ? <Utensils size={13} aria-hidden="true" /> : null}
                  {item === "전체" ? "모든 메뉴" : item}
                  <span>{item === "전체" ? viewMenus.length : viewMenus.filter((menu) => menu.restaurant.category === item).length}</span>
                </button>
              ))}
            </div>
            <button className={`icon-button mobile-search-toggle ${searchExpanded ? "search-active" : ""}`} aria-label={searchExpanded ? "검색 닫기" : "식당 검색 열기"} aria-expanded={searchExpanded} aria-controls="restaurant-search" onClick={() => {
              setSearchExpanded(!searchExpanded);
              if (searchExpanded) setQuery("");
              else window.requestAnimationFrame(() => searchInput.current?.focus());
            }}>{searchExpanded ? <X size={17} /> : <Search size={17} />}</button>
            <div id="restaurant-search" className={`search-field ${searchExpanded ? "is-expanded" : ""}`}><Search size={16} aria-hidden="true" /><input ref={searchInput} type="search" name="restaurant" aria-label="식당 또는 건물 검색" placeholder="식당·건물 이름 검색…" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" spellCheck={false} />{query && <button className="clear-search" onClick={() => setQuery("")} aria-label="검색어 지우기"><X size={15} /></button>}</div>
          </div>

          <div className="collection-status" role="status">
            {loading ? <><span className="status-dot status-orange" />메뉴판을 가져오고 있어요…</> : state.status === "ready" ? <><Check size={13} aria-hidden="true" /><span>정오 전 올라온 메뉴예요<span className="status-divider">·</span><span className="sync-time">{formatTime(state.snapshot.collectedAt)} 확인{refreshing && " · 확인 중…"}</span></span></> : <><RefreshCw size={13} aria-hidden="true" /><span>오늘 올라온 오전 메뉴를 모아요</span></>}
            {selectedDate !== today && <button className="back-to-today" onClick={() => void loadDate(today)}>오늘로 돌아가기<ArrowRight size={12} /></button>}
          </div>

          {favorites.error && <p className="notice-banner" role="alert"><CircleAlert size={16} />{favorites.error}</p>}
          {refreshError && <p className="notice-banner" role="alert"><CircleAlert size={16} aria-hidden="true" />{refreshError}</p>}
          {state.status === "ready" && state.stale && !loading && <p className="stale-notice" role="status"><RefreshCw size={13} aria-hidden="true" />마지막 확인 후 5분이 지났어요. 최신 메뉴를 다시 확인하고 있어요.<a href={SOURCE.url} target="_blank" rel="noopener noreferrer">원문 보기<ArrowUpRight size={12} /></a></p>}
          {state.status === "ready" && state.snapshot.warnings.length > 0 && (
            <details className="collection-warning"><summary><CircleAlert size={15} />일부 원문을 확인해주세요 ({state.snapshot.warnings.length}건)</summary><ul>{state.snapshot.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></details>
          )}

          {loading ? (
            <div className="menu-grid" aria-label="메뉴 불러오는 중">{[0, 1, 2].map((item) => <div className="skeleton-card" key={item}><span /><span /><div /><span /></div>)}</div>
          ) : state.status === "error" ? (
            <div className="empty-state" role="alert"><span className="empty-illustration"><CircleAlert size={31} strokeWidth={1.4} /></span><h3>메뉴판이 잠시 길을 잃었어요</h3><p>{state.message}</p><div className="empty-actions"><button className="primary-button" onClick={() => void loadDate(selectedDate)}><RefreshCw size={15} />다시 불러오기</button><a className="text-button" href={SOURCE.url} target="_blank" rel="noopener noreferrer">카페에서 확인<ArrowUpRight size={15} /></a></div></div>
          ) : menus.length === 0 ? (
            <div className="empty-state"><span className="empty-illustration"><Soup size={34} strokeWidth={1.4} /></span><h3>아직 올라온 메뉴가 없어요</h3><p>이 날짜에 오전에 올라온 공개 점심 메뉴가 아직 없어요.<br />정오 전 새 글은 다음 갱신 때 반영돼요. 주말·공휴일에는 메뉴가 없을 수 있어요.</p><a className="text-button" href={SOURCE.url} target="_blank" rel="noopener noreferrer">카페의 최신 글 보기<ArrowUpRight size={15} /></a></div>
          ) : savedOnly && viewMenus.length === 0 ? (
            <div className="empty-state"><span className="empty-illustration"><Bookmark size={32} strokeWidth={1.4} /></span><h3>{favorites.ids.length ? "저장한 식당의 메뉴가 아직 없어요" : "단골 식당을 모아보세요"}</h3><p>{favorites.ids.length ? "선택한 날짜에 올라온 메뉴가 없어요. 다른 날짜도 확인해보세요." : "식당 카드의 북마크를 누르면 이곳에서 모아볼 수 있어요."}</p><button className="text-button" onClick={() => selectView(false)}>모든 메뉴 둘러보기<ArrowRight size={15} /></button></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><span className="empty-illustration"><Search size={32} strokeWidth={1.4} /></span><h3>찾으시는 메뉴가 없어요</h3><p>다른 식당 이름이나 건물 이름으로 찾아보세요.</p><button className="text-button" onClick={resetFilters}>필터 초기화<ArrowRight size={15} /></button></div>
          ) : (
            <div className="menu-grid">{filtered.map((menu, index) => <MenuCard key={menu.id} menu={menu} index={index} saved={favorites.ids.includes(menu.restaurant.id)} onSave={() => favorites.toggle(menu.restaurant.id)} onOpen={() => setOpenedMenu(menu)} />)}</div>
          )}

          <div className="source-note"><span className="note-icon"><ImageIcon size={17} strokeWidth={1.5} aria-hidden="true" /></span><p><strong>메뉴판은 있는 그대로.</strong><span>사진은 편집하지 않고 보여드려요. 카드를 누르면 크게 볼 수 있어요.</span></p><span className="note-doodle" aria-hidden="true">↗</span></div>
        </section>
      </main>

      <footer className="app-footer">
        <div className="footer-inner"><div><Brand small /><p>2판교의 점심시간을 조금 더 가볍게.</p></div><div className="footer-source"><a href={SOURCE.url} target="_blank" rel="noopener noreferrer">메뉴 출처 <span>네이버 카페 · 2판교 라이프</span><ArrowUpRight size={12} /></a><p>메뉴와 운영 정보는 식당 사정에 따라 달라질 수 있어요.</p></div></div>
        <div className="footer-bottom"><span>MADE FOR OUR LUNCH BREAK.</span><span>맛있는 하루 보내세요 <span className="footer-flower" aria-hidden="true">✳</span></span></div>
      </footer>

      <nav className="mobile-nav" aria-label="모바일 주요 메뉴">
        <button className={!savedOnly ? "mobile-nav-active" : ""} onClick={() => selectView(false)} aria-pressed={!savedOnly}><Utensils size={19} strokeWidth={1.8} /><span>오늘의 메뉴</span></button>
        <span className="mobile-nav-separator" />
        <button className={savedOnly ? "mobile-nav-active" : ""} onClick={() => selectView(true)} aria-pressed={savedOnly}><Bookmark size={19} strokeWidth={1.8} fill={savedOnly ? "currentColor" : "none"} /><span>저장한 식당</span>{favorites.ids.length > 0 && <span className="mobile-saved-count">{favorites.ids.length}</span>}</button>
      </nav>
      {openedMenu && <MenuDialog key={openedMenu.id} menu={openedMenu} onDismiss={() => setOpenedMenu(null)} />}
    </div>
  );
}
