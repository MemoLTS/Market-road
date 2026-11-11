"""Genera el modelo StarUML (.mdj) y las vistas previas PNG desde el código fuente real."""
import json, math, os, re, secrets, subprocess, sys, textwrap
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(__file__))
from javaparse import parse_servicio

_ids = set()
def nid():
    while True:
        x = secrets.token_urlsafe(16)[:22]
        if x not in _ids:
            _ids.add(x); return x
def ref(e): return {"$ref": e["_id"]}

# ------------------------------------------------------------------ utilidades de tipos
GENERICOS = re.compile(r'[A-Za-z_]\w*')
def identificadores(tipo):
    return GENERICOS.findall(tipo or '')

def es_coleccion(tipo):
    return bool(re.match(r'\s*(List|Set|Collection|Iterable)\s*<', tipo or '')) or (tipo or '').endswith('[]') and 'byte' not in tipo

ESTEREOTIPOS_ANOT = [('RestController', 'controller'), ('RestControllerAdvice', 'exceptionHandler'), ('ControllerAdvice', 'exceptionHandler'),
                     ('Entity', 'entity'), ('Configuration', 'configuration'), ('Service', 'service'), ('Repository', 'repository'),
                     ('ConfigurationProperties', 'configuration')]

def estereotipo(t, pkg):
    if t['kind'] == 'enum': return 'enumeration'
    for a, e in ESTEREOTIPOS_ANOT:
        if a in t['anots']: return e
    if t['kind'] == 'interface' and ('JpaRepository' in t['ext_raw'] or 'Repository' in t['ext_raw'] or 'JpaSpecificationExecutor' in t['ext_raw']):
        return 'repository'
    if t['ext'] in ('HttpFilter', 'OncePerRequestFilter'): return 'filter'
    if t['kind'] == 'record': return 'dto' if pkg == 'dto' else 'record'
    if t['ext'] and t['ext'].endswith('Exception'): return 'exception'
    if 'Component' in t['anots']:
        return 'component'
    return None

def es_getter_setter(m, campos):
    mm = re.match(r'^(get|set|is)([A-Z]\w*)$', m['nombre'])
    if not mm: return False
    n = mm.group(2); n = n[0].lower() + n[1:]
    return any(c['nombre'] == n for c in campos)

def firma(m):
    ps = ', '.join(f'{n}: {t}' for n, t in m['params'])
    r = f": {m['ret']}" if m['ret'] and m['ret'] != 'void' else ''
    v = {'public': '+', 'private': '-', 'protected': '#', 'package': '~'}[m['vis']]
    return f"{v}{m['nombre']}({ps}){r}"

def texto_attr(a_nombre, a_tipo, vis):
    v = {'public': '+', 'private': '-', 'protected': '#', 'package': '~'}[vis]
    return f"{v}{a_nombre}: {a_tipo}" if a_tipo else f"{v}{a_nombre}"

# ------------------------------------------------------------------ modelo
class Servicio:
    def __init__(self, nombre, raiz, raiz_pkg_nombre=None):
        self.nombre = nombre
        self.tipos = parse_servicio(raiz)
        self.por_nombre = {}
        for t in self.tipos:
            self.por_nombre.setdefault(t['nombre'], t)   # las clases se llaman distinto dentro de un servicio
        self.elementos = {}      # nombre -> elemento UML
        self.pkg = None

    def sub(self, t): return t['pkg'].split('.')[-1]

def visible_ops(t):
    ops = []
    for m in t['metodos']:
        if m['ctor'] or m['nombre'] in ('main', 'equals', 'hashCode', 'toString'): continue
        if m['vis'] in ('private',): continue
        if t['kind'] in ('class', 'enum') and m['vis'] == 'package': continue
        if t['kind'] != 'interface' and es_getter_setter(m, t['campos']): continue
        ops.append(m)
    return ops

def visible_attrs(t):
    if t['kind'] == 'record':
        return [(n, ty, 'public') for n, ty in t['comps']]
    out = []
    if t['kind'] == 'enum':
        out += [(c, None, 'public') for c in t['constantes']]
    if t['kind'] != 'interface':
        out += [(c['nombre'], c['tipo'], c['vis']) for c in t['campos'] if not c['static']]
    return out

def crear_clase(t, parent_el):
    k = 'UMLInterface' if t['kind'] == 'interface' else 'UMLClass'
    e = {"_type": k, "_id": nid(), "_parent": ref(parent_el), "name": t['nombre'], "visibility": "public"}
    st = estereotipo(t, t['pkg'].split('.')[-1])
    if st: e["stereotype"] = st
    if t['abstract']: e["isAbstract"] = True
    if t['base'] is not None and 'RestController' in t['anots']:
        e["documentation"] = f"Ruta base: {t['base']}"
    attrs = visible_attrs(t)
    if attrs: e["attributes"] = []
    for n, ty, vis in attrs:
        a = {"_type": "UMLAttribute", "_id": nid(), "_parent": ref(e), "name": n, "visibility": vis}
        if ty: a["type"] = ty
        e["attributes"].append(a)
    ops = visible_ops(t)
    if ops: e["operations"] = []
    for m in ops:
        o = {"_type": "UMLOperation", "_id": nid(), "_parent": ref(e), "name": m['nombre'], "visibility": m['vis']}
        if m['static']: o["isStatic"] = True
        if m['http']:
            met, ruta = m['http']
            o["documentation"] = f"{met or ''} {ruta or ''}".strip()
        o["parameters"] = []
        for n, ty in m['params']:
            o["parameters"].append({"_type": "UMLParameter", "_id": nid(), "_parent": ref(o), "name": n, "type": ty, "direction": "in"})
        if m['ret'] and m['ret'] != 'void':
            o["parameters"].append({"_type": "UMLParameter", "_id": nid(), "_parent": ref(o), "type": m['ret'], "direction": "return"})
        e["operations"].append(o)
    return e

def construir_paquete(svc, nombre_pkg):
    pk = {"_type": "UMLPackage", "_id": nid(), "name": nombre_pkg, "ownedElements": []}
    subs = {}
    for t in svc.tipos:
        s = svc.sub(t)
        if len(svc.tipos) and s == t['pkg'].split('.')[-1] and t['anots'] and 'SpringBootApplication' in t['anots']:
            e = crear_clase(t, pk); e["stereotype"] = "aplicación"; pk["ownedElements"].append(e)
            svc.elementos[t['nombre']] = e; continue
        if s not in subs:
            subs[s] = {"_type": "UMLPackage", "_id": nid(), "_parent": ref(pk), "name": s, "ownedElements": []}
            pk["ownedElements"].append(subs[s])
        e = crear_clase(t, subs[s])
        subs[s]["ownedElements"].append(e)
        svc.elementos[t['nombre']] = e
    svc.pkg = pk
    return pk

# ------------------------------------------------------------------ relaciones
def relaciones(svc):
    """Devuelve lista de (tipo, origen, destino, etiqueta, multiplicidad)."""
    rels, vistos = [], set()
    nombres = set(svc.por_nombre)
    def add(tp, a, b, et='', mult=''):
        if a == b or b not in nombres or a not in nombres: return
        k = (tp, a, b, et)
        if k in vistos: return
        vistos.add(k); rels.append((tp, a, b, et, mult))
    for t in svc.tipos:
        n = t['nombre']
        if t['ext'] and t['ext'] in nombres: add('gen', n, t['ext'])
        for i in t['impl']:
            if i in nombres: add('real', n, i)
        # asociaciones: campos y componentes de record / constantes no
        asociados = set()
        campos = [(c['nombre'], c['tipo']) for c in t['campos'] if not c['static']] + list(t['comps'])
        if t['kind'] == 'interface': campos = []
        for nm, ty in campos:
            for idf in identificadores(ty):
                if idf in nombres and idf != n:
                    add('assoc', n, idf, nm, '*' if es_coleccion(ty) else '1'); asociados.add(idf)
        # repositorios -> entidad
        if estereotipo(t, svc.sub(t)) == 'repository':
            m = re.search(r'<\s*(\w+)', t['ext_raw'])
            if m and m.group(1) in nombres: add('dep', n, m.group(1)); asociados.add(m.group(1))
        # dependencias por firmas de métodos (solo clases con comportamiento)
        if t['kind'] in ('class', 'interface') and estereotipo(t, svc.sub(t)) not in ('entity', 'dto', 'record', 'enumeration'):
            for m in t['metodos']:
                if m['vis'] == 'private' or m['ctor']: continue
                for _, ty in m['params']:
                    for idf in identificadores(ty):
                        if idf in nombres and idf not in asociados: add('dep', n, idf)
                for idf in identificadores(m['ret']):
                    if idf in nombres and idf not in asociados: add('dep', n, idf)
    return rels

def materializar_relaciones(svc, rels):
    """Crea los elementos UML de las relaciones y devuelve dict clave->elemento."""
    out = {}
    for tp, a, b, et, mult in rels:
        ea, eb = svc.elementos[a], svc.elementos[b]
        if tp == 'assoc':
            padre = ea  # StarUML permite poseerla en el paquete; usamos el paquete de la clase origen
            pk = svc.pkg
            el = {"_type": "UMLAssociation", "_id": nid(), "_parent": ref(pk)}
            el["end1"] = {"_type": "UMLAssociationEnd", "_id": nid(), "_parent": ref(el), "reference": ref(ea), "visibility": "public", "navigable": "unspecified", "aggregation": "none", "multiplicity": ""}
            el["end2"] = {"_type": "UMLAssociationEnd", "_id": nid(), "_parent": ref(el), "reference": ref(eb), "visibility": "public", "navigable": "navigable", "aggregation": "none", "multiplicity": mult, "name": et}
            pk["ownedElements"].append(el)
        else:
            k = {'dep': 'UMLDependency', 'gen': 'UMLGeneralization', 'real': 'UMLInterfaceRealization'}[tp]
            el = {"_type": k, "_id": nid(), "_parent": ref(ea), "source": ref(ea), "target": ref(eb)}
            ea.setdefault("ownedElements", []).append(el)
        out[(tp, a, b, et)] = el
    return out

# ------------------------------------------------------------------ medición, layout y dibujo
FUENTE = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FUENTE_B = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FUENTE_I = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf'
F12 = ImageFont.truetype(FUENTE, 12); F12B = ImageFont.truetype(FUENTE_B, 12); F11I = ImageFont.truetype(FUENTE_I, 11)

class Nodo:
    def __init__(self, nombre, estereotipo, attrs, ops, interfaz=False):
        self.nombre, self.est, self.attrs, self.ops, self.interfaz = nombre, estereotipo, attrs, ops, interfaz
        textos = [nombre, f'«{estereotipo}»' if estereotipo else ''] + attrs + ops
        self.w = max(170, int(max(F12.getlength(t) for t in textos) * 0.98) + 34)
        self.h_attr = 10 + 16 * len(attrs); self.h_op = 10 + 16 * len(ops)
        self.h = 44 + self.h_attr + self.h_op
        self.x = self.y = 0

def nodo_desde(svc, nombre):
    t = svc.por_nombre[nombre]
    attrs = [texto_attr(n, ty, vis) for n, ty, vis in visible_attrs(t)]
    ops = [firma(m) for m in visible_ops(t)]
    return Nodo(nombre, estereotipo(t, svc.sub(t)) or ('interface' if t['kind'] == 'interface' else None), attrs, ops, t['kind'] == 'interface')

def layout(nodos, aristas):
    """nodos: dict nombre->Nodo; aristas: [(tp,a,b,...)]. Asigna x,y en píxeles (origen 40,40)."""
    if not aristas or len(aristas) < len(nodos) / 3:
        cols = max(2, int(math.ceil(math.sqrt(len(nodos) * 1.4))))
        ordenados = sorted(nodos.values(), key=lambda n: (n.est or '', n.nombre))
        x = y = 40; fila_h = 0; col = 0
        ancho_max = 2200
        for n in ordenados:
            if x + n.w > ancho_max and col > 0:
                x = 40; y += fila_h + 40; fila_h = 0; col = 0
            n.x, n.y = x, y; x += n.w + 40; fila_h = max(fila_h, n.h); col += 1
        return
    claves = {nombre: f"n{i}" for i, nombre in enumerate(nodos)}
    inversa = {v: k for k, v in claves.items()}
    g = ['digraph G { rankdir=TB; nodesep=0.55; ranksep=0.95; node [shape=box, fixedsize=true, label=""];']
    for n in nodos.values():
        g.append(f'{claves[n.nombre]} [width={n.w / 72:.4f}, height={n.h / 72:.4f}];')
    for tp, a, b, *_ in aristas:
        if tp in ('gen', 'real'): g.append(f'{claves[b]} -> {claves[a]};')   # padre arriba
        else: g.append(f'{claves[a]} -> {claves[b]};')
    g.append('}')
    out = subprocess.run(['dot', '-Tplain'], input='\n'.join(g), capture_output=True, text=True).stdout
    H = 0
    pos = {}
    for ln in out.splitlines():
        p = ln.split()
        if p and p[0] == 'graph': H = float(p[3])
        elif p and p[0] == 'node':
            pos[inversa[p[1]]] = (float(p[2]), float(p[3]))
    for nombre, (cx, cy) in pos.items():
        n = nodos[nombre]; n.x = int(round(cx * 72 - n.w / 2)) + 40; n.y = int(round((H - cy) * 72 - n.h / 2)) + 40

def interseccion(n, hacia):
    """Punto del borde del nodo n en dirección al punto 'hacia'."""
    cx, cy = n.x + n.w / 2, n.y + n.h / 2
    dx, dy = hacia[0] - cx, hacia[1] - cy
    if dx == 0 and dy == 0: return cx, cy
    t = min((n.w / 2) / abs(dx) if dx else 1e9, (n.h / 2) / abs(dy) if dy else 1e9)
    return cx + dx * t, cy + dy * t

def puntos_arista(na, nb, k=0):
    ca, cb = (na.x + na.w / 2, na.y + na.h / 2), (nb.x + nb.w / 2, nb.y + nb.h / 2)
    if k:
        dx, dy = cb[0] - ca[0], cb[1] - ca[1]; L = math.hypot(dx, dy) or 1
        off = (-dy / L * 14 * k, dx / L * 14 * k); ca = (ca[0] + off[0], ca[1] + off[1]); cb = (cb[0] + off[0], cb[1] + off[1])
    p1 = interseccion(na, cb); p2 = interseccion(nb, ca)
    return [(round(p1[0]), round(p1[1])), (round(p2[0]), round(p2[1]))]

# ------------------------------------------------------------------ vistas StarUML
def lab(parent, text, top, left, w, h=13):
    return {"_type": "LabelView", "_id": nid(), "_parent": ref(parent), "left": left, "top": top, "width": w, "height": h, "text": text}

def vista_nodo(diag, elem, n, interfaz):
    v = {"_type": "UMLInterfaceView" if interfaz else "UMLClassView", "_id": nid(), "_parent": ref(diag), "model": ref(elem),
         "containerChangeable": True, "left": n.x, "top": n.y, "width": n.w, "height": n.h}
    nc = {"_type": "UMLNameCompartmentView", "_id": nid(), "_parent": ref(v), "model": ref(elem), "left": n.x, "top": n.y, "width": n.w, "height": 44}
    est = lab(nc, f"«{n.est}»" if n.est else "", n.y + 4, n.x + 4, n.w - 8)
    nm = lab(nc, n.nombre, n.y + 18, n.x + 4, n.w - 8)
    ns = lab(nc, "", n.y + 4, n.x + 4, n.w - 8); pr = lab(nc, "", n.y + 4, n.x + 4, n.w - 8)
    nc["subViews"] = [est, nm, ns, pr]
    nc.update({"stereotypeLabel": ref(est), "nameLabel": ref(nm), "namespaceLabel": ref(ns), "propertyLabel": ref(pr)})
    ac = {"_type": "UMLAttributeCompartmentView", "_id": nid(), "_parent": ref(v), "model": ref(elem), "left": n.x, "top": n.y + 44, "width": n.w, "height": n.h_attr}
    oc = {"_type": "UMLOperationCompartmentView", "_id": nid(), "_parent": ref(v), "model": ref(elem), "left": n.x, "top": n.y + 44 + n.h_attr, "width": n.w, "height": n.h_op}
    rc = {"_type": "UMLReceptionCompartmentView", "_id": nid(), "_parent": ref(v), "model": ref(elem), "left": n.x, "top": n.y + n.h, "width": n.w, "height": 10}
    tc = {"_type": "UMLTemplateParameterCompartmentView", "_id": nid(), "_parent": ref(v), "model": ref(elem), "left": n.x, "top": n.y, "width": n.w, "height": 10}
    v["subViews"] = [nc, ac, oc, rc, tc]
    v.update({"nameCompartment": ref(nc), "attributeCompartment": ref(ac), "operationCompartment": ref(oc),
              "receptionCompartment": ref(rc), "templateParameterCompartment": ref(tc)})
    return v

def etiquetas_borde(view, model, defs):
    labels = []
    for d in defs:
        l = {"_type": "EdgeLabelView", "_id": nid(), "_parent": ref(view), "model": ref(model[d[0]]) if isinstance(model, dict) else ref(model),
             "visible": True, "alpha": d[1], "distance": d[2], "edgePosition": d[3], "text": ""}
        labels.append(l)
    return labels

def vista_arista(diag, tp, model, vtail, vhead, pts, assoc_ends=None):
    tipo = {'assoc': 'UMLAssociationView', 'dep': 'UMLDependencyView', 'gen': 'UMLGeneralizationView', 'real': 'UMLInterfaceRealizationView'}[tp]
    v = {"_type": tipo, "_id": nid(), "_parent": ref(diag), "model": ref(model), "containerChangeable": False,
         "head": ref(vhead), "tail": ref(vtail), "lineStyle": 1, "points": ';'.join(f"{x}:{y}" for x, y in pts), "showVisibility": True}
    H, T = 1.5707963267948966, 0.5235987755982988
    def el(m, alpha, dist, pos):
        return {"_type": "EdgeLabelView", "_id": nid(), "_parent": ref(v), "model": ref(m), "visible": True, "alpha": alpha, "distance": dist, "edgePosition": pos, "text": ""}
    v["subViews"] = []
    nl, sl, pl = el(model, H, 15, 1), el(model, H, 30, 1), el(model, -H, 15, 1)
    v["subViews"] += [nl, sl, pl]
    v.update({"nameLabel": ref(nl), "stereotypeLabel": ref(sl), "propertyLabel": ref(pl)})
    if tp == 'assoc':
        e1, e2 = model["end1"], model["end2"]
        defs = [("tailRoleNameLabel", e1, T, 30, 0), ("tailPropertyLabel", e1, -T, 40, 0), ("tailMultiplicityLabel", e1, -T, 25, 0),
                ("headRoleNameLabel", e2, -T, 30, 2), ("headPropertyLabel", e2, T, 40, 2), ("headMultiplicityLabel", e2, T, 25, 2)]
        for nombre, m, alpha, dist, pos in defs:
            l = el(m, alpha, dist, pos); v["subViews"].append(l); v[nombre] = ref(l)
        for nombre, m in (("tailQualifiersCompartment", e1), ("headQualifiersCompartment", e2)):
            q = {"_type": "UMLQualifierCompartmentView", "_id": nid(), "_parent": ref(v), "model": ref(m)}
            v["subViews"].append(q); v[nombre] = ref(q)
    return v

def nota(diag, texto, x, y, w, h):
    return {"_type": "NoteView", "_id": nid(), "_parent": ref(diag), "containerChangeable": True, "left": x, "top": y, "width": w, "height": h, "text": texto}

# ------------------------------------------------------------------ diagrama completo
class Diagrama:
    def __init__(self, svc, nombre, clases, nota_txt=None, documentacion=None):
        self.svc, self.nombre, self.clases, self.nota, self.doc = svc, nombre, clases, nota_txt, documentacion
        self.nodos = {}
        self.vistas_nodo = {}
        self.aristas = []

def armar_diagrama(svc, d, rels, elems_rel, default=False):
    pk = svc.pkg
    diag = {"_type": "UMLClassDiagram", "_id": nid(), "_parent": ref(pk), "name": d.nombre}
    if default: diag["defaultDiagram"] = True
    if d.doc: diag["documentation"] = d.doc
    diag["ownedViews"] = []
    for c in d.clases:
        d.nodos[c] = nodo_desde(svc, c)
    sel = [r for r in rels if r[1] in d.nodos and r[2] in d.nodos]
    layout(d.nodos, sel)
    # nota arriba a la derecha
    for c, n in d.nodos.items():
        v = vista_nodo(diag, svc.elementos[c], n, n.interfaz)
        diag["ownedViews"].append(v); d.vistas_nodo[c] = v
    pares = {}
    for r in sel:
        tp, a, b, et, mult = r
        k = pares.get(frozenset((a, b)), 0); pares[frozenset((a, b))] = k + 1
        pts = puntos_arista(d.nodos[a], d.nodos[b], (k + 1) // 2 * (1 if k % 2 else -1) if k else 0)
        el = elems_rel[(tp, a, b, et)]
        diag["ownedViews"].append(vista_arista(diag, tp, el, d.vistas_nodo[a], d.vistas_nodo[b], pts))
        d.aristas.append((tp, a, b, et, mult, pts))
    d.n_nota = None
    if d.nota:
        ancho = max(n.x + n.w for n in d.nodos.values()) + 40
        d.n_nota = (ancho, 40, 330, 20 + 16 * len(textwrap.wrap(d.nota, 52)))
        diag["ownedViews"].append(nota(diag, d.nota, *d.n_nota))
    d.elem = diag
    return diag

# ------------------------------------------------------------------ PNG
def flecha(draw, p1, p2, tipo, relleno_hueco=True):
    """Dibuja la cabeza en p2 viniendo desde p1."""
    dx, dy = p2[0] - p1[0], p2[1] - p1[1]; L = math.hypot(dx, dy) or 1; ux, uy = dx / L, dy / L
    px, py = -uy, ux
    if tipo in ('gen', 'real'):
        a = (p2[0] - ux * 14 + px * 8, p2[1] - uy * 14 + py * 8); b = (p2[0] - ux * 14 - px * 8, p2[1] - uy * 14 - py * 8)
        draw.polygon([p2, a, b], fill='white', outline='black')
    else:
        a = (p2[0] - ux * 11 + px * 6, p2[1] - uy * 11 + py * 6); b = (p2[0] - ux * 11 - px * 6, p2[1] - uy * 11 - py * 6)
        draw.line([a, p2, b], fill='black', width=1)

def linea(draw, p1, p2, punteada):
    if not punteada:
        draw.line([p1, p2], fill='black', width=1); return
    dx, dy = p2[0] - p1[0], p2[1] - p1[1]; L = math.hypot(dx, dy) or 1; n = int(L // 8)
    for i in range(n):
        if i % 2 == 0:
            a = (p1[0] + dx * i / n, p1[1] + dy * i / n); b = (p1[0] + dx * (i + 1) / n, p1[1] + dy * (i + 1) / n)
            draw.line([a, b], fill='black', width=1)

def dibujar_png(ruta, titulo, nodos, aristas, notas=()):
    W = int(max([n.x + n.w for n in nodos.values()] + [x + w for x, y, w, h, t in notas] + [300])) + 50
    H = int(max([n.y + n.h for n in nodos.values()] + [y + h for x, y, w, h, t in notas] + [100])) + 50
    img = Image.new('RGB', (W, H), 'white'); dr = ImageDraw.Draw(img)
    for tp, a, b, et, mult, pts in aristas:
        p1, p2 = pts[0], pts[-1]
        linea(dr, p1, p2, tp in ('dep', 'real'))
        flecha(dr, p1, p2, tp)
        if tp == 'assoc' and et and mult == 'nombre':
            mx, my = (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2
            tw = F12.getlength(et); dr.rectangle([mx - tw / 2 - 3, my - 9, mx + tw / 2 + 3, my + 9], fill='white'); dr.text((mx - tw / 2, my - 7), et, fill='#222222', font=F12)
        elif tp == 'assoc' and et:
            dx, dy = p2[0] - p1[0], p2[1] - p1[1]; L = math.hypot(dx, dy) or 1
            tx, ty = p2[0] - dx / L * 28 + (-dy / L) * 9, p2[1] - dy / L * 28 + (dx / L) * 9
            dr.text((tx - F12.getlength(et) / 2 if abs(dx) < abs(dy) else tx - F12.getlength(et) / 2, ty - 6), et + (f' [{mult}]' if mult == '*' else ''), fill='#333333', font=F12)
    for n in nodos.values():
        dr.rectangle([n.x, n.y, n.x + n.w, n.y + n.h], fill='white', outline='black')
        dr.line([n.x, n.y + 44, n.x + n.w, n.y + 44], fill='black'); dr.line([n.x, n.y + 44 + n.h_attr, n.x + n.w, n.y + 44 + n.h_attr], fill='black')
        cx = n.x + n.w / 2
        if n.est:
            t = f'«{n.est}»'; dr.text((cx - F11I.getlength(t) / 2, n.y + 6), t, fill='black', font=F11I)
        dr.text((cx - F12B.getlength(n.nombre) / 2, n.y + 22), n.nombre, fill='black', font=F12B)
        for i, t in enumerate(n.attrs): dr.text((n.x + 8, n.y + 44 + 6 + 16 * i), t, fill='black', font=F12)
        for i, t in enumerate(n.ops): dr.text((n.x + 8, n.y + 44 + n.h_attr + 6 + 16 * i), t, fill='black', font=F12)
    for x, y, w, h, t in notas:
        dr.rectangle([x, y, x + w, y + h], fill='#FFFFCC', outline='#999966')
        for i, ln in enumerate(textwrap.wrap(t, 52)): dr.text((x + 8, y + 8 + 16 * i), ln, fill='black', font=F12)
    img.save(ruta)
