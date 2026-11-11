#!/usr/bin/env python3
"""Regenera Documentos/diagrama de clases/Market-Road.mdj (StarUML) y las vistas previas PNG a partir del
código fuente real de los servicios (User-Api, Publication-Api, soporte y Getaway-Spring).
Uso:  python3 generar.py [raíz_del_repositorio]      (requiere Python 3, Pillow y Graphviz 'dot')"""
import copy, json, os, re, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import umlgen as U
from umlgen import *

RAIZ = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DOCS = os.path.join(RAIZ, 'Documentos', 'diagrama de clases')
MDJ = os.path.join(DOCS, 'Market-Road.mdj')
IMG = os.path.join(DOCS, 'imagenes')

viejo = json.load(open(MDJ, encoding='utf8'))
def todos(o, acc):
    if isinstance(o, dict):
        acc.append(o)
        for v in o.values(): todos(v, acc)
    elif isinstance(o, list):
        for x in o: todos(x, acc)
    return acc
for x in todos(viejo, []):
    if '_id' in x: U._ids.add(x['_id'])
modelo = viejo['ownedElements'][0]
paquetes_viejos = {p['name']: p for p in modelo['ownedElements'] if p['_type'] == 'UMLPackage'}

# ---------------------------------------------------------------- grupos de diagramas por servicio
GRUPOS = {
 'User-Api': [
  ('Arquitectura por capas', ['AuthController', 'UsuarioController', 'AdminUsuarioController', 'UsuarioService', 'UsuarioServiceImpl', 'DispositivoInicioSesionService',
                              'UsuarioRepository', 'FotoPerfilRepository', 'DispositivoInicioSesionRepository', 'Usuario', 'FotoPerfil', 'DispositivoInicioSesion', 'Rol'], None),
  ('Seguridad y configuración', ['JwtAuthFilter', 'ControlAccesoUsuariosFilter', 'JwtUtil', 'SeguridadConfig', 'SuperusuarioInicializador', 'UsuarioSchemaMigration', 'UsuarioRepository', 'Usuario', 'Rol'],
   'JwtAuthFilter (Order 1) autentica el token; ControlAccesoUsuariosFilter (Order 2) autoriza: borrar o consultar una cuenta solo la propia persona o un superusuario, y listar usuarios solo el superusuario.'),
  ('DTOs', ['LoginRequestDTO', 'LoginResponseDTO', 'UsuarioRequestDTO', 'UsuarioUpdateDTO', 'UsuarioResponseDTO', 'CambioCorreoDTO', 'DispositivoInicioSesionDTO', 'FotoPerfilDTO', 'Rol'], None),
  ('Excepciones', ['GlobalExceptionHandler', 'CredencialesInvalidasException', 'RecursoDuplicadoException', 'RecursoNoEncontradoException'], None),
 ],
 'Publication-Api': [
  ('Modelo de dominio', ['Publicacion', 'ImagenPublicacion', 'ModalidadEntrega', 'CategoriaPublicacion', 'EstadoPublicacion', 'Conversacion', 'MensajeConversacion', 'EstadoOferta', 'TipoMensaje'], None),
  ('Publicaciones: capas', ['PublicacionController', 'AdminPublicacionController', 'PublicacionService', 'PublicacionServiceImpl', 'AdminPublicacionService', 'PublicacionMapper',
                            'PublicacionRepository', 'ImagenPublicacionRepository', 'Publicacion', 'ImagenPublicacion', 'Textos'],
   'PATCH /publicaciones/{id} (actualizar) permite editar título, precio, descripción, ubicación y categoría solo a la persona dueña y mientras la publicación está activa.'),
  ('Publicaciones: DTOs', ['NuevaPublicacionDTO', 'ActualizarPublicacionDTO', 'PublicacionResponseDTO', 'AdminPublicacionDTO', 'ImagenDTO', 'ModalidadEntregaDTO', 'CategoriaDTO', 'PaginaDTO', 'ErrorDTO',
                          'CategoriaPublicacion', 'ModalidadEntrega', 'EstadoPublicacion'], None),
  ('Mensajería y ofertas: capas', ['ConversacionController', 'ConversacionService', 'ReglasMensajeria', 'LimitadorMensajes', 'ConversacionRepository', 'MensajeConversacionRepository',
                                   'Conversacion', 'MensajeConversacion', 'Identidad'], None),
  ('Mensajería y ofertas: DTOs', ['ConversacionDetalleDTO', 'ConversacionResumenDTO', 'MensajeDTO', 'MensajeRequestDTO', 'IniciarConversacionRequestDTO', 'OfertaRequestDTO', 'NoLeidosDTO',
                                  'EstadoOferta', 'TipoMensaje'], None),
  ('Catálogo y búsqueda', ['PublicacionController', 'CatalogoService', 'CatalogoProcesador', 'CatalogoConsulta', 'Candidato', 'Resultado', 'OrdenCatalogo', 'Geo', 'Relevancia', 'PublicacionRepository'], None),
  ('Seguridad, validación y excepciones', ['JwtAuthFilter', 'JwtUtil', 'Identidad', 'Textos', 'GlobalExceptionHandler', 'NoAutorizadoException', 'PublicacionNoEncontradaException',
                                           'ConversacionNoEncontradaException', 'OperacionNoPermitidaException', 'DemasiadasSolicitudesException'], None),
  ('Soporte duplicado (legado)', ['SoporteController', 'AdminSoporteController', 'SoporteService', 'TicketSoporte', 'TicketSoporteRepository', 'TicketSoporteDTO', 'TicketSoporteRequestDTO',
                                  'TicketSoporteRespuestaDTO', 'CategoriaSoporte', 'EstadoTicket', 'TicketNoEncontradoException'],
   'Código heredado: el soporte se movió al microservicio Soporte-Api. Estas clases siguen compiladas dentro de Publication-Api (y tienen pruebas), pero el gateway NO enruta hacia ellas: /api/v1/soporte/** va a soporte-service. Conviene eliminarlas junto con sus pruebas.'),
 ],
 'Soporte-Api': [
  ('Modelo de dominio', ['Ticket', 'MensajeTicket', 'PersonalSoporte', 'CategoriaTicket', 'EstadoTicket', 'PrioridadTicket', 'AutorTipo', 'RolPersonal'], None),
  ('Tickets de usuario: capas', ['SoporteUsuarioController', 'TicketService', 'ReglasTicket', 'LimitadorAcciones', 'TicketRepository', 'MensajeTicketRepository', 'TicketSpecs', 'Ticket', 'MensajeTicket', 'IdentidadUsuario'], None),
  ('Panel del personal: capas', ['PanelAuthController', 'PanelTicketController', 'PanelPersonalController', 'PanelEstadisticasController', 'AdminTicketController', 'TicketService', 'PersonalService',
                                 'EstadisticasService', 'PersonalSoporteRepository', 'PersonalSoporte', 'IdentidadPersonal'], None),
  ('DTOs de tickets', ['CrearTicketRequestDTO', 'MensajeRequestDTO', 'EstadoRequestDTO', 'PrioridadRequestDTO', 'AsignacionRequestDTO', 'TicketResumenDTO', 'TicketDetalleDTO', 'TicketPanelResumenDTO',
                       'TicketPanelDetalleDTO', 'MensajeTicketDTO', 'UsuarioTicketDTO', 'CategoriaDTO', 'NoLeidosDTO', 'PaginaDTO', 'ResumenSoporteDTO'], None),
  ('DTOs del personal', ['LoginRequestDTO', 'LoginResponseDTO', 'PersonalDTO', 'CargaPersonalDTO', 'CrearPersonalRequestDTO', 'ActualizarPersonalRequestDTO', 'CambiarContrasenaRequestDTO', 'EstadisticasDTO'], None),
  ('Seguridad, configuración y excepciones', ['SoporteAuthFilter', 'JwtUsuarioUtil', 'JwtPersonalUtil', 'IdentidadUsuario', 'IdentidadPersonal', 'SoporteConfig', 'AdminInicializador', 'PersonalInicializador',
                                              'Textos', 'GlobalExceptionHandler', 'NoAutorizadoException', 'OperacionNoPermitidaException', 'TicketNoEncontradoException', 'PersonalNoEncontradoException',
                                              'CredencialesInvalidasException', 'DemasiadasSolicitudesException'],
   'Dos sesiones independientes: la persona usuaria entra con el JWT de User-Api (JwtUsuarioUtil) y el personal con su propio JWT (JwtPersonalUtil).'),
 ],
}
CARPETAS = {'User-Api': 'User-Api', 'Publication-Api': 'Publication-Api', 'Soporte-Api': 'soporte'}

def construir(nombre_pkg, carpeta):
    svc = Servicio(nombre_pkg, os.path.join(RAIZ, carpeta, 'src', 'main', 'java'))
    construir_paquete(svc, nombre_pkg)
    rels = relaciones(svc)
    elems = materializar_relaciones(svc, rels)
    return svc, rels, elems

os.makedirs(IMG, exist_ok=True)
# borrar vistas previas de los paquetes regenerados (se conservan las de Frontend)
for f in os.listdir(IMG):
    if f.split(' - ')[0] in ('Vista general', 'User-Api', 'Publication-Api', 'Soporte-Api', 'Getaway-Spring', 'Gateway'):
        os.remove(os.path.join(IMG, f))

paquetes = {}
resumen = []
for nombre, carpeta in CARPETAS.items():
    svc, rels, elems = construir(nombre, carpeta)
    usadas = set()
    for i, (dn, clases, nota_txt) in enumerate(GRUPOS[nombre]):
        faltan = [c for c in clases if c not in svc.por_nombre]
        if faltan: raise SystemExit(f'{nombre}/{dn}: clases inexistentes {faltan}')
        usadas |= set(clases)
        d = Diagrama(svc, dn, clases, nota_txt)
        diag = armar_diagrama(svc, d, rels, elems, default=(i == 0))
        svc.pkg['ownedElements'].append(diag)
        notas = [(*d.n_nota, nota_txt)] if d.n_nota else []
        dibujar_png(os.path.join(IMG, f'{nombre} - {dn}'.replace(':', ' -') + '.png'), dn, d.nodos, d.aristas, notas)
        resumen.append((nombre, dn, len(clases), len(d.aristas)))
    huerfanas = sorted(set(svc.por_nombre) - usadas - {t['nombre'] for t in svc.tipos if 'SpringBootApplication' in t['anots']})
    paquetes[nombre] = svc
    print(nombre, 'clases:', len(svc.tipos), '· sin diagrama:', huerfanas)

# ---------------------------------------------------------------- Gateway
gw_java = os.path.join(RAIZ, 'Getaway-Spring', 'src', 'main', 'java')
svc_gw = Servicio('Getaway-Spring', gw_java)
construir_paquete(svc_gw, 'Getaway-Spring')
yml = open(os.path.join(RAIZ, 'Getaway-Spring', 'src', 'main', 'resources', 'application.yml'), encoding='utf8').read().splitlines()
rutas, actual = [], None
for ln in yml:
    m = re.match(r'\s*-\s*id:\s*(\S+)', ln)
    if m: actual = {'id': m.group(1), 'uri': '', 'paths': []}; rutas.append(actual); continue
    if actual:
        m = re.match(r'\s*uri:\s*(\S+)', ln)
        if m: actual['uri'] = m.group(1)
        m = re.match(r'\s*-\s*Path=(.+)', ln)
        if m: actual['paths'].extend(x.strip() for x in m.group(1).split(',') if x.strip())
pk_gw = svc_gw.pkg
rutas_cls = {"_type": "UMLClass", "_id": nid(), "_parent": ref(pk_gw), "name": "Rutas", "stereotype": "configuration",
             "documentation": "Definidas en src/main/resources/application.yml. El gateway es el único punto de entrada: cada ruta reenvía a un microservicio.", "attributes": []}
for r in rutas:
    rutas_cls["attributes"].append({"_type": "UMLAttribute", "_id": nid(), "_parent": ref(rutas_cls), "name": r['id'], "visibility": "public", "type": f"{', '.join(r['paths'])} → {r['uri']}"})
env = {"_type": "UMLAttribute", "_id": nid(), "_parent": ref(rutas_cls), "name": "CORS", "visibility": "public", "type": "todos los orígenes, métodos GET POST PUT PATCH DELETE OPTIONS"}
yml_txt = '\n'.join(yml)
rutas_cls["attributes"].append(env)
pk_gw["ownedElements"].append(rutas_cls); svc_gw.elementos['Rutas'] = rutas_cls
app = svc_gw.tipos[0]['nombre']
svc_gw.por_nombre['Rutas'] = {'nombre': 'Rutas', 'kind': 'class', 'anots': [], 'ext': None, 'ext_raw': '', 'impl': [], 'campos': [], 'metodos': [], 'constantes': [], 'comps': [], 'abstract': False, 'pkg': 'config', 'base': None}
dep = {"_type": "UMLDependency", "_id": nid(), "_parent": ref(svc_gw.elementos[app]), "source": ref(svc_gw.elementos[app]), "target": ref(rutas_cls), "name": "carga"}
svc_gw.elementos[app].setdefault('ownedElements', []).append(dep)
d = Diagrama(svc_gw, 'Arquitectura del gateway', [app, 'Rutas'], None, 'Spring Cloud Gateway: solo enruta, no contiene lógica de negocio.')
# nodo manual para Rutas (atributos con rutas)
diag = {"_type": "UMLClassDiagram", "_id": nid(), "_parent": ref(pk_gw), "name": d.nombre, "defaultDiagram": True, "documentation": d.doc, "ownedViews": []}
n_app = nodo_desde(svc_gw, app)
n_rut = Nodo('Rutas', 'configuration', [texto_attr(a['name'], a.get('type'), 'public') for a in rutas_cls['attributes']], [])
n_app.x, n_app.y = 40, 40; n_rut.x, n_rut.y = 40 + n_app.w + 90, 40
nodos = {app: n_app, 'Rutas': n_rut}
v1 = vista_nodo(diag, svc_gw.elementos[app], n_app, False); v2 = vista_nodo(diag, rutas_cls, n_rut, False)
diag['ownedViews'] += [v1, v2]
pts = U.puntos_arista(n_app, n_rut)
diag['ownedViews'].append(vista_arista(diag, 'dep', dep, v1, v2, pts))
pk_gw['ownedElements'].append(diag)
dibujar_png(os.path.join(IMG, 'Getaway-Spring - Arquitectura del gateway.png'), d.nombre, nodos, [('dep', app, 'Rutas', 'carga', '', pts)], [])
resumen.append(('Getaway-Spring', d.nombre, 2, 1))
paquetes['Getaway-Spring'] = svc_gw

# ---------------------------------------------------------------- Vista general
vg = {"_type": "UMLPackage", "_id": nid(), "name": "Vista general", "ownedElements": []}
def clase_manual(nombre, est, doc, attrs):
    e = {"_type": "UMLClass", "_id": nid(), "_parent": ref(vg), "name": nombre, "stereotype": est, "documentation": doc, "attributes": []}
    for n, t in attrs:
        e['attributes'].append({"_type": "UMLAttribute", "_id": nid(), "_parent": ref(e), "name": n, "visibility": "public", "type": t})
    vg['ownedElements'].append(e); return e
rutas_por = {r['id']: ', '.join(p.replace('/api/v1', '') for p in r['paths']) for r in rutas}
front = clase_manual('Frontend', 'frontend', 'Aplicación web estática (HTML + TypeScript). Llama a la API únicamente a través del gateway.', [('servidor', 'Nginx'), ('puerto', '8080 → 80'), ('tecnologías', 'HTML, Bootstrap, TypeScript')])
freact = clase_manual('Frontend React', 'frontend', 'Versión 2 del frontend (frontend-react/): componentes React en TypeScript; misma API, solo a través del gateway.', [('servidor', 'Vite (desarrollo)'), ('puerto', '5173'), ('tecnologías', 'React, TypeScript, Bootstrap')])
gate = clase_manual('Gateway', 'gateway', 'Punto de entrada único. Enruta a User-Api, Publication-Api y Soporte-Api.', [('puerto', '8081'), ('tecnología', 'Spring Cloud Gateway'), ('CORS', 'todos los orígenes')])
uapi = clase_manual('User-Api', 'microservicio', 'Cuentas de las personas que publican o contactan, y emisión del JWT.', [('puerto', '8084'), ('responsabilidad', 'usuarios, perfil, dispositivos y autenticación JWT')])
papi = clase_manual('Publication-Api', 'microservicio', 'Solo conecta a compradores con vendedores. No gestiona stock, no regula precios, no cobra ni entrega: eso lo acuerdan las partes.', [('puerto', '8083'), ('responsabilidad', 'publicaciones, catálogo y mensajería entre comprador y vendedor')])
sapi = clase_manual('Soporte-Api', 'microservicio', 'Tickets de soporte con chat para las personas usuarias y panel propio para el personal de soporte.', [('puerto', '8086'), ('responsabilidad', 'tickets, panel del personal y estadísticas de soporte')])
mysql = clase_manual('MySQL (mysql-db)', 'baseDeDatos', None, [('puerto', '3306'), ('esquema usuarios', 'db_usuarios'), ('esquema publicaciones', 'marketroad_db')])
mysql_s = clase_manual('MySQL (mysql-soporte)', 'baseDeDatos', 'Instancia propia: el soporte no comparte base de datos con los otros servicios.', [('puerto', '3306'), ('esquema soporte', 'db_soporte')])
def asoc(a, b, nombre):
    el = {"_type": "UMLAssociation", "_id": nid(), "_parent": ref(vg), "name": nombre}
    el["end1"] = {"_type": "UMLAssociationEnd", "_id": nid(), "_parent": ref(el), "reference": ref(a), "visibility": "public", "navigable": "unspecified", "aggregation": "none", "multiplicity": ""}
    el["end2"] = {"_type": "UMLAssociationEnd", "_id": nid(), "_parent": ref(el), "reference": ref(b), "visibility": "public", "navigable": "navigable", "aggregation": "none", "multiplicity": ""}
    vg['ownedElements'].append(el); return el
rel = [(front, gate, 'HTTP /api/v1/**'), (freact, gate, 'HTTP /api/v1/**'),
       (gate, uapi, rutas_por.get('user-service', '/auth/**, /usuarios/**')), (gate, papi, rutas_por.get('publication-service', '/publicaciones/**')), (gate, sapi, rutas_por.get('soporte-service', '/soporte/**')),
       (uapi, mysql, 'JDBC db_usuarios'), (papi, mysql, 'JDBC marketroad_db'), (sapi, mysql_s, 'JDBC db_soporte')]
elementos_vg = {e['name']: e for e in vg['ownedElements'] if e['_type'] == 'UMLClass'}
asocs = [(a, b, n, asoc(a, b, n)) for a, b, n in rel]
diag = {"_type": "UMLClassDiagram", "_id": nid(), "_parent": ref(vg), "name": "Arquitectura del sistema", "defaultDiagram": True,
        "documentation": "Market-Road es solo un puente entre vendedor y comprador. No gestiona stock, no regula precios y no se hace responsable del producto.", "ownedViews": []}
nodos = {}
for nombre, e in elementos_vg.items():
    nodos[nombre] = Nodo(nombre, e.get('stereotype'), [texto_attr(a['name'], a.get('type'), 'public') for a in e['attributes']], [])
U.layout(nodos, [('assoc', a['name'], b['name'], n, 'nombre') for a, b, n, _ in asocs])
vistas = {n: vista_nodo(diag, elementos_vg[n], nodos[n], False) for n in nodos}
diag['ownedViews'] += list(vistas.values())
aristas = []
for a, b, n, el in asocs:
    pts = U.puntos_arista(nodos[a['name']], nodos[b['name']])
    diag['ownedViews'].append(vista_arista(diag, 'assoc', el, vistas[a['name']], vistas[b['name']], pts))
    aristas.append(('assoc', a['name'], b['name'], n, 'nombre', pts))
ancho = max(n.x + n.w for n in nodos.values()) + 40
txt = ("Market-Road es solo un puente entre vendedor y comprador.\nNo gestiona stock, no regula ni fija precios, no cobra ni procesa pagos, no entrega y no se hace responsable del producto.\n"
       "El precio, el estado del producto y la entrega los define y acuerda cada vendedor con su comprador.")
diag['ownedViews'].append(nota(diag, txt, ancho, 40, 360, 150))
vg['ownedElements'].append(diag)
dibujar_png(os.path.join(IMG, 'Vista general - Arquitectura del sistema.png'), 'Arquitectura del sistema', nodos, aristas, [(ancho, 40, 360, 150, txt.replace('\n', ' '))])
resumen.append(('Vista general', 'Arquitectura del sistema', len(nodos), len(aristas)))

# ---------------------------------------------------------------- ensamblar y guardar
orden = [vg, paquetes_viejos['Frontend'], paquetes['Getaway-Spring'].pkg, paquetes['User-Api'].pkg, paquetes['Publication-Api'].pkg, paquetes['Soporte-Api'].pkg]
for p in orden: p['_parent'] = ref(modelo)
modelo['ownedElements'] = orden
json.dump(viejo, open(MDJ, 'w', encoding='utf8'), indent=2, ensure_ascii=False)

# ---------------------------------------------------------------- verificación de integridad
nuevo = json.load(open(MDJ, encoding='utf8'))
ids = {}
for x in todos(nuevo, []):
    if '_id' in x:
        assert x['_id'] not in ids, 'id duplicado ' + x['_id']
        ids[x['_id']] = x
malas = [r['$ref'] for x in todos(nuevo, []) for r in ([v for v in x.values() if isinstance(v, dict) and '$ref' in v]) if r['$ref'] not in ids]
assert not malas, f'referencias rotas: {malas[:5]}'
print('OK: ids únicos y referencias válidas;', len(ids), 'elementos')
for r in resumen: print(' ', r)
