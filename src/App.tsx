import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  CalendarDays,
  Map,
  Compass,
  UserRound,
  Plane,
  Clock,
  MapPin,
  Sun,
  Moon,
  Check,
  Navigation,
  Utensils,
  Coffee,
  Heart,
  BookOpen,
  ShieldCheck,
  LockKeyhole,
  X,
  Copy,
  ExternalLink,
  CheckCircle2,
  Info,
  BriefcaseBusiness,
  Footprints,
  Bus,
  SlidersHorizontal,
  ArrowLeft,
  LogOut,
  CloudRain,
  Download,
} from "lucide-react";
import type { Trip, Traveler, Place, Team, Event } from "./types";
import {
  clock,
  macauDate,
  daysUntil,
  dayEvents,
  eventState,
  tripState,
  nextEvent,
  timeLabel,
  directions,
} from "./domain";
import Avatar from "./Avatar";
import MapView from "./MapView";

type Page = "today" | "itinerary" | "map" | "info" | "profile";
const nav = [
  { id: "today", name: "오늘의 여행", short: "오늘", icon: Compass },
  { id: "itinerary", name: "전체 일정", short: "일정", icon: CalendarDays },
  { id: "map", name: "여행 지도", short: "지도", icon: Map },
  { id: "info", name: "여행 정보", short: "정보", icon: BookOpen },
  { id: "profile", name: "내 프로필", short: "프로필", icon: UserRound },
] as const;
const days = [
  {
    day: 1,
    date: "10.12",
    week: "월",
    title: "안녕, 마카오",
    sub: "도착 · 쉼 · 도시의 밤",
    image: "venetian",
  },
  {
    day: 2,
    date: "10.13",
    week: "화",
    title: "골목과 빛 사이",
    sub: "세나도 · 맛있는 발견 · 분수",
    image: "senado",
  },
  {
    day: 3,
    date: "10.14",
    week: "수",
    title: "함께, 또 각자의 속도로",
    sub: "B팀 귀국 · A팀 콜로안",
    image: "venetian",
  },
  {
    day: 4,
    date: "10.15",
    week: "목",
    title: "추억을 가방에 담아",
    sub: "마지막 아침 · A팀 귀국",
    image: "senado",
  },
];
const img = (name: string) =>
  `/images/${name === "city" ? "venetian" : name}.webp`;
async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "연결하지 못했습니다. 다시 시도해 주세요.");
  return data;
}
function Brand() {
  return (
    <div className="brand">
      <span className="brand-tile">✳</span>
      <div>
        우리의 마카오<small>OUR MACAO JOURNAL</small>
      </div>
    </div>
  );
}
function Photo({
  name,
  alt,
  ...props
}: {
  name: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      {...props}
      src={img(name)}
      alt={alt}
      loading="lazy"
      onError={(e) => {
        e.currentTarget.style.opacity = "0";
      }}
    />
  );
}
function Pill({ children, tone = "" }: { children: ReactNode; tone?: string }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}
function IconFor({ category }: { category: string }) {
  const I =
    category === "식사"
      ? Utensils
      : category === "휴식"
        ? Coffee
        : category === "이동"
          ? Bus
          : category === "항공" || category === "공항"
            ? Plane
            : category === "야경"
              ? Moon
              : MapPin;
  return <I size={19} />;
}

function Modal({
  children,
  onClose,
  label,
}: {
  children: ReactNode;
  onClose: () => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button,a[href],input,select,[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = scroll;
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-button" aria-label="닫기" onClick={onClose}>
          <X />
        </button>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [trip, setTrip] = useState<Trip>(),
    [auth, setAuth] = useState<boolean | null>(null),
    [userId, setUserId] = useState(
      () => localStorage.getItem("macao-traveler") || "",
    ),
    [choosing, setChoosing] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [page, setPage] = useState<Page>("today"),
    [day, setDay] = useState(() =>
      Math.max(1, Math.min(4, Number(macauDate(new Date()).slice(-2)) - 11)),
    ),
    [selected, setSelected] = useState<Place>(),
    [viewA, setViewA] = useState(false),
    [now, setNow] = useState(new Date()),
    [sim, setSim] = useState(""),
    [night, setNight] = useState(false),
    [toast, setToast] = useState(""),
    [foodFilter, setFoodFilter] = useState(false),
    [mapTeam, setMapTeam] = useState<"mine" | "A" | "B" | "all">("mine");
  const traveler = trip?.travelers.find((p) => p.id === userId);
  const date = sim ? new Date(sim + ":00+08:00") : now;
  const team: Team = traveler?.team || "A";
  const shownTeam = viewA ? "A" : team;
  const state = tripState(date, team);
  const announce = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    api<{ authenticated: boolean }>("/api/session")
      .then((s) => setAuth(s.authenticated))
      .catch((e) => {
        setError(e.message);
        setAuth(false);
      });
  }, []);
  useEffect(() => {
    if (auth) {
      api<Trip>("/api/trip")
        .then(setTrip)
        .catch((e) => setError(e.message));
    }
  }, [auth]);
  useEffect(() => {
    document.documentElement.dataset.theme = night ? "night" : "day";
  }, [night]);
  function choose(p: Traveler) {
    setUserId(p.id);
    localStorage.setItem("macao-traveler", p.id);
    setChoosing(false);
    setViewA(false);
    setMapTeam("mine");
    setPage("today");
    const d = Number(macauDate(date).slice(-2)) - 11;
    setDay(
      macauDate(date) >= "2026-10-12" && macauDate(date) <= "2026-10-15"
        ? d
        : 1,
    );
  }
  function go(p: Page) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function chooseDay(d: number) {
    setDay(d);
    setViewA(false);
  }
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/login", {
        method: "POST",
        body: JSON.stringify({
          code: new FormData(e.currentTarget).get("code"),
        }),
      });
      setAuth(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const closeDetail = useCallback(() => setSelected(undefined), []);
  const events = useMemo(
    () => (trip ? dayEvents(trip.events, day, shownTeam) : []),
    [trip, day, shownTeam],
  );
  const mapPlaces = useMemo(() => {
    if (!trip) return [];
    const es =
      mapTeam === "all"
        ? trip.events.filter((e) => e.day === day)
        : dayEvents(trip.events, day, mapTeam === "mine" ? shownTeam : mapTeam);
    return [...new Set(es.map((e) => e.placeId))]
      .map((id) => trip.places.find((p) => p.id === id)!)
      .filter(Boolean);
  }, [trip, day, shownTeam, mapTeam]);
  const next = trip ? nextEvent(trip.events, date, team) : undefined;
  const current = trip?.events.find(
    (e) =>
      e.teamIds.includes(team) &&
      new Date(e.startAt) <= date &&
      new Date(e.endAt) > date,
  );

  if (!auth || !trip || !traveler || choosing)
    return (
      <div className="welcome">
        <div className="welcome-top">
          <Brand />
          <span className="edition">A FAMILY JOURNEY · VOL. 01</span>
        </div>
        <main className="welcome-grid">
          <section className="welcome-copy">
            <div className="eyebrow">
              <span className="tiny-line" />
              2026.10.12 — 10.15
            </div>
            <h1>
              다섯 사람,
              <br />네 번의 하루.
              <br />
              <em>우리의 마카오.</em>
            </h1>
            <p className="welcome-description">
              낯선 골목에서 나누는 익숙한 웃음.
              <br />
              조금 느리게, 더 오래 기억할 우리 가족의 여행.
            </p>
            {auth && trip ? (
              <>
                <div className="selection-label">
                  <span>함께 떠날 당신은 누구인가요?</span>
                  <span className="subtle">여행자 선택</span>
                </div>
                <div className="traveler-grid">
                  {trip.travelers.map((p) => (
                    <button
                      className="traveler-card"
                      key={p.id}
                      onClick={() => choose(p)}
                    >
                      <Avatar person={p} size={72} />
                      <strong>{p.name}</strong>
                      <Pill tone={p.team === "B" ? "clay" : ""}>
                        {p.team}팀
                      </Pill>
                    </button>
                  ))}
                </div>
                <p className="subtle">
                  <ShieldCheck size={14} /> 선택한 여행자의 팀에 맞춰 일정을
                  안내해요.
                </p>
              </>
            ) : auth === null || auth ? (
              <div className="loading">
                여행 저널을 펼치고 있어요…
                {error && (
                  <p role="alert">
                    {error}
                    <button onClick={() => location.reload()}>다시 연결</button>
                  </p>
                )}
              </div>
            ) : (
              <form className="access-form" onSubmit={login}>
                <label htmlFor="code">
                  <LockKeyhole size={16} />
                  우리 가족만의 여행 저널
                </label>
                <div className="code-row">
                  <input
                    id="code"
                    name="code"
                    type="password"
                    autoComplete="current-password"
                    placeholder="가족 접근코드"
                    required
                    minLength={1}
                  />
                  <button className="primary" disabled={busy}>
                    {busy ? "확인 중…" : "여행 시작하기"}
                    <ArrowRight size={19} />
                  </button>
                </div>
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <p className="subtle">
                  가족에게 전달받은 접근코드를 입력해 주세요.
                </p>
              </form>
            )}
            <div className="welcome-footer">
              <span>MACAO, WITH OUR PEOPLE.</span>
              <span>22°08′ N &nbsp; 113°33′ E</span>
            </div>
          </section>
          <section className="welcome-photo">
            <Photo name="venetian" alt="밤에 조명이 켜진 베네시안 마카오" />
            <div className="photo-shade" />
            <span className="photo-top">澳門 · MACAO</span>
            <div className="postmark">
              LET'S MAKE
              <br />
              <b>memories</b>
              <br />
              OCTOBER 2026
            </div>
            <div className="welcome-photo-bottom">
              <span>01 / OUR NEXT CHAPTER</span>
              <h2>
                함께라서,
                <br />더 좋은 여행.
              </h2>
              <p>THE VENETIAN MACAO</p>
            </div>
          </section>
        </main>
        <footer className="welcome-credit">
          사진: soeperbaby · Wikimedia Commons ·{" "}
          <a
            href="https://creativecommons.org/licenses/by/2.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY 2.0
          </a>{" "}
          · 크롭 및 색상 오버레이
        </footer>
      </div>
    );

  return (
    <div className="app-shell">
      <header className="header">
        <button
          className="brand-button"
          onClick={() => go("today")}
          aria-label="오늘의 여행으로"
        >
          <Brand />
        </button>
        <nav className="desktop-nav" aria-label="주 메뉴">
          {nav.slice(0, 4).map((n) => (
            <button
              className={page === n.id ? "active" : ""}
              key={n.id}
              onClick={() => go(n.id)}
            >
              {n.name}
            </button>
          ))}
        </nav>
        <div className="header-right">
          <button
            className="theme-toggle"
            onClick={() => setNight(!night)}
            aria-label={night ? "낮 테마" : "밤 테마"}
          >
            {night ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className="user-button" onClick={() => go("profile")}>
            <Avatar person={traveler} size={36} />
            <span>
              {traveler.name}
              <small>{team}팀 여행자</small>
            </span>
            <ChevronRight size={15} />
          </button>
        </div>
      </header>
      <div className="local-time-bar">
        <span>
          <span className="live-dot" />
          {sim ? "시간 시뮬레이션" : "마카오 현지 시간"}{" "}
          <b>
            {macauDate(date).replaceAll("-", ".")} &nbsp;{clock(date)}
          </b>
        </span>
        <span>
          한국 {clock(date, "Asia/Seoul")}{" "}
          <span className="time-divider">|</span>{" "}
          {state === "before"
            ? `출발까지 ${daysUntil(date)}일`
            : state === "after"
              ? "우리의 여행 기록"
              : `여행 ${Math.max(1, Number(macauDate(date).slice(-2)) - 11)}일차`}
        </span>
      </div>
      {sim && (
        <div className="simulation-banner">
          <Clock size={16} /> 미리보기 시간입니다. 실제 현재 시간이 아닙니다.{" "}
          <button onClick={() => setSim("")}>실제 시간으로 돌아가기</button>
        </div>
      )}
      <main className="main">
        {(page === "today" || page === "itinerary") && (
          <>
            <div className="page-heading">
              <div>
                <span className="eyebrow">OUR LITTLE ESCAPE</span>
                <h1>
                  {page === "today"
                    ? `${traveler.name}님, ${state === "before" ? "설레는 여행을 준비해요." : state === "after" ? "우리의 여행을 돌아봐요." : "오늘도 함께 떠나요."}`
                    : "네 번의 하루, 하나의 여행."}
                </h1>
                <p>
                  {state === "before"
                    ? "서두르지 않아도 괜찮아요. 우리 가족의 속도로 만나는 마카오."
                    : "예정 시간과 실제 방문은 달라요. 오늘의 컨디션에 맞춰 여행하세요."}
                </p>
              </div>
              <div className="trip-date">
                <CalendarDays size={17} />
                <span>2026. 10. 12 — 10. 15</span>
              </div>
            </div>
            {page === "today" && (
              <>
                {state === "during" && (
                  <section className="live-agenda">
                    <div>
                      <span className="eyebrow">지금 · 예정 시간 기준</span>
                      <h3>{current?.title || "잠시 쉬어가는 시간"}</h3>
                      <p>
                        {current
                          ? `${timeLabel(current)}–${timeLabel(current, true)} · ${current.notes}`
                          : "다음 일정까지 여유롭게 쉬어가세요."}
                      </p>
                      {current?.category === "이동" && (
                        <p className="depart">
                          지금은 다음 장소로 출발할 예정 시간이에요.
                        </p>
                      )}
                    </div>
                    <div>
                      <span className="eyebrow">NEXT CHAPTER</span>
                      <h3>{next?.title || "오늘의 여행 마무리"}</h3>
                      <p>
                        {next
                          ? `${timeLabel(next)} · 약 ${Math.ceil((+new Date(next.startAt) - +date) / 60000)}분 후`
                          : "편안한 밤 보내세요."}
                      </p>
                    </div>
                    <button
                      className="primary small"
                      onClick={() => {
                        if (current)
                          setSelected(
                            trip.places.find((p) => p.id === current.placeId),
                          );
                        else go("itinerary");
                      }}
                    >
                      지금 일정 안내 <ArrowRight size={17} />
                    </button>
                  </section>
                )}
                <div className="hero-grid">
                  <section className="hero">
                    <Photo
                      name="venetian"
                      alt="베네시안 마카오의 운하와 따뜻한 야간 조명"
                    />
                    <div className="hero-overlay" />
                    <div className="hero-top">
                      <span>THE MACAO CHAPTER</span>
                      <span className="hero-location">
                        <MapPin size={14} /> 마카오, 코타이
                      </span>
                    </div>
                    <div className="hero-copy">
                      <p>함께라서 더 특별한</p>
                      <h2>
                        조금 느리게,
                        <br />
                        함께, <em>마카오.</em>
                      </h2>
                      <span>
                        낮의 골목부터 밤의 반짝임까지.
                        <br />
                        다섯 사람을 위한 네 번의 아름다운 하루.
                      </span>
                      <button
                        className="hero-button"
                        onClick={() => {
                          go("itinerary");
                          setDay(1);
                        }}
                      >
                        우리의 여정 펼쳐보기 <ArrowUpRight size={19} />
                      </button>
                    </div>
                    <div className="hero-bottom">
                      <div className="avatar-stack">
                        {trip.travelers.map((p) => (
                          <Avatar key={p.id} person={p} size={32} />
                        ))}
                      </div>
                      <span>다섯이 함께 쓰는 여행 이야기</span>
                      <span className="hero-page">01 — 04</span>
                    </div>
                    <div className="hero-stamp">
                      WITH
                      <br />
                      <b>family</b>
                      <br />
                      MACAO 2026
                    </div>
                  </section>
                  <aside className="boarding-pass">
                    <div className="ticket-top">
                      <span className="eyebrow">YOUR NEXT JOURNEY</span>
                      <Plane size={23} />
                    </div>
                    <div className="ticket-route">
                      <div>
                        <h2>ICN</h2>
                        <span>인천</span>
                      </div>
                      <div className="flight-path">
                        <span />
                        <Plane size={21} />
                        <span />
                      </div>
                      <div>
                        <h2>MFM</h2>
                        <span>마카오</span>
                      </div>
                    </div>
                    <div className="ticket-fields">
                      <div>
                        <small>DEPARTURE · 한국</small>
                        <strong>
                          10.12 <b>07:50</b>
                        </strong>
                      </div>
                      <div>
                        <small>ARRIVAL · 마카오</small>
                        <strong>
                          10.12 <b>10:40</b>
                        </strong>
                      </div>
                    </div>
                    <div className="ticket-perf" />
                    <div className="ticket-middle">
                      <div>
                        <small>OUR HOME IN MACAO</small>
                        <strong>베네시안 마카오</strong>
                        <span>
                          {team === "A" ? "3박 4일" : "2박 3일"} · {team}팀{" "}
                          {team === "A" ? "3" : "2"}명
                        </span>
                      </div>
                      <div className="hotel-symbol">♧</div>
                    </div>
                    <p className="ticket-note">
                      사용자 제공 일정 · 항공권 확인 필요
                    </p>
                    <button className="ticket-link" onClick={() => go("info")}>
                      항공편 & 체크인 안내 <ArrowRight size={17} />
                    </button>
                    <div className="barcode" />
                    <div className="ticket-code">
                      <span>FAMILY / {team} TEAM</span>
                      <span>OCT 2026</span>
                    </div>
                  </aside>
                </div>
                <div className="quick-strip">
                  <button onClick={() => go("info")}>
                    <span className="quick-icon">
                      <BriefcaseBusiness size={21} />
                    </span>
                    <div>
                      <strong>
                        {state === "before"
                          ? "설렘은 챙기고, 걱정은 덜고"
                          : state === "after"
                            ? "네 번의 하루를 다시 펼쳐요"
                            : current?.title || "잠시 쉬어가는 시간"}
                      </strong>
                      <small>
                        {state === "before"
                          ? "출발 전 준비물과 확인할 것"
                          : state === "after"
                            ? "날짜를 선택해 여행 기록 보기"
                            : "현재 예정 시간 기준 · 방문 완료를 뜻하지 않아요"}
                      </small>
                    </div>
                    <ArrowUpRight size={18} />
                  </button>
                  <button
                    onClick={() => {
                      if (next) {
                        setDay(next.day);
                        go("itinerary");
                      } else go("itinerary");
                    }}
                  >
                    <span className="quick-icon gold">
                      <Clock size={21} />
                    </span>
                    <div>
                      <strong>
                        {state === "before"
                          ? "첫 만남은, 10월 12일"
                          : next
                            ? `다음 · ${next.title}`
                            : "우리의 여행 일정"}
                      </strong>
                      <small>
                        {state === "before"
                          ? "인천 07:50 출발 · 마카오 10:40 도착"
                          : next
                            ? `${timeLabel(next)} · 약 ${Math.ceil((+new Date(next.startAt) - +date) / 60000)}분 후`
                            : "팀별 여행을 돌아보세요"}
                      </small>
                    </div>
                    <ArrowUpRight size={18} />
                  </button>
                  <button onClick={() => go("map")}>
                    <span className="quick-icon clay">
                      <MapPin size={21} />
                    </span>
                    <div>
                      <strong>우리의 발걸음을 지도에</strong>
                      <small>오늘의 장소와 이동 방법 한눈에</small>
                    </div>
                    <ArrowUpRight size={18} />
                  </button>
                </div>
              </>
            )}
            <section className="journey-section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">FOUR DAYS, MANY MEMORIES</span>
                  <h2>
                    하루씩, 마카오를 만나요
                    <span className="small-flower">✳</span>
                  </h2>
                </div>
                <span className="subtle">
                  모든 일정은 마카오 현지 시간 기준
                </span>
              </div>
              <DayTabs day={day} onChange={chooseDay} />
              <div className="journey-layout">
                <div className="schedule-column">
                  <div className="schedule-heading">
                    <div>
                      <span className="day-number">0{day}</span>
                      <div>
                        <h3>{days[day - 1].title}</h3>
                        <span>{days[day - 1].sub}</span>
                      </div>
                    </div>
                    <Pill tone={shownTeam === "B" ? "clay" : ""}>
                      {day < 3
                        ? "A + B 함께 · 5명"
                        : `${shownTeam}팀 · ${shownTeam === "A" ? 3 : 2}명`}
                    </Pill>
                  </div>
                  {team === "B" && day === 4 && !viewA ? (
                    <div className="empty-state">
                      <Plane size={38} />
                      <h3>B팀의 마카오 여정은 마무리되었어요.</h3>
                      <p>
                        10월 14일 인천 22:45 도착 예정 기준입니다.
                        <br />
                        실제 귀국 여부를 자동으로 확인하지 않습니다.
                      </p>
                      <button
                        className="primary"
                        onClick={() => setViewA(true)}
                      >
                        A팀의 남은 하루 보기 <ArrowRight size={17} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="schedule-filter">
                        <span>
                          <span className="live-dot" />{" "}
                          {sim ? "미리보기" : "제안 일정"} · 예약 확정은 별도
                          확인
                        </span>
                        <button
                          onClick={() => setFoodFilter(!foodFilter)}
                          className={foodFilter ? "active" : ""}
                        >
                          <Utensils size={15} />
                          {foodFilter ? "전체 일정 보기" : "식사만 보기"}
                        </button>
                      </div>
                      <div className="timeline">
                        {events
                          .filter((e) => !foodFilter || e.category === "식사")
                          .map((event, i) => (
                            <EventCard
                              key={event.id}
                              event={event}
                              date={date}
                              index={i}
                              place={trip.places.find(
                                (p) => p.id === event.placeId,
                              )!}
                              onClick={() =>
                                setSelected(
                                  trip.places.find(
                                    (p) => p.id === event.placeId,
                                  ),
                                )
                              }
                            />
                          ))}
                      </div>
                    </>
                  )}
                  {day === 3 && shownTeam === "A" && (
                    <div className="alternatives">
                      <h3>
                        <SlidersHorizontal size={18} /> 우리 컨디션에 맞는 오후
                      </h3>
                      {trip.alternatives.map((a) => (
                        <details key={a.title}>
                          <summary>{a.title}</summary>
                          <p>{a.description}</p>
                          <p className="subtle">{a.cost}</p>
                          <div className="button-row">
                            {a.placeIds.map((id) => (
                              <button
                                className="text-button"
                                key={id}
                                onClick={() =>
                                  setSelected(
                                    trip.places.find((p) => p.id === id),
                                  )
                                }
                              >
                                {trip.places.find((p) => p.id === id)?.name}{" "}
                                <ArrowUpRight size={14} />
                              </button>
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  )}
                </div>
                <aside className="journey-aside">
                  <div className="aside-map">
                    <div className="aside-title">
                      <h3>오늘의 여행 지도</h3>
                      <button
                        onClick={() => go("map")}
                        aria-label="큰 지도 보기"
                      >
                        <ArrowUpRight size={20} />
                      </button>
                    </div>
                    <MapView places={mapPlaces} onPlace={setSelected} compact />
                    <div className="map-caption">
                      <span>
                        <MapPin size={14} />
                        DAY 0{day} ·{" "}
                        {mapPlaces.filter((p) => p.lat < 23).length}곳
                      </span>
                      <button className="text-button" onClick={() => go("map")}>
                        크게 보기 <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="slow-card">
                    <Coffee size={25} />
                    <span className="eyebrow">SLOW IS BEAUTIFUL</span>
                    <h3>
                      빈 시간도
                      <br />
                      여행의 일부니까.
                    </h3>
                    <p>
                      {day === 1
                        ? "첫날은 객실에서 90분 쉬어가요. 늦은 점심을 먹고, 도시가 빛날 때 다시 나서면 돼요."
                        : day === 2
                          ? "오후에는 수영과 휴식을 위해 3시간 이상 비워두었어요. 하고 싶은 만큼만 즐겨요."
                          : day === 3 && shownTeam === "A"
                            ? "콜로안에서 쉬어가고, 17시에 이른 저녁을 먹어요. 19시에는 공연장에 도착해 마지막 밤을 준비해요."
                            : "오늘은 짐과 마음에 여유를 남겨요. 공항 가는 시간은 넉넉하게 확보했어요."}
                    </p>
                    <span className="slow-flower">✳</span>
                  </div>
                  <button className="transport-card" onClick={() => go("info")}>
                    <Bus size={23} />
                    <div>
                      <strong>어떻게 이동할까요?</strong>
                      <span>택시 · 셔틀 · 버스 비교</span>
                    </div>
                    <ChevronRight size={17} />
                  </button>
                </aside>
              </div>
            </section>
            {!(team === "B" && day === 4 && !viewA) && (
              <section className="food-section">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">A TASTE OF OUR JOURNEY</span>
                    <h2>같이 먹으면 더 맛있는 순간</h2>
                  </div>
                  <span className="subtle">
                    {day >= 3 && shownTeam === "A"
                      ? "A팀 3인 기준"
                      : "공동 일정 5인 기준"}{" "}
                    · 자체 예산
                  </span>
                </div>
                <div className="food-grid">
                  {trip.places
                    .filter(
                      (p) => p.category === "식사" && p.days?.includes(day),
                    )
                    .map((p, i) => (
                      <button
                        className={`food-card food-${i % 4}`}
                        key={p.id}
                        onClick={() => setSelected(p)}
                      >
                        <div className="food-art food-photo">
                          <img
                            src={img(p.image)}
                            alt={`${p.name} 대표 사진`}
                            loading="lazy"
                            decoding="async"
                          />
                          <span className="food-no">TABLE / 0{i + 1}</span>
                          <span className="food-cuisine">{p.english}</span>
                          <ArrowUpRight size={19} />
                        </div>
                        <div className="food-copy">
                          <span className="eyebrow">
                            {p.id === "buffet"
                              ? "취향대로 골라 먹는 뷔페"
                              : p.id === "famiglia" || p.id === "antonio"
                                ? "포르투갈과 마카오의 맛"
                                : "따뜻하게 나누는 한 끼"}
                          </span>
                          <h3>{p.name}</h3>
                          <p>{p.mealNote}</p>
                          <div className="food-cost">
                            <span>
                              {day >= 3 && shownTeam === "A" ? "3" : "5"}인 MOP{" "}
                              {(
                                p.budget![0] *
                                (day >= 3 && shownTeam === "A" ? 3 : 5)
                              ).toLocaleString()}
                              –
                              {(
                                p.budget![1] *
                                (day >= 3 && shownTeam === "A" ? 3 : 5)
                              ).toLocaleString()}
                            </span>
                            <ChevronRight size={16} />
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </section>
            )}
          </>
        )}
        {page === "map" && (
          <>
            <div className="page-heading">
              <div>
                <span className="eyebrow">PLACES WE WILL GO</span>
                <h1>우리의 마카오, 한눈에.</h1>
                <p>장소를 눌러 살펴보고, 지금 있는 곳에서 길을 찾아요.</p>
              </div>
              <Pill>
                {traveler.name} · {team}팀
              </Pill>
            </div>
            <DayTabs day={day} onChange={chooseDay} />
            <div className="map-team-filter" aria-label="지도 팀 필터">
              {(["mine", "all", "A", "B"] as const).map((t) => (
                <button
                  key={t}
                  className={mapTeam === t ? "active" : ""}
                  onClick={() => setMapTeam(t)}
                >
                  {t === "mine"
                    ? "내 일정"
                    : t === "all"
                      ? "가족 전체"
                      : `${t}팀`}
                </button>
              ))}
            </div>
            <MapView places={mapPlaces} onPlace={setSelected} />
          </>
        )}
        {page === "info" && (
          <InfoPage
            trip={trip}
            team={team}
            setSelected={setSelected}
            sim={sim}
            setSim={setSim}
            announce={announce}
          />
        )}
        {page === "profile" && (
          <ProfilePage
            traveler={traveler}
            onSwitch={() => setChoosing(true)}
            onLogout={async () => {
              await api("/api/logout", { method: "POST" });
              setAuth(false);
              setTrip(undefined);
            }}
          />
        )}
        <footer className="footer">
          <Brand />
          <p>다섯 사람, 네 번의 하루. 오래 기억할 우리의 마카오.</p>
          <div>
            <button onClick={() => go("info")}>정보 출처 & 사진 크레딧</button>
            <span>MADE FOR OUR FAMILY · 2026</span>
          </div>
        </footer>
      </main>
      <nav className="bottom-nav" aria-label="모바일 메뉴">
        {nav.map((n) => (
          <button
            key={n.id}
            className={page === n.id ? "active" : ""}
            onClick={() => go(n.id)}
          >
            <n.icon size={21} />
            <span>{n.short}</span>
          </button>
        ))}
      </nav>
      {selected && (
        <Modal onClose={closeDetail} label={selected.name}>
          <PlaceDetail
            place={selected}
            trip={trip}
            team={shownTeam}
            day={day}
            announce={announce}
          />
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}

function DayTabs({
  day,
  onChange,
}: {
  day: number;
  onChange: (d: number) => void;
}) {
  return (
    <div className="day-tabs" role="tablist" aria-label="여행 날짜">
      {days.map((d) => (
        <button
          role="tab"
          aria-selected={day === d.day}
          className={day === d.day ? "active" : ""}
          key={d.day}
          onClick={() => onChange(d.day)}
        >
          <span className="day-tab-top">
            DAY 0{d.day}{" "}
            <span>
              {d.date} {d.week}
            </span>
          </span>
          <strong>{d.title}</strong>
          <span className="day-tab-bottom">
            {d.sub}
            <ArrowUpRight size={16} />
          </span>
        </button>
      ))}
    </div>
  );
}
function EventCard({
  event: e,
  place: p,
  onClick,
  date,
  index,
}: {
  event: Event;
  place: Place;
  onClick: () => void;
  date: Date;
  index: number;
}) {
  const status = eventState(e, date),
    isCurrent = status === "현재 예정 시간";
  return (
    <article
      className={`event-row ${isCurrent ? "is-current" : ""} ${e.category === "휴식" ? "is-rest" : ""}`}
    >
      <div className="event-time">
        <strong>{timeLabel(e)}</strong>
        <span>
          {timeLabel(e, true)}
          {e.category === "항공" ? " 도착" : "까지"}
        </span>
        <div className="timeline-dot" />
      </div>
      <div className="event-content">
        <div className="event-category">
          <IconFor category={e.category} />
          <span>{e.category}</span>
          {e.teamIds.length === 1 && (
            <Pill tone={e.teamIds[0] === "B" ? "clay" : ""}>
              {e.teamIds[0]}팀
            </Pill>
          )}
          {isCurrent && <Pill>현재 예정 시간</Pill>}
        </div>
        <button className="event-title" onClick={onClick}>
          {e.title}
          <ArrowUpRight size={18} />
        </button>
        <p>
          {typeof e.notes === "string" && e.notes
            ? e.notes
            : p.description.slice(0, 75)}
        </p>
        <div className="event-meta">
          <span>
            <Clock size={13} />
            {e.category === "항공"
              ? "항공권 확인"
              : `${Math.round((+new Date(e.endAt) - +new Date(e.startAt)) / 60000)}분`}
          </span>
          <span>
            <MapPin size={13} />
            {p.name}
          </span>
          {e.reservationRequired && <span>예약 필요</span>}
          {e.category === "항공" && <span>출발·도착 각 현지 시간</span>}
        </div>
        {e.cost.min > 0 && (
          <div className="event-budget">
            {e.cost.people}인 {e.cost.currency} {e.cost.min.toLocaleString()}–
            {e.cost.max.toLocaleString()} <small>{e.cost.includes}</small>
          </div>
        )}
        {macauDate(date) === e.startAt.slice(0, 10) && !isCurrent && (
          <small className="subtle">{status} · 예정 시간 기준</small>
        )}
        <div className="event-actions">
          <button onClick={onClick}>
            자세히 보기 <ChevronRight size={14} />
          </button>
          <a
            href={directions(p.lat, p.lng, { lat: 22.1484, lng: 113.5599 })}
            target="_blank"
            rel="noreferrer"
          >
            <Navigation size={14} />
            호텔에서 길찾기
          </a>
        </div>
      </div>
      {index === 0 && p.image && (
        <div className="event-image">
          <Photo
            name={p.image}
            alt={
              p.category === "식사"
                ? `${p.name} 대표 사진`
                : p.id === "senado"
                  ? "세나도 광장 참고 사진"
                  : "베네시안 마카오 여행 참고 사진"
            }
          />
        </div>
      )}
    </article>
  );
}

function PlaceDetail({
  place: p,
  trip,
  day,
  team,
  announce,
}: {
  place: Place;
  trip: Trip;
  day: number;
  team: Team;
  announce: (s: string) => void;
}) {
  const [taxi, setTaxi] = useState(false);
  const people = day >= 3 ? (team === "A" ? 3 : 2) : 5;
  const source = trip.sources.find((s) => s.id === p.sourceIds[0]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(p.local + "\n" + p.address);
      announce("현지 장소명과 주소를 복사했어요.");
    } catch {
      announce("복사 권한이 없어요. 아래 현지 주소를 길게 눌러 복사하세요.");
    }
  }
  return (
    <>
      {p.image ? (
        <div className="detail-photo">
          <Photo
            name={p.image}
            alt={
              p.id === "senado"
                ? "세나도 광장"
                : p.id === "venetian"
                  ? "베네시안 마카오"
                  : "마카오 여행 참고 이미지"
            }
          />
          <span>
            {p.category === "식사"
              ? `${p.name} · 공식 소개 사진`
              : p.id === "senado"
                ? "세나도 광장"
                : p.id === "venetian"
                  ? "베네시안 마카오"
                  : "여행 분위기 참고 사진 · 베네시안"}
          </span>
        </div>
      ) : (
        <div className="detail-food-art">
          <Utensils size={55} strokeWidth={1} />
          <span>A TASTE OF MACAO</span>
        </div>
      )}
      <div className="detail-body">
        <span className="eyebrow">
          {p.category} · {p.english}
        </span>
        <h2>{p.name}</h2>
        <p className="detail-local">{p.local}</p>
        <div className="button-row">
          <a
            className="primary small"
            href={directions(p.lat, p.lng, { lat: 22.1484, lng: 113.5599 })}
            target="_blank"
            rel="noreferrer"
          >
            <Navigation size={16} />
            호텔에서 길찾기
          </a>
          <button className="outline small" onClick={() => setTaxi(!taxi)}>
            <MapPin size={16} />
            {taxi ? "주소 작게 보기" : "기사님께 보여주기"}
          </button>
          <button className="icon-button" onClick={copy} aria-label="주소 복사">
            <Copy size={18} />
          </button>
        </div>
        {taxi && (
          <div className="taxi-address">
            <span>請帶我去這裡，謝謝。</span>
            <strong>{p.local}</strong>
            <p>{p.address}</p>
            <small>이곳으로 가 주세요. 감사합니다.</small>
          </div>
        )}
        <p className="detail-intro">{p.description}</p>
        <div className="detail-facts">
          <div>
            <Clock size={18} />
            <span>
              운영 안내<strong>{p.hours}</strong>
            </span>
          </div>
          <div>
            <Coffee size={18} />
            <span>
              머무는 시간<strong>{p.stay}</strong>
            </span>
          </div>
          <div>
            <BriefcaseBusiness size={18} />
            <span>
              비용 안내
              <strong>
                {p.budget
                  ? `${people}인 MOP ${(p.budget[0] * people).toLocaleString()}–${(p.budget[1] * people).toLocaleString()} 자체 예산`
                  : p.cost}
              </strong>
              {p.budget && (
                <small>
                  1인 MOP {p.budget.join("–")} · 세금·봉사료 확인 필요
                </small>
              )}
            </span>
          </div>
          <div>
            <CalendarDays size={18} />
            <span>
              예약 안내<strong>{p.reservation}</strong>
            </span>
          </div>
        </div>
        {p.menu && (
          <section className="detail-section">
            <h3>
              <Utensils size={18} /> 식탁에서 이렇게 주문해요
            </h3>
            <p>{p.menu}</p>
            {p.mealNote && <div className="notice">{p.mealNote}</div>}
            <a
              className="text-button"
              href={p.galleryUrl}
              target="_blank"
              rel="noreferrer"
            >
              공식 매장·메뉴 사진과 예약 보기 <ExternalLink size={16} />
            </a>
          </section>
        )}
        <section className="detail-section">
          <h3>
            <Bus size={18} /> 가는 길
          </h3>
          <p>{p.transport}</p>
          <h3>
            <Footprints size={18} /> 편안하게 둘러보려면
          </h3>
          <p>{p.walking}</p>
          <h3>
            <CloudRain size={18} /> 비가 오거나 피곤한 날
          </h3>
          <p>{p.rain}</p>
        </section>
        {p.category === "식사" && (
          <section className="detail-section">
            <h3>
              <Heart size={18} /> 우리 가족에게 어울리는 이유
            </h3>
            <p>{p.fit}</p>
            <p className="subtle">
              외부 평점·한국어 서비스 후기: 미검증. 대기 15–30분은 계획상
              여유이며 실제 대기 예측이 아닙니다. 결제수단·좌석·가격은 매장
              확인이 필요합니다.
            </p>
          </section>
        )}
        <section className="source-box">
          <h3>
            <ShieldCheck size={17} /> 확인한 정보, 남겨둔 출처
          </h3>
          <p>현재 운영정보이며 2026년 10월 여행일 운영을 보장하지 않습니다.</p>
          {p.sourceIds.map((id) => {
            const s = trip.sources.find((x) => x.id === id)!;
            return (
              <div key={id}>
                <Pill tone={s.status === "확인 필요" ? "clay" : ""}>
                  {s.status}
                </Pill>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.name}
                    <ExternalLink size={13} />
                  </a>
                ) : (
                  <span>{s.name}</span>
                )}
                <small>
                  {s.checkedAt} 확인 · {s.note}
                </small>
              </div>
            );
          })}
        </section>
        {source?.url && (
          <a
            className="primary detail-official"
            href={source.url}
            target="_blank"
            rel="noreferrer"
          >
            공식 안내 열기 <ArrowUpRight size={18} />
          </a>
        )}
      </div>
    </>
  );
}

function InfoPage({
  trip,
  team,
  setSelected,
  sim,
  setSim,
  announce,
}: {
  trip: Trip;
  team: Team;
  setSelected: (p: Place) => void;
  sim: string;
  setSim: (s: string) => void;
  announce: (s: string) => void;
}) {
  const [checked, setChecked] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("macao-checklist") || "[]");
    } catch {
      return [];
    }
  });
  function toggle(item: string) {
    const list = checked.includes(item)
      ? checked.filter((x) => x !== item)
      : [...checked, item];
    setChecked(list);
    localStorage.setItem("macao-checklist", JSON.stringify(list));
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A LITTLE PREPARATION, A LOT OF JOY</span>
          <h1>마음 가볍게, 떠날 준비.</h1>
          <p>챙길 것부터 돌아오는 길까지. 필요한 정보를 한곳에 모았어요.</p>
        </div>
        <Pill>{team}팀 안내</Pill>
      </div>
      <div className="info-grid">
        <section className="panel checklist">
          <div className="section-heading">
            <h2>우리의 출발 체크리스트</h2>
            <Pill>
              {checked.length} / {trip.checklist.length}
            </Pill>
          </div>
          <div className="progress-track">
            <span
              style={{
                width: `${(checked.length / trip.checklist.length) * 100}%`,
              }}
            />
          </div>
          {trip.checklist.map((item) => (
            <label
              key={item}
              className={checked.includes(item) ? "checked" : ""}
            >
              <input
                type="checkbox"
                checked={checked.includes(item)}
                onChange={() => toggle(item)}
              />
              <span className="custom-check">
                {checked.includes(item) && <Check size={15} />}
              </span>
              {item}
            </label>
          ))}
          <p className="subtle">준비 상태는 이 기기에 저장됩니다.</p>
        </section>
        <section className="panel flight-panel">
          <span className="eyebrow">FLIGHT NOTES</span>
          <h2>떠나는 날, 돌아오는 날</h2>
          {trip.flights
            .filter((f) => f.teams.includes(team))
            .map((f) => (
              <div className="flight-row" key={f.id}>
                <div>
                  <Pill>{f.id === "out" ? "함께 출국" : `${team}팀 귀국`}</Pill>
                  <span>{f.departure.slice(0, 10).replaceAll("-", ".")} </span>
                </div>
                <div className="flight-times">
                  <strong>
                    {f.from}
                    <b>
                      {clock(
                        new Date(f.departure),
                        f.from === "ICN" ? "Asia/Seoul" : "Asia/Macau",
                      )}
                    </b>
                  </strong>
                  <Plane size={23} />
                  <strong>
                    {f.to}
                    <b>
                      {clock(
                        new Date(f.arrival),
                        f.to === "ICN" ? "Asia/Seoul" : "Asia/Macau",
                      )}
                    </b>
                  </strong>
                </div>
                <p className="subtle">각 공항 현지 시간 · {f.note}</p>
              </div>
            ))}
          <div className="notice">
            <Clock size={17} />
            <div>
              <strong>귀국일 12:30 호텔 출발 → 13:10 공항 도착</strong>
              <p>
                항공사 미상으로 출발 3시간 전 도착을 제안합니다. 항공권의
                수속·탑승 마감이 우선입니다.
              </p>
            </div>
          </div>
        </section>
        <section className="panel hotel-panel">
          <span className="eyebrow">OUR HOME</span>
          <h2>베네시안 마카오</h2>
          <div className="hotel-info-photo">
            <Photo name="venetian" alt="베네시안 마카오 야경" />
          </div>
          <div className="hotel-dates">
            <div>
              <small>CHECK IN</small>
              <strong>10.12 월 · 15:00</strong>
            </div>
            <div>
              <small>CHECK OUT · {team}팀</small>
              <strong>10.{team === "A" ? "15 목" : "14 수"} · 11:00</strong>
            </div>
          </div>
          <p>
            얼리 체크인은 보장되지 않습니다. 체크인 전·체크아웃 후 짐 보관은
            호텔에 문의하세요.
          </p>
          <button
            className="text-button"
            onClick={() =>
              setSelected(trip.places.find((p) => p.id === "venetian")!)
            }
          >
            호텔과 수영장 안내 <ArrowUpRight size={16} />
          </button>
        </section>
        <section className="panel essentials">
          <span className="eyebrow">GOOD TO KNOW</span>
          <h2>여행을 편하게 하는 메모</h2>
          <details open>
            <summary>현금과 결제</summary>
            <p>
              예산은 MOP(마카오 파타카)와 HKD(홍콩달러)를 구분했어요. 환율을
              연동하지 않아 원화로 환산하지 않습니다. 버스는 현금 MOP 6,
              거스름돈이 없으니 소액 동전을 준비하세요.
            </p>
          </details>
          <details>
            <summary>육포·과일은 현지에서 즐겨요</summary>
            <p>
              육포·소시지·생과일 등은 한국 반입이 제한됩니다. 망고 모찌 등
              가공식품도 성분·검역 조건을 확인하세요. 육류 포함 제품은 현지에서
              먹는 계획으로 두세요.
            </p>
            <a
              href={trip.sources.find((s) => s.id === "quarantine")!.url}
              target="_blank"
              rel="noreferrer"
            >
              공식 검역 안내 <ExternalLink size={13} />
            </a>
          </details>
          <details>
            <summary>골목에서 먹고, 쉬고, 쇼핑하기</summary>
            <p>
              에그타르트·망고 모찌·육포는 판매점과 메뉴를 현장에서 확인해요.
              간식은 1인 MOP 30–80, 마그넷은 MOP 20–60의 자체 예산을 잡아두세요.
              가격은 확정정보가 아닙니다. 광장 주변 카페에서 쉬고 화장실 위치를
              직원에게 문의하세요.
            </p>
          </details>
          <details>
            <summary>날씨와 실내 대안</summary>
            <p>
              우천 시 돌길·계단을 피하고 호텔 쇼핑몰로 대체해요. 공연과
              케이블카는 바람·기상·행사에 따라 중단될 수 있습니다.
            </p>
            <a
              href="https://www.smg.gov.mo/en"
              target="_blank"
              rel="noreferrer"
            >
              마카오 기상청 확인 <ExternalLink size={13} />
            </a>
          </details>
        </section>
      </div>
      <section className="transport-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">GETTING AROUND, TOGETHER</span>
            <h2>다섯 명이 편하게 이동하는 방법</h2>
          </div>
        </div>
        {trip.transports.map((t) => (
          <div key={t.id} className="transport-group">
            <h3>{t.title}</h3>
            <div className="transport-options">
              {t.options.map((o, i) => (
                <article key={o.name}>
                  <span className="option-number">0{i + 1}</span>
                  <h3>{o.name}</h3>
                  <strong>{o.departure}</strong>
                  <p>{o.time}</p>
                  <div className="transport-cost">{o.cost}</div>
                  <p>{o.detail}</p>
                </article>
              ))}
            </div>
            <div className="transport-sources">
              {t.sourceIds.map((id) => {
                const s = trip.sources.find((x) => x.id === id)!;
                return (
                  <a key={id} href={s.url} target="_blank" rel="noreferrer">
                    {s.name}
                    <ExternalLink size={12} />
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </section>
      <section className="panel pending">
        <h2>
          <Info size={22} /> 출발 전에 한 번 더 확인해요
        </h2>
        <p>예약이 필요한 항목은 아직 확정 예약으로 표시하지 않았습니다.</p>
        <ul>
          {trip.pending.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>
      <section className="panel simulator">
        <div>
          <span className="eyebrow">TIME MACHINE</span>
          <h2>여행 중 화면 미리보기</h2>
          <p>
            마카오 시간을 설정하면 현재·다음 일정과 여행 전후 상태를 확인할 수
            있어요.
          </p>
        </div>
        <label>
          마카오 날짜와 시간
          <input
            type="datetime-local"
            value={sim}
            onChange={(e) => setSim(e.target.value)}
          />
        </label>
        <div className="button-row">
          <button
            className="outline small"
            onClick={() => {
              setSim("2026-10-14T14:30");
              announce("10월 14일 14:30으로 미리보기를 설정했어요.");
            }}
          >
            3일차 오후 보기
          </button>
          <button className="text-button" onClick={() => setSim("")}>
            실제 시간으로 복원
          </button>
        </div>
      </section>
      <section className="panel sources-list">
        <span className="eyebrow">SOURCES & CREDITS</span>
        <h2>출처가 있는 여행 안내</h2>
        <p>2026.09.23 확인 · 현재 안내와 10월 여행일 확정정보는 다릅니다.</p>
        {trip.sources.map((s) => (
          <details key={s.id}>
            <summary>
              <span>{s.name}</span>
              <Pill tone={s.status === "확인 필요" ? "clay" : ""}>
                {s.status}
              </Pill>
            </summary>
            <p>{s.note}</p>
            <p className="subtle">
              확인일 {s.checkedAt} ·{" "}
              {s.id === "user"
                ? "사용자 제공"
                : "현재 게시 정보, 여행일 재확인"}
            </p>
            {s.url && (
              <a href={s.url} target="_blank" rel="noreferrer">
                원문 열기 <ExternalLink size={14} />
              </a>
            )}
          </details>
        ))}
        <div className="photo-credits">
          <h3>사진과 일러스트</h3>
          <p>
            베네시안 사진:{" "}
            <a
              href="https://commons.wikimedia.org/wiki/File:The_Venetian_Macao_Night_View_201104.jpg"
              target="_blank"
              rel="noreferrer"
            >
              soeperbaby
            </a>{" "}
            ·{" "}
            <a href="https://creativecommons.org/licenses/by/2.0/">CC BY 2.0</a>
            . 세나도 사진:{" "}
            <a
              href="https://commons.wikimedia.org/wiki/File:Evening_at_Senado_Square.jpg"
              target="_blank"
              rel="noreferrer"
            >
              Pauloleong2002
            </a>{" "}
            ·{" "}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/">
              CC BY-SA 4.0
            </a>
            . 크롭·압축·화면 색상 오버레이 적용. 세나도 수정 이미지도 동일
            라이선스. 촬영 당시 사진이며 현재 모습을 보장하지 않습니다.
          </p>
          <p>
            동물 프로필·타일·식사 그림은 사이트 전용 SVG 일러스트입니다. 식당
            사진은 공식 매장 링크로 제공합니다. 검증된 한국어 영상이 없어 영상
            링크는 등록하지 않았습니다.
          </p>
        </div>
      </section>
    </>
  );
}

function ProfilePage({
  traveler: p,
  onSwitch,
  onLogout,
}: {
  traveler: Traveler;
  onSwitch: () => void;
  onLogout: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MY TRAVEL PASSPORT</span>
          <h1>나의 작은 여행 여권.</h1>
          <p>함께하는 사람, 머무는 날, 돌아오는 시간을 확인해요.</p>
        </div>
      </div>
      <section className="profile-panel">
        <div className="profile-identity">
          <span className="eyebrow">MACAO · OCTOBER 2026</span>
          <Avatar person={p} size={132} />
          <h2>{p.name}</h2>
          <Pill tone={p.team === "B" ? "clay" : ""}>
            {p.team}팀 · 고정 배정
          </Pill>
          <span className="passport-stamp">
            OUR FAMILY
            <br />
            <b>2026</b>
            <br />
            MACAO
          </span>
        </div>
        <div className="profile-content">
          <h3>이번 여행의 기록</h3>
          <dl>
            <div>
              <dt>함께하는 기간</dt>
              <dd>
                2026.10.12 — 10.
                {p.team === "A" ? "15 · 3박 4일" : "14 · 2박 3일"}
              </dd>
            </div>
            <div>
              <dt>우리의 숙소</dt>
              <dd>베네시안 마카오</dd>
            </div>
            <div>
              <dt>출국</dt>
              <dd>10.12 인천 07:50 → 마카오 10:40</dd>
            </div>
            <div>
              <dt>귀국</dt>
              <dd>
                10.{p.team === "A" ? "15" : "14"} 마카오 16:10 → 인천 22:45
              </dd>
            </div>
            <div>
              <dt>체크아웃</dt>
              <dd>10.{p.team === "A" ? "15" : "14"} 11:00 · 마카오 시간</dd>
            </div>
          </dl>
          <p className="subtle">
            사용자 제공 일정 · 항공권 확인 필요. 이름과 팀은 변경할 수 없습니다.
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="profile-actions">
            <button className="text-button" onClick={onSwitch}>
              <UserRound size={17} />
              다른 여행자로 전환
            </button>
            <button
              className="text-button"
              onClick={() =>
                onLogout().catch(() =>
                  setError("로그아웃하지 못했어요. 다시 시도해 주세요."),
                )
              }
            >
              <LogOut size={17} />
              가족 접근 잠그기
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
