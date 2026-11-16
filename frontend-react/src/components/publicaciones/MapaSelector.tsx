import { useEffect, useRef, useState } from 'react';
import Alert from '../common/Alert';
import { mensajeDeError } from '../../core/formato';
import type { Ubicacion } from '../../core/formato';
import { CENTRO_INICIAL, URL_TEJAS, cargarLeaflet } from '../../core/mapa';
import type { LeafletMapa, LeafletMarcador } from '../../core/mapa';

export interface PropsMapaSelector {
    /** Punto ya elegido (si lo hay): el mapa se centra ahí y muestra el marcador. */
    posicion?: Ubicacion | null;
    /** Se llama con las coordenadas del punto en que la persona hizo clic. */
    onSeleccionar: (ubicacion: Ubicacion) => void;
}

/** Mapa de OpenStreetMap para marcar el punto de una publicación. Una sola responsabilidad: devolver coordenadas. */
export default function MapaSelector({ posicion = null, onSeleccionar }: PropsMapaSelector) {
    const contenedor = useRef<HTMLDivElement>(null);
    const alSeleccionar = useRef(onSeleccionar);
    alSeleccionar.current = onSeleccionar;
    const [error, setError] = useState('');

    useEffect(() => {
        let activo = true;
        let mapa: LeafletMapa | null = null;
        cargarLeaflet().then(L => {
            if (!activo || !contenedor.current) return;
            mapa = L.map(contenedor.current).setView(posicion ? [posicion.lat, posicion.lon] : CENTRO_INICIAL, posicion ? 13 : 5);
            L.tileLayer(URL_TEJAS, {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
            }).addTo(mapa);
            let marcador: LeafletMarcador | null = null;
            const colocar = (u: Ubicacion): void => {
                const punto: [number, number] = [u.lat, u.lon];
                if (marcador) marcador.setLatLng(punto);
                else if (mapa) marcador = L.marker(punto).addTo(mapa);
            };
            if (posicion) colocar(posicion);
            mapa.on('click', e => {
                const u: Ubicacion = { lat: e.latlng.lat, lon: e.latlng.lng };
                colocar(u);
                alSeleccionar.current(u);
            });
            window.setTimeout(() => mapa?.invalidateSize(), 100);
        }).catch(e => { if (activo) setError(mensajeDeError(e, 'No se pudo cargar el mapa.')); });
        return () => { activo = false; mapa?.remove(); };
        // El mapa se crea una vez; los cambios de `posicion` los refleja el propio clic.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div>
            <Alert mensaje={error} tipo="warning" />
            <div ref={contenedor} className="mapa-publicacion" role="application" aria-label="Mapa para marcar la ubicación de la publicación" data-testid="mapa" />
            <p className="form-text mb-0">Haz clic en el mapa sobre una ciudad o pueblo.</p>
        </div>
    );
}
