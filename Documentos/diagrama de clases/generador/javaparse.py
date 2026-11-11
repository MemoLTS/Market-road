"""Analizador mínimo de código Java (sin dependencias) para extraer la estructura de clases."""
import os, re

MODS = {'public', 'private', 'protected', 'static', 'final', 'abstract', 'synchronized', 'default', 'sealed', 'native', 'transient', 'volatile', 'strictfp'}


def limpiar(src):
    """Quita comentarios y reemplaza el contenido de strings/chars por vacío (conserva las comillas)."""
    out, i, n = [], 0, len(src)
    while i < n:
        c = src[i]
        if src.startswith('//', i):
            j = src.find('\n', i); i = n if j < 0 else j
        elif src.startswith('/*', i):
            j = src.find('*/', i + 2); i = n if j < 0 else j + 2
        elif src.startswith('"""', i):
            j = src.find('"""', i + 3); i = n if j < 0 else j + 3; out.append('""')
        elif c == '"':
            j = i + 1
            while j < n and src[j] != '"':
                j += 2 if src[j] == '\\' else 1
            # conserva el texto de strings cortos para leer rutas de @Mapping
            out.append('"' + src[i + 1:j] + '"'); i = j + 1
        elif c == "'":
            j = i + 1
            while j < n and src[j] != "'":
                j += 2 if src[j] == '\\' else 1
            out.append("''"); i = j + 1
        else:
            out.append(c); i += 1
    return ''.join(out)


def balanceado(s, i, ab, ce):
    """Devuelve el índice del cierre que balancea s[i]==ab."""
    d = 0
    for j in range(i, len(s)):
        if s[j] == ab: d += 1
        elif s[j] == ce:
            d -= 1
            if d == 0: return j
    return len(s) - 1


def separar_anotaciones(h):
    """Devuelve (lista de (nombre, args), texto sin anotaciones)."""
    anots, out, i = [], [], 0
    while i < len(h):
        if h[i] == '@' and i + 1 < len(h) and (h[i + 1].isalpha()):
            m = re.match(r'@([\w.]+)', h[i:]); nombre = m.group(1); i += m.end()
            k = i
            while k < len(h) and h[k].isspace(): k += 1
            args = ''
            if k < len(h) and h[k] == '(':
                e = balanceado(h, k, '(', ')'); args = h[k + 1:e]; i = e + 1
            anots.append((nombre.split('.')[-1], args))
        else:
            out.append(h[i]); i += 1
    return anots, ''.join(out)


def dividir_top(s, sep=','):
    partes, d, ini = [], 0, 0
    for i, c in enumerate(s):
        if c in '<([{': d += 1
        elif c in '>)]}': d -= 1
        elif c == sep and d == 0:
            partes.append(s[ini:i]); ini = i + 1
    partes.append(s[ini:])
    return [p.strip() for p in partes if p.strip()]


def tipo_nombre(h):
    """'final Map<String, List<X>> nombre' -> ('Map<String, List<X>>', 'nombre')."""
    h = re.sub(r'\s+', ' ', h.strip())
    d = 0
    for i in range(len(h) - 1, -1, -1):
        c = h[i]
        if c == '>': d += 1
        elif c == '<': d -= 1
        elif c == ' ' and d == 0:
            return h[:i].strip(), h[i + 1:].strip()
    return '', h


def quitar_mods(h):
    toks, mods = h.split(), []
    while toks and toks[0] in MODS:
        mods.append(toks.pop(0))
    return mods, ' '.join(toks)


def visibilidad(mods):
    for v in ('public', 'private', 'protected'):
        if v in mods: return v
    return 'package'


def ruta_mapping(anots):
    for n, a in anots:
        if n in ('GetMapping', 'PostMapping', 'PutMapping', 'PatchMapping', 'DeleteMapping', 'RequestMapping'):
            m = re.search(r'"([^"]*)"', a)
            ruta = m.group(1) if m else ''
            metodo = {'GetMapping': 'GET', 'PostMapping': 'POST', 'PutMapping': 'PUT', 'PatchMapping': 'PATCH', 'DeleteMapping': 'DELETE'}.get(n)
            if n == 'RequestMapping':
                mm = re.search(r'RequestMethod\.(\w+)', a); metodo = mm.group(1) if mm else None
            return metodo, ruta
    return None, None


def miembros(cuerpo, nombre_tipo, kind):
    """Recorre el cuerpo (sin llaves externas) y devuelve campos, métodos, constantes y tipos anidados."""
    campos, metodos, constantes, anidados = [], [], [], []
    i, n = 0, len(cuerpo)
    if kind == 'enum':
        # constantes hasta el primer ';' de nivel 0 (o fin)
        d, j = 0, 0
        while j < n:
            c = cuerpo[j]
            if c in '({': d += 1
            elif c in ')}': d -= 1
            elif c == ';' and d == 0: break
            j += 1
        bloque = cuerpo[:j]
        for p in dividir_top(bloque):
            _, sin = separar_anotaciones(p)
            m = re.match(r'\s*(\w+)', sin)
            if m: constantes.append(m.group(1))
        i = j + 1
    ini = i
    while i < n:
        c = cuerpo[i]
        if c == ';' or c == '{' or c == '=':
            cab = cuerpo[ini:i]
            if c == '=':   # inicializador de campo: salta hasta ';'
                d, j = 0, i
                while j < n:
                    if cuerpo[j] in '({[': d += 1
                    elif cuerpo[j] in ')}]': d -= 1
                    elif cuerpo[j] == ';' and d == 0: break
                    j += 1
                i = j; c = ';'
            if c == '{':
                e = balanceado(cuerpo, i, '{', '}')
                if cab.strip() == '' or cab.strip().endswith(('static', 'static ')):   # bloque inicializador
                    i = e + 1; ini = i; continue
                anots, sin = separar_anotaciones(cab)
                mods, resto = quitar_mods(sin)
                if re.match(r'(class|interface|enum|record|@interface)\b', resto):
                    anidados.append((anots, mods, resto, cuerpo[i + 1:e])); i = e + 1; ini = i; continue
                _registrar(anots, mods, resto, nombre_tipo, kind, campos, metodos)
                i = e + 1; ini = i; continue
            anots, sin = separar_anotaciones(cab)
            mods, resto = quitar_mods(sin)
            if resto:
                _registrar(anots, mods, resto, nombre_tipo, kind, campos, metodos)
            i += 1; ini = i; continue
        if c == '(':
            i = balanceado(cuerpo, i, '(', ')') + 1; continue
        i += 1
    return campos, metodos, constantes, anidados


def _registrar(anots, mods, resto, nombre_tipo, kind, campos, metodos):
    if '(' in resto:
        pos = resto.index('(')
        cab = resto[:pos].strip()
        e = balanceado(resto, pos, '(', ')')
        params_txt = resto[pos + 1:e]
        tipo, nombre = tipo_nombre(cab)
        if cab.startswith('<'):   # método genérico <T> T nombre
            g = balanceado(cab, 0, '<', '>'); cab2 = cab[g + 1:].strip(); tipo, nombre = tipo_nombre(cab2)
        es_ctor = (tipo == '' and nombre == nombre_tipo)
        params = []
        for p in dividir_top(params_txt):
            _, psin = separar_anotaciones(p)
            _, psin = quitar_mods(psin)
            t, nm = tipo_nombre(psin)
            params.append((nm, t))
        metodo, ruta = ruta_mapping(anots)
        vis = visibilidad(mods)
        if kind == 'interface' and vis == 'package': vis = 'public'
        metodos.append(dict(nombre=nombre, ret=tipo or None, params=params, vis=vis, ctor=es_ctor, static='static' in mods,
                            http=(metodo, ruta) if (metodo or ruta) else None, anots=[a for a, _ in anots]))
    else:
        t, nm = tipo_nombre(resto)
        if t and nm and re.match(r'^\w+$', nm):
            campos.append(dict(nombre=nm, tipo=t, vis=visibilidad(mods), static='static' in mods, final='final' in mods,
                               anots=[a for a, _ in anots]))


def parse_tipo(anots, mods, cab, cuerpo, pkg):
    m = re.match(r'(class|interface|enum|record)\s+(\w+)(.*)$', cab, re.S)
    if not m: return None
    kind, nombre, resto = m.groups()
    comps = []
    if kind == 'record':
        r = resto.lstrip()
        if r.startswith('<'):
            g = balanceado(r, 0, '<', '>'); r = r[g + 1:].lstrip()
        if r.startswith('('):
            e = balanceado(r, 0, '(', ')')
            for p in dividir_top(r[1:e]):
                _, psin = separar_anotaciones(p)
                t, nm = tipo_nombre(psin)
                comps.append((nm, t))
            resto = r[e + 1:]
    ext, impl, ext_raw = None, [], ''
    me = re.search(r'\bextends\s+(.+?)(?=\bimplements\b|$)', resto, re.S)
    mi = re.search(r'\bimplements\s+(.+)$', resto, re.S)
    if me: ext_raw = me.group(1).strip()
    if kind == 'interface':
        if me: impl = [re.sub(r'<.*', '', x).strip() for x in dividir_top(me.group(1))]
    else:
        if me: ext = re.sub(r'<.*', '', me.group(1).strip()).strip()
        if mi: impl = [re.sub(r'<.*', '', x).strip() for x in dividir_top(mi.group(1))]
    campos, metodos, consts, _ = miembros(cuerpo, nombre, kind)
    base = None
    for a, args in anots:
        if a == 'RequestMapping':
            mm = re.search(r'"([^"]*)"', args); base = mm.group(1) if mm else None
    return dict(pkg=pkg, nombre=nombre, kind=kind, anots=[a for a, _ in anots], base=base, ext=ext, ext_raw=ext_raw, impl=impl,
                campos=campos, metodos=metodos, constantes=consts, comps=comps, abstract='abstract' in mods)


def parse_archivo(ruta):
    src = limpiar(open(ruta, encoding='utf8').read())
    m = re.search(r'^\s*package\s+([\w.]+)\s*;', src, re.M)
    pkg = m.group(1) if m else ''
    tipos, i = [], 0
    # tipos de nivel superior: busca cabeceras 'class|interface|enum|record Nombre ... {' en profundidad 0
    d, ini, n = 0, 0, len(src)
    j, pd = 0, 0
    while j < n:
        c = src[j]
        if c == '(':
            pd += 1
        elif c == ')':
            pd -= 1
        if c == '{' and pd > 0:      # llaves dentro de una anotación, p. ej. @Table(indexes = {...})
            j += 1; continue
        if c == '{':
            cab = src[ini:j]
            e = balanceado(src, j, '{', '}')
            anots, sin = separar_anotaciones(cab)
            sin = re.sub(r'^\s*(import\s+[^;]+;\s*)*', '', re.sub(r'package\s+[\w.]+\s*;', '', sin))
            sin = re.sub(r'import\s+[^;]+;', '', sin)
            mods, resto = quitar_mods(sin.strip())
            if re.match(r'(class|interface|enum|record)\s+\w+', resto):
                t = parse_tipo(anots, mods, resto, src[j + 1:e], pkg)
                if t: tipos.append(t)
            j = e + 1; ini = j; pd = 0; continue
        if c == ';' and pd == 0:
            ini = j + 1
        j += 1
    return tipos


def parse_servicio(raiz):
    res = []
    for dp, _, fs in os.walk(raiz):
        for f in sorted(fs):
            if f.endswith('.java'):
                res += parse_archivo(os.path.join(dp, f))
    return res
