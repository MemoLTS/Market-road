/** Bootstrap se carga por <script> desde CDN y queda como global. */
declare const bootstrap: {
    Modal: {
        getOrCreateInstance(el: Element): { show(): void; hide(): void };
    };
};

interface WindowEventMap {
    'mr:sesion-expirada': CustomEvent<void>;
    'mr:sesion-cambiada': CustomEvent<void>;
}
