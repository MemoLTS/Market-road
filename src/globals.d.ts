/** Bootstrap se carga por <script> desde CDN y queda como global. */
declare const bootstrap: {
    Modal: {
        getOrCreateInstance(el: Element): { show(): void; hide(): void };
    };
    Collapse: {
        getOrCreateInstance(el: Element): { show(): void; hide(): void };
    };
};

interface LeafletLatLng {
    lat: number;
    lng: number;
}

interface LeafletMarker {
    addTo(map: LeafletMap): LeafletMarker;
    setLatLng(position: [number, number]): LeafletMarker;
    bindPopup(content: string): LeafletMarker;
    openPopup(): LeafletMarker;
}

interface LeafletMap {
    setView(position: [number, number], zoom: number): LeafletMap;
    invalidateSize(): LeafletMap;
    on(event: 'click', callback: (event: { latlng: LeafletLatLng }) => void): LeafletMap;
}

declare const L: {
    map(elementId: string): LeafletMap;
    tileLayer(url: string, options: { maxZoom: number; attribution: string }): { addTo(map: LeafletMap): void };
    marker(position: [number, number]): LeafletMarker;
};

interface WindowEventMap {
    'mr:sesion-expirada': CustomEvent<void>;
    'mr:sesion-cambiada': CustomEvent<void>;
    'mr:foto-perfil-actualizada': CustomEvent<void>;
    'mr:soporte-sesion-expirada': CustomEvent<void>;
}
