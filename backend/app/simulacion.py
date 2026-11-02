
"""Motor de escenarios acotado. No enumera 3**partidos resultados.

Usa la tabla actual y los fixtures pendientes disponibles. Devuelve ejemplos
válidos encontrados por muestreo, NO todos los escenarios posibles.
"""
from __future__ import annotations

from copy import deepcopy
from collections import Counter
import hashlib
import random


def normalizar(nombre):
    import re
    import unicodedata
    nombre = unicodedata.normalize('NFKD', str(nombre))
    nombre = ''.join(c for c in nombre if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', '_', nombre.lower()).strip('_')


def preparar_tabla(tabla):
    grupos = {}
    if isinstance(tabla, dict):
        for grupo, equipos in tabla.items():
            for equipo in equipos:
                fila = deepcopy(equipo)
                fila['group'] = grupo
                grupos[normalizar(fila.get('team_normalized') or fila.get('team', ''))] = grupo
    else:
        for equipo in tabla:
            grupo = equipo.get('group')
            grupos[normalizar(equipo.get('team_normalized') or equipo.get('team', ''))] = grupo
    filas = [deepcopy(e) for arr in tabla.values() for e in arr] if isinstance(tabla, dict) else deepcopy(tabla)
    for idx, e in enumerate(filas, 1):
        e['team_normalized'] = normalizar(e.get('team_normalized') or (e['team']['name'] if isinstance(e.get('team'), dict) else e.get('team', '')))
        if isinstance(e.get('team'), dict):
            e['team'] = e['team']['name']
        e['group'] = grupos.get(e['team_normalized'])
        e['played'] = int(e.get('played', e.get('playedGames', 0)))
        e['won'] = int(e.get('won', 0))
        e['draw'] = int(e.get('draw', 0))
        e['lost'] = int(e.get('lost', 0))
        e['points'] = int(e.get('points', 0))
        e['goalDifference'] = e.get('goalDifference')
        if e['goalDifference'] is None:
            gf, gc = e.get('goalsFor'), e.get('goalsAgainst')
            e['goalDifference'] = (int(gf) - int(gc)) if gf is not None and gc is not None else None
        e['_orden_original'] = e.get('rank') or e.get('position') or idx
    return filas, grupos


def seleccionar_partidos(fixtures, fechas, grupos, equipo_objetivo):
    """Si hay matchday, selecciona las primeras N fechas pendientes.
    Sin matchday, toma por orden los primeros N partidos por equipo,
    sin duplicar ni exceder la cuota de ninguno.
    """
    fixtures = [f for f in fixtures if f.get('home_team') and f.get('away_team')]
    if grupos.get(equipo_objetivo) is not None:
        g = grupos[equipo_objetivo]
        fixtures = [f for f in fixtures if grupos.get(normalizar(f['home_team'])) == g
                    and grupos.get(normalizar(f['away_team'])) == g]
    if fixtures and all(f.get('matchday') is not None for f in fixtures):
        dias = sorted(set(int(f['matchday']) for f in fixtures))[:fechas]
        return [f for f in fixtures if int(f['matchday']) in dias]
    conteos = {}
    seleccionados = []
    for f in fixtures:
        a, b = normalizar(f['home_team']), normalizar(f['away_team'])
        if conteos.get(a, 0) >= fechas or conteos.get(b, 0) >= fechas:
            continue
        seleccionados.append(f)
        conteos[a] = conteos.get(a, 0) + 1
        conteos[b] = conteos.get(b, 0) + 1
    return seleccionados


def filtrar_partidos_relevantes(partidos, tabla, equipo_objetivo, grupo,
                                max_equipos_involucrados=8):
    """Conserva solo los encuentros que pueden influir en la posición objetivo.

    Un equipo es competidor si su intervalo posible de puntos en esta ventana
    se solapa con el del elegido. Se priorizan encuentros del objetivo y cruces
    directos, y se limita el número de participantes (8 por defecto).
    En un encuentro seleccionado se actualizan SIEMPRE los dos participantes,
    incluso si uno de ellos no compite directamente por la posición. De otro
    modo la simulación regalaría o quitaría puntos de manera inconsistente.
    """
    equipos = {
        e['team_normalized']: e for e in tabla
        if grupo is None or e.get('group') == grupo
    }
    conteos = Counter()
    for p in partidos:
        conteos[normalizar(p['home_team'])] += 1
        conteos[normalizar(p['away_team'])] += 1

    puntos_objetivo = equipos[equipo_objetivo]['points']
    max_objetivo = puntos_objetivo + 3 * conteos[equipo_objetivo]
    competidores = {equipo_objetivo}
    for nombre, fila in equipos.items():
        puntos_actuales = fila['points']
        max_puntos = puntos_actuales + 3 * conteos[nombre]
        if puntos_actuales <= max_objetivo and max_puntos >= puntos_objetivo:
            competidores.add(nombre)

    relevantes = [
        p for p in partidos
        if normalizar(p['home_team']) in competidores
        or normalizar(p['away_team']) in competidores
    ]

    # Prioridad 1: partidos del equipo elegido.
    # Prioridad 2: cruces entre competidores cercanos en puntos.
    # Prioridad 3: partidos de un competidor contra otro equipo.
    # Esto mantiene acotado el número de equipos que realmente se actualiza.
    def prioridad(p):
        a, b = normalizar(p['home_team']), normalizar(p['away_team'])
        if equipo_objetivo in (a, b):
            clase = 0
        elif a in competidores and b in competidores:
            clase = 1
        else:
            clase = 2
        distancia = min(abs(equipos[e]['points'] - puntos_objetivo)
                        for e in (a, b) if e in competidores)
        return clase, distancia

    ordenados = sorted(enumerate(relevantes), key=lambda x: (*prioridad(x[1]), x[0]))
    ids_elegidos = set()
    participantes = set()
    for _, p in ordenados:
        a, b = normalizar(p['home_team']), normalizar(p['away_team'])
        nuevos = participantes | {a, b}
        if len(nuevos) > max_equipos_involucrados:
            continue
        ids_elegidos.add(p['match_id'])
        participantes = nuevos

    seleccionados = [p for p in relevantes if p['match_id'] in ids_elegidos]
    return seleccionados, competidores, participantes


def _ordenar(filas, grupo):
    scope = [e for e in filas if grupo is None or e.get('group') == grupo]
    return sorted(scope, key=lambda e: (
        -e['points'],
        -(e['goalDifference'] if e['goalDifference'] is not None else -999999),
        -(e['goalsFor'] if e.get('goalsFor') is not None else -999999),
        e['_orden_original'],
    ))


def simular_torneo(tabla, fixtures, equipo, min_pos, max_pos, fechas, detallado=False,
                   max_escenarios=15, intentos=4500, max_equipos_involucrados=8):
    if fechas < 1 or fechas > 30 or min_pos < 1 or max_pos < min_pos:
        raise ValueError('Revisá la cantidad de fechas y el rango de posiciones (1 a 30 fechas).')
    if max_equipos_involucrados < 2:
        raise ValueError('Se necesitan al menos 2 equipos para simular un partido.')
    base, grupos = preparar_tabla(tabla)
    objetivo = normalizar(equipo)
    equipos = {e['team_normalized'] for e in base}
    if objetivo not in equipos:
        raise ValueError(f'No existe el equipo {equipo} en este torneo.')
    grupo = grupos.get(objetivo)
    candidatos = [e for e in base if grupo is None or grupos.get(e['team_normalized']) == grupo]
    if max_pos > len(candidatos):
        raise ValueError(f'La posición máxima para este torneo/grupo es {len(candidatos)}.')
    ventana = seleccionar_partidos(fixtures, fechas, grupos, objetivo)
    for p in ventana:
        if normalizar(p['home_team']) not in equipos or normalizar(p['away_team']) not in equipos:
            raise ValueError('Hay un enfrentamiento con un equipo que no figura en la tabla.')
    partidos, competidores, participantes = filtrar_partidos_relevantes(
        ventana, base, objetivo, grupo, max_equipos_involucrados
    )
    if not partidos:
        return {
            'resultados': [], 'escenarios_evaluados': 0,
            'partidos_en_ventana': len(ventana), 'partidos_simulados': 0,
            'equipos_competidores': sorted(competidores),
            'equipos_involucrados': [],
            'mensaje': 'No hay partidos relevantes que simular en el período solicitado.',
            'metodo': 'muestreo',
        }
    semilla = f'{objetivo}:{min_pos}:{max_pos}:{fechas}:{detallado}:' + ','.join(str(p['match_id']) for p in partidos)
    rng = random.Random(int(hashlib.sha256(semilla.encode()).hexdigest()[:16], 16))
    opciones = ('gana_local', 'empate', 'gana_visitante')
    encontrados, vistos = [], set()
    evaluados = 0
    for intento in range(intentos):
        actual = {e['team_normalized']: deepcopy(e) for e in base}
        escenario = []
        firma = []
        for p in partidos:
            local, visita = normalizar(p['home_team']), normalizar(p['away_team'])
            # Mezcla escenarios exploratorios y algunos favorables al objetivo.
            sesgo = intento % 4 != 0
            if sesgo and objetivo == local:
                resultado = rng.choices(opciones, weights=[7, 2, 1])[0]
            elif sesgo and objetivo == visita:
                resultado = rng.choices(opciones, weights=[1, 2, 7])[0]
            else:
                resultado = rng.choice(opciones)
            if detallado:
                gl, gv = rng.randrange(4), rng.randrange(4)
                if resultado == 'gana_local':
                    gl = max(gl, gv + 1)
                elif resultado == 'gana_visitante':
                    gv = max(gv, gl + 1)
                else:
                    gl = gv
                # Tope explícito de goles dentro de 0..6.
                gl, gv = min(gl, 6), min(gv, 6)
            else:
                gl = gv = None
            a, b = actual[local], actual[visita]
            a['played'] += 1
            b['played'] += 1
            a['modificado'] = b['modificado'] = True
            if resultado == 'gana_local':
                a['won'] += 1; b['lost'] += 1; a['points'] += 3
            elif resultado == 'gana_visitante':
                b['won'] += 1; a['lost'] += 1; b['points'] += 3
            else:
                a['draw'] += 1; b['draw'] += 1
                a['points'] += 1; b['points'] += 1
            if detallado:
                if a.get('goalsFor') is not None:
                    a['goalsFor'] += gl; a['goalsAgainst'] += gv
                if b.get('goalsFor') is not None:
                    b['goalsFor'] += gv; b['goalsAgainst'] += gl
                if a['goalDifference'] is not None:
                    a['goalDifference'] += gl - gv
                if b['goalDifference'] is not None:
                    b['goalDifference'] += gv - gl
            escenario.append({
                'partido_id': p['match_id'],
                'equipo_local': local,
                'equipo_visitante': visita,
                'resultado': resultado,
                'goles_local': gl,
                'goles_visitante': gv,
            })
            firma.append((p['match_id'], resultado, gl, gv))
        evaluados += 1
        orden = _ordenar(list(actual.values()), grupo)
        pos = next(i for i, e in enumerate(orden, 1) if e['team_normalized'] == objetivo)
        if not min_pos <= pos <= max_pos:
            continue
        clave = tuple(firma)
        if clave in vistos:
            continue
        vistos.add(clave)
        ranking = []
        for i, item in enumerate(orden, 1):
            item.pop('_orden_original', None)
            item['rank'] = item['position'] = i
            item['equipo'] = item['team_normalized']
            item['puntos'] = item['points']
            ranking.append(item)
        encontrados.append({'escenario': escenario, 'ranking': ranking})
        if len(encontrados) >= max_escenarios:
            break
    resumen = (f'Se simularon {len(partidos)} de {len(ventana)} partidos de la ventana; '
               f'se actualizaron únicamente {len(participantes)} equipos involucrados '
               f'(límite configurado: {max_equipos_involucrados}). '
               'Los demás conservaron sus estadísticas. ')
    return {
        'resultados': encontrados,
        'escenarios_evaluados': evaluados,
        'metodo': 'muestreo',
        'partidos_en_ventana': len(ventana),
        'partidos_simulados': len(partidos),
        'equipos_competidores': sorted(competidores),
        'equipos_involucrados': sorted(participantes),
        'max_equipos_involucrados': max_equipos_involucrados,
        'desempate_aproximado': any(e.get('goalsFor') is None for e in base),
        'mensaje': resumen + ('Escenarios encontrados mediante muestreo; no son todos los posibles.'
                               if encontrados else 'No se encontraron escenarios en la muestra. Eso no demuestra que sean imposibles.'),
    }
