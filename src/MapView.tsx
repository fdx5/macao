import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, Navigation, MapPin, X, ExternalLink } from "lucide-react";
import type { Place } from "./types";
import { directions } from "./domain";
export default function MapView({
  places,
  onPlace,
  compact = false,
}: {
  places: Place[];
  onPlace: (p: Place) => void;
  compact?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null),
    layer = useRef<L.LayerGroup | null>(null),
    watch = useRef<number | null>(null),
    positionMarker = useRef<L.LayerGroup | null>(null);
  const [selected, setSelected] = useState<Place | undefined>(),
    [position, setPosition] = useState<{
      lat: number;
      lng: number;
      accuracy: number;
      at: string;
    }>(),
    [message, setMessage] = useState(
      "위치를 공유하지 않아도 지도를 볼 수 있어요.",
    ),
    [locating, setLocating] = useState(false),
    [origin, setOrigin] = useState("hotel"),
    [mode, setMode] = useState("driving"),
    [tileError, setTileError] = useState(false);
  const callback = useRef(onPlace);
  callback.current = onPlace;
  useEffect(() => {
    if (!container.current) return;
    const m = L.map(container.current, {
      scrollWheelZoom: !compact,
      zoomControl: !compact,
    }).setView([22.158, 113.553], 13);
    map.current = m;
    L.tileLayer(
      import.meta.env.VITE_MAP_TILE_URL ||
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          import.meta.env.VITE_MAP_ATTRIBUTION ||
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      },
    )
      .on("tileerror", () => setTileError(true))
      .addTo(m);
    layer.current = L.layerGroup().addTo(m);
    positionMarker.current = L.layerGroup().addTo(m);
    const ob = new ResizeObserver(() => m.invalidateSize());
    ob.observe(container.current);
    return () => {
      ob.disconnect();
      m.remove();
      map.current = null;
      if (watch.current !== null)
        navigator.geolocation.clearWatch(watch.current);
    };
  }, [compact]);
  useEffect(() => {
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    const local = places.filter((p) => p.lat < 23);
    local.forEach((p, i) =>
      L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: "journal-pin",
          html: `<span>${i + 1}</span>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        }),
      })
        .on("click", () => {
          setSelected(p);
          if (compact) callback.current(p);
        })
        .addTo(layer.current!),
    );
    if (local.length)
      map.current.fitBounds(
        L.latLngBounds(local.map((p) => [p.lat, p.lng] as [number, number])),
        { padding: [35, 35], maxZoom: 15 },
      );
    setSelected(undefined);
  }, [places, compact]);
  function locate() {
    if (!navigator.geolocation) {
      setMessage(
        "이 기기에서 위치 확인을 지원하지 않습니다. 호텔을 출발지로 사용하세요.",
      );
      return;
    }
    setLocating(true);
    setMessage("현재 위치를 확인하고 있어요…");
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = navigator.geolocation.watchPosition(
      (p) => {
        const pos = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
          at: new Date().toLocaleTimeString("ko-KR"),
        };
        setPosition(pos);
        setOrigin("gps");
        setLocating(false);
        setMessage(
          `위치 정확도 ±${Math.round(pos.accuracy)}m · ${pos.at} 갱신`,
        );
        positionMarker.current?.clearLayers();
        L.circle([pos.lat, pos.lng], {
          radius: pos.accuracy,
          color: "#296ba4",
          fillOpacity: 0.1,
        }).addTo(positionMarker.current!);
        L.circleMarker([pos.lat, pos.lng], {
          radius: 8,
          color: "white",
          weight: 3,
          fillColor: "#296ba4",
          fillOpacity: 1,
        })
          .bindTooltip("내 기기의 위치")
          .addTo(positionMarker.current!);
        map.current?.setView([pos.lat, pos.lng], 14);
      },
      (err) => {
        setLocating(false);
        setMessage(
          err.code === 1
            ? "위치 권한이 꺼져 있어요. 호텔 또는 선택한 장소를 출발지로 사용하세요."
            : "위치를 찾지 못했어요. 실외에서 다시 시도하거나 호텔을 출발지로 사용하세요.",
        );
        stop(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  }
  function stop(clear = true) {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    setPosition(undefined);
    setOrigin("hotel");
    positionMarker.current?.clearLayers();
    if (clear)
      setMessage("위치 사용을 중지했어요. 위치는 서버에 저장되지 않습니다.");
  }
  const originPlace = places.find((p) => p.id === origin);
  const coords =
    origin === "gps" && position
      ? position
      : originPlace
        ? { lat: originPlace.lat, lng: originPlace.lng }
        : { lat: 22.1484, lng: 113.5599 };
  return (
    <div className={compact ? "map-component compact" : "map-component"}>
      <div
        ref={container}
        className="map-canvas"
        aria-label="날짜별 여행 장소 지도"
      />
      {tileError && (
        <div className="map-error">
          지도 배경을 불러오지 못했어요. 아래 장소 목록과 외부 길찾기를
          이용하세요.
        </div>
      )}
      {!compact && (
        <>
          <div className="map-controls">
            <button
              className="primary small"
              onClick={locate}
              disabled={locating}
            >
              <LocateFixed size={17} />
              {locating ? "위치 확인 중…" : "내 위치 확인"}
            </button>
            {position && (
              <button className="outline small" onClick={() => stop()}>
                <X size={16} />
                위치 사용 중지
              </button>
            )}
            <label>
              출발지
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              >
                <option value="hotel">베네시안 호텔</option>
                {position && <option value="gps">내 현재 위치</option>}
                {places
                  .filter((p) => p.id !== "venetian")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              이동수단
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="driving">차량</option>
                <option value="walking">도보</option>
                <option value="transit">대중교통</option>
              </select>
            </label>
          </div>
          <p className="subtle" role="status">
            {message}
          </p>
          <div className="map-place-list">
            {places
              .filter((p) => p.lat < 23)
              .map((p, i) => (
                <button
                  className={selected?.id === p.id ? "selected" : ""}
                  key={p.id}
                  onClick={() => {
                    setSelected(p);
                    map.current?.setView([p.lat, p.lng], 16);
                  }}
                >
                  <span>{i + 1}</span>
                  {p.name}
                  <MapPin size={15} />
                </button>
              ))}
          </div>
          {selected && (
            <div className="map-selection">
              <div>
                <span className="eyebrow">{selected.category}</span>
                <h3>{selected.name}</h3>
                <p>{selected.local}</p>
              </div>
              <button
                className="outline small"
                onClick={() => onPlace(selected)}
              >
                상세보기 <ExternalLink size={15} />
              </button>
              <a
                className="primary small"
                href={directions(selected.lat, selected.lng, coords, mode)}
                target="_blank"
                rel="noreferrer"
              >
                <Navigation size={16} />
                길찾기
              </a>
            </div>
          )}
          <p className="subtle">
            마커는 방문 장소입니다. 도로 경로·실시간 이동시간은 외부 지도에서
            확인하세요. 위치는 이 기기에서만 사용합니다.
          </p>
        </>
      )}
    </div>
  );
}
