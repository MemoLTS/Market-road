/**
 * Carga perezosa de Leaflet (mapa de OpenStreetMap) desde un CDN. Solo se pide cuando la persona abre el mapa;
 * si ya existe `window.L` (por ejemplo, un doble de prueba) no se descarga nada.
 */
export interface LeafletPosicion { lat: number; lng: number }
export interface LeafletEvento { latlng: LeafletPosicion }
export interface LeafletMarcador {
    addTo(mapa: LeafletMapa): LeafletMarcador;
    setLatLng(posicion: [number, number]): LeafletMarcador;
}
export interface LeafletMapa {
    setView(posicion: [number, number], zoom: number): LeafletMapa;
    on(evento: 'click', manejador: (e: LeafletEvento) => void): LeafletMapa;
    invalidateSize(): void;
    remove(): void;
}
export interface LeafletLib {
    map(elemento: HTMLElement): LeafletMapa;
    tileLayer(url: string, opciones: { maxZoom: number; attribution: string }): { addTo(mapa: LeafletMapa): unknown };
    marker(posicion: [number, number]): LeafletMarcador;
}

export const URL_LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
export const URL_LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
export const URL_TEJAS = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const CENTRO_INICIAL: [number, number] = [-33.45, -70.66]; // Santiago, zoom país

const leafletGlobal = (): LeafletLib | undefined => (window as unknown as { L?: LeafletLib }).L;

let pendiente: Promise<LeafletLib> | null = null;

export function cargarLeaflet(): Promise<LeafletLib> {
    const existente = leafletGlobal();
    if (existente) return Promise.resolve(existente);
    if (pendiente) return pendiente;
    pendiente = new Promise<LeafletLib>((resolve, reject) => {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = URL_LEAFLET_CSS;
        document.head.appendChild(css);
        const script = document.createElement('script');
        script.src = URL_LEAFLET_JS;
        script.async = true;
        script.onload = () => {
            const lib = leafletGlobal();
            if (lib) resolve(lib);
            else { pendiente = null; reject(new Error('El mapa no se inicializó correctamente.')); }
        };
        script.onerror = () => {
            pendiente = null;
            script.remove();
            reject(new Error('No se pudo cargar el mapa. Puedes buscar la ciudad o pueblo por nombre.'));
        };
        document.head.appendChild(script);
    });
    return pendiente;
}
