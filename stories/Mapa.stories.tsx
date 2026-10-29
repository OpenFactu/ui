import * as React from 'react';
import type { Story } from '@ladle/react';
import {
  MapButton, MapCircle, MapControl, MapPath, Marker, MarkerCluster, TileMap, localGeocoder, nominatimGeocoder, registerMapStyle,
  type TileMapHandle,
} from '../src/map';
import { Button } from '../src/components/Button';

const CITIES = [
  { id: 'Madrid', lat: 40.4168, lng: -3.7038 }, { id: 'Barcelona', lat: 41.3874, lng: 2.1686 }, { id: 'Valencia', lat: 39.4699, lng: -0.3763 },
  { id: 'Sevilla', lat: 37.3891, lng: -5.9845 }, { id: 'Bilbao', lat: 43.263, lng: -2.935 }, { id: 'Málaga', lat: 36.7213, lng: -4.4214 },
  { id: 'Zaragoza', lat: 41.6488, lng: -0.8891 }, { id: 'Granada', lat: 37.1773, lng: -3.5986 }, { id: 'Alicante', lat: 38.3452, lng: -0.481 },
];

export const Basico: Story = () => {
  const ref = React.useRef<TileMapHandle>(null);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {CITIES.slice(0, 4).map((c) => <Button key={c.id} size="sm" variant="secondary" onClick={() => ref.current?.flyTo({ lat: c.lat, lng: c.lng, zoom: 12 })}>{c.id}</Button>)}
      </div>
      <TileMap ref={ref} className="h-[460px]" defaultView={{ lat: 40.4168, lng: -3.7038, zoom: 11 }}>
        <Marker lat={40.4168} lng={-3.7038} label="Oficina central" popup={<><strong>Oficina central</strong><br />Puerta del Sol, Madrid</>} />
        <Marker lat={40.4531} lng={-3.6883} label="Almacén" color="var(--k-warning, #d97706)" popup="Almacén norte" />
      </TileMap>
    </div>
  );
};

export const Agrupados: Story = () => {
  const points = React.useMemo(() => [
    ...CITIES,
    ...Array.from({ length: 40 }, (_, i) => ({ id: `Cliente ${i + 1}`, lat: 40.4 + Math.sin(i * 1.7) * 0.12, lng: -3.7 + Math.cos(i * 2.3) * 0.16 })),
  ], []);
  return (
    <TileMap className="h-[480px]" defaultView={{ lat: 40.2, lng: -3.7, zoom: 6 }}>
      <MarkerCluster points={points} />
    </TileMap>
  );
};

/** Los cinco estilos incluidos lado a lado: estándar, claro, oscuro, blanco y negro, y negro. */
export const Estilos: Story = () => (
  <div className="grid gap-4 md:grid-cols-2">
    {(['standard', 'light', 'dark', 'mono', 'mono-dark', 'auto'] as const).map((id) => (
      <div key={id} className="flex flex-col gap-1">
        <code className="text-[12px] text-[var(--fg-muted,#52606f)]">mapStyle=&quot;{id}&quot;</code>
        <TileMap mapStyle={id} className="h-60" defaultView={{ lat: 40.4168, lng: -3.7038, zoom: 12 }} controls={['zoom']} scrollZoom="ctrl">
          <Marker lat={40.4168} lng={-3.7038} label="Madrid" />
        </TileMap>
      </div>
    ))}
  </div>
);

/** Todo junto: buscador, botones integrados, selector de estilos, medir, rutas, zonas y botones propios. */
export const Completo: Story = () => {
  const ref = React.useRef<TileMapHandle>(null);
  const [clicked, setClicked] = React.useState<{ lat: number; lng: number } | null>(null);
  const [style, setStyle] = React.useState('light');
  const sedes = React.useMemo(() => CITIES.map((c) => ({ ...c, name: c.id })), []);
  // Busca primero en tus datos y, si no hay nada, en el mundo.
  const geocoder = React.useMemo(() => {
    const local = localGeocoder(sedes, (s) => ({ id: `sede:${s.name}`, label: s.name, description: 'Sede de la empresa' }));
    const world = nominatimGeocoder({ countryCodes: 'es,pt,fr' });
    return async (query: string, signal: AbortSignal) => { const mine = await local(query, signal); return mine.length ? mine : world(query, signal); };
  }, [sedes]);
  return (
    <TileMap
      ref={ref}
      className="h-[560px]"
      mapStyle={style}
      onMapStyleChange={setStyle}
      defaultView={{ lat: 40.2, lng: -3.2, zoom: 6 }}
      controls={['zoom', 'locate', 'fullscreen', 'reset', 'measure', 'styles']}
      geocoder={geocoder}
      scrollZoom="ctrl"
      onMapClick={(point) => setClicked(point)}
    >
      <MapPath points={[CITIES[0], CITIES[2], CITIES[1]].map(({ lat, lng }) => ({ lat, lng }))} color="var(--k-info, #2563eb)" dashed />
      <MapPath closed points={[{ lat: 41.9, lng: -4.9 }, { lat: 41.9, lng: -2.9 }, { lat: 40.6, lng: -2.9 }, { lat: 40.6, lng: -4.9 }]} color="var(--k-warning, #d97706)" />
      <MapCircle lat={37.3891} lng={-5.9845} radius={90000} />
      {CITIES.map((c) => <Marker key={c.id} lat={c.lat} lng={c.lng} label={c.id} popup={<strong>{c.id}</strong>} />)}
      {clicked && <Marker lat={clicked.lat} lng={clicked.lng} color="var(--k-danger, #dc2626)" label="Punto elegido" popup={`${clicked.lat.toFixed(4)}, ${clicked.lng.toFixed(4)}`} />}
      <MapControl position="bottom-left">
        <MapButton onClick={() => ref.current?.fitBounds({ south: 36, west: -9.5, north: 43.8, east: 3.5 })}>Ver todas las sedes</MapButton>
      </MapControl>
      <MapControl position="top-left">
        <MapButton onClick={() => setClicked(null)} disabled={!clicked}>Quitar punto</MapButton>
      </MapControl>
    </TileMap>
  );
};

/** Un estilo propio: se registra una vez y queda en el selector y en `mapStyle`. */
export const EstiloPropio: Story = () => {
  React.useEffect(() => registerMapStyle({
    id: 'topografico', label: 'Topográfico', tileUrl: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', subdomains: 'abc', attribution: '© OpenStreetMap · OpenTopoMap', maxZoom: 17,
  }), []);
  return (
    <TileMap className="h-[460px]" mapStyle="topografico" defaultView={{ lat: 42.65, lng: -0.7, zoom: 9 }} controls={['zoom', 'styles']} scrollZoom="ctrl" />
  );
};
