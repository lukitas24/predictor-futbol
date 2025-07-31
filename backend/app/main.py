from fastapi import FastAPI, HTTPException
from pyswip import Prolog
from pathlib import Path
from ast import literal_eval
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import Dict, Any, List
import random

import requests
import os
import re
import ast


# === CARGA .env ===
load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === CONFIGURACIÓN API EXTERNA ===
API_KEY = os.getenv("FOOTBALL_DATA_KEY")
BASE_URL = "https://api.football-data.org/v4"
headers = {"X-Auth-Token": API_KEY}

# === MAPEO ID → Nombre Liga ===
LEAGUE_ID_TO_NAME = {
    2021: "Premier League",
    2002: "Bundesliga",
    2014: "La Liga",
    2019: "Serie A",
    2015: "Ligue 1",
    2001: "UEFA Champions League",
    9999: "Mundial de Clubes",
    9998: "Copa UNPSJB"
}

# === CACHÉ GLOBAL ===
cache_datos_liga = {}

def nombre_formato(nombre):
    nombre = nombre.strip().lower().replace(" ", "_").replace(".", "_")
    nombre = re.sub(r'[^a-z0-9_]', '', nombre)  # elimina todo lo que no sea letra, número o guión bajo
    nombre = nombre.replace("__", "_")
    return nombre 

def escribir_equipo(f, nombre, puntos, gf, gc, grupo_num=None):
    if grupo_num is not None:
        f.write(f"grupo({nombre}, {grupo_num}).\n")
    f.write(f"puntos({nombre}, {puntos}).\n")
    f.write(f"goles({nombre}, {gf}, {gc}).\n")

def escribir_partido(f, partido):
    id = partido.get("match_id") or partido.get("fixture_id") or partido.get("id")
    local = nombre_formato(partido["home_team"])
    visitante = nombre_formato(partido["away_team"])
    f.write(f"partido({id}, {local}, {visitante}).\n")

def guardar_hechos_prolog_por_liga(league_name: str, tabla=None, fixtures=None):
    fixtures = fixtures or []

    nombre_archivo = f"datos_{nombre_formato(league_name)}.pl"
    base_dir = Path(__file__).resolve().parent
    carpeta_prolog = base_dir / "prolog"
    carpeta_prolog.mkdir(exist_ok=True)
    ruta_archivo = carpeta_prolog / nombre_archivo

    with open(ruta_archivo, 'w', encoding='utf-8') as f:
        if tabla:
            if isinstance(tabla, dict):  # Fase de grupos
                for grupo_letra, equipos in tabla.items():
                    grupo_num = ord(grupo_letra.upper()) - ord('A') + 1
                    for equipo in equipos:
                        nombre = equipo["team_normalized"]
                        escribir_equipo(f, nombre, equipo["points"], equipo["goalsFor"], equipo["goalsAgainst"], grupo_num)
            else:  # Tabla plana
                for equipo in tabla:
                    if isinstance(equipo["team"], dict):
                        nombre = nombre_formato(equipo["team"]["name"])
                    else:
                        nombre = nombre_formato(equipo["team"])
                    escribir_equipo(f, nombre, equipo["points"], equipo["goalsFor"], equipo["goalsAgainst"])
        
        f.write("\n")
        
        for partido in fixtures:
            escribir_partido(f, partido)
            
def ordenar_tabla_y_posicionar(tabla: list) -> list:
    tabla.sort(key=lambda e: (e["points"], e["goalsFor"] - e["goalsAgainst"], e["goalsFor"]), reverse=True)
    for idx, equipo in enumerate(tabla, start=1):
        equipo["position"] = idx
    return tabla

def agrupar_por_grupo(tabla: list) -> dict:
    grupos = {}
    for equipo in tabla:
        grupo = equipo["group"]
        grupos.setdefault(grupo, []).append(equipo)
    for grupo, equipos in grupos.items():
        grupos[grupo] = ordenar_tabla_y_posicionar(equipos)
    return grupos

def asegurar_cache(league_name: str):
    if league_name not in cache_datos_liga:
        cache_datos_liga[league_name] = {"tabla": None, "fixtures": None}


# === ENDPOINT: Tabla ===
@app.get("/tabla/leagues/{league_id}")
def get_standings(league_id: int, season: str = None):
    try:
        if league_id == 9999:
            league_name = "Mundial de Clubes"
            asegurar_cache(league_name)
            grupos = agrupar_por_grupo(get_tabla_custom())
            cache_datos_liga[league_name]["tabla"] = grupos
            guardar_hechos_prolog_por_liga(league_name, tabla=grupos, fixtures=cache_datos_liga[league_name]["fixtures"])
            return {"group_stage": True, "league_name": league_name, "season": season, "groups": grupos}

        if league_id == 9998:
            league_name = "Copa UNPSJB"
            asegurar_cache(league_name)
            tabla = ordenar_tabla_y_posicionar(get_tabla_custom2())
            cache_datos_liga[league_name]["tabla"] = tabla
            guardar_hechos_prolog_por_liga(league_name, tabla=tabla, fixtures=cache_datos_liga[league_name]["fixtures"])
            return {
                "group_stage": False,
                "league_name": league_name,
                "season": season or 2025,
                "tabla": [
                    {
                        "rank": team["position"],
                        "team": team["team"],
                        "logo": team["logo"],
                        "team_normalized": team["team_normalized"],
                        "points": team["points"],
                        "played": team["played"],
                        "won": team["won"],
                        "draw": team["draw"],
                        "lost": team["lost"],
                        "goalsFor": team["goalsFor"],
                        "goalsAgainst": team["goalsAgainst"]
                    }
                    for team in tabla
                ]
            }

        # Ligas reales (API externa)
        url = f"{BASE_URL}/competitions/{league_id}/standings"
        if season:
            url += f"?season={season}"

        resp = requests.get(url, headers=headers)
        if resp.status_code != 200:
            return {"error": f"API error {resp.status_code}", "details": resp.text}

        data = resp.json()
        standings = data["standings"][0]["table"]
        league_name = LEAGUE_ID_TO_NAME.get(league_id, f"Liga {league_id}")
        asegurar_cache(league_name)
        cache_datos_liga[league_name]["tabla"] = standings
        guardar_hechos_prolog_por_liga(league_name, tabla=standings, fixtures=cache_datos_liga[league_name]["fixtures"])

        return {
            "group_stage": False,
            "league_name": league_name,
            "season": season,
            "tabla": [
                {
                    "rank": team["position"],
                    "team": team["team"]["name"],
                    "logo": team["team"].get("crest"),
                    "team_normalized": nombre_formato(team["team"]["name"]),
                    "points": team["points"],
                    "played": team["playedGames"],
                    "won": team["won"],
                    "draw": team["draw"],
                    "lost": team["lost"],
                    "goalsFor": team["goalsFor"],
                    "goalsAgainst": team["goalsAgainst"]
                }
                for team in standings
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# === ENDPOINT: Fixtures ===
@app.get("/fixtures/league/{league_id}")
def get_fixtures_league(league_id: int, season: int = 2024):
    try:
        if league_id == 9999:
            fixtures = [
                {"match_id": 1, "utc_date": "2025-07-25T00:00:00Z", "home_team": "inter_miami", "away_team": "palmeiras", "matchday": 1},
                {"match_id": 2, "utc_date": "2025-07-25T00:00:00Z", "home_team": "al_ahly", "away_team": "porto", "matchday": 1},
                {"match_id": 3, "utc_date": "2025-07-25T00:00:00Z", "home_team": "psg", "away_team": "seattle_sounders", "matchday": 1},
                {"match_id": 4, "utc_date": "2025-07-25T00:00:00Z", "home_team": "atletico_madrid", "away_team": "botafogo", "matchday": 1},
                {"match_id": 5, "utc_date": "2025-07-25T00:00:00Z", "home_team": "auckland_city", "away_team": "boca_juniors", "matchday": 1},
                {"match_id": 6, "utc_date": "2025-07-25T00:00:00Z", "home_team": "benfica", "away_team": "bayern", "matchday": 1}
            ]
            league_name = "Mundial de Clubes"
            asegurar_cache(league_name)
            cache_datos_liga[league_name]["fixtures"] = fixtures
            guardar_hechos_prolog_por_liga(league_name, tabla=cache_datos_liga[league_name]["tabla"], fixtures=fixtures)
            return fixtures

        if league_id == 9998:
            fixtures = get_fixtures_custom_unpsjb()
            league_name = "Copa UNPSJB"
            asegurar_cache(league_name)
            cache_datos_liga[league_name]["fixtures"] = fixtures
            guardar_hechos_prolog_por_liga(league_name, tabla=cache_datos_liga[league_name]["tabla"], fixtures=fixtures)
            return fixtures

        url = f"{BASE_URL}/competitions/{league_id}/matches?season={season}&status=SCHEDULED"
        resp = requests.get(url, headers=headers)
        if resp.status_code != 200:
            return {"error": f"API error {resp.status_code}", "details": resp.text}

        data = resp.json()
        fixtures = [
            {
                "match_id": match["id"],
                "utc_date": match["utcDate"],
                "home_team": match["homeTeam"]["name"],
                "away_team": match["awayTeam"]["name"],
                "matchday": match.get("matchday"),
            }
            for match in data.get("matches", [])
        ]

        league_name = LEAGUE_ID_TO_NAME.get(league_id, f"Liga {league_id}")
        asegurar_cache(league_name)
        cache_datos_liga[league_name]["fixtures"] = fixtures
        guardar_hechos_prolog_por_liga(league_name, tabla=cache_datos_liga[league_name]["tabla"], fixtures=fixtures)
        return fixtures

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# === FUNCIONES AUXILIARES ===

def partido_a_texto(prolog, partido_id):
    resultados = list(prolog.query(f"partido({partido_id}, Local, Visitante)"))
    if resultados:
        local = resultados[0]['Local']
        visitante = resultados[0]['Visitante']
        return f"{local} vs {visitante}"
    return f"Partido {partido_id}"

def parse_escenario_item(item_str):
    s = item_str.lstrip(",").strip()
    s = s.replace(", ,", ", None,")
    return ast.literal_eval(s)


def obtener_rutas_y_archivos(league_id: int) -> Dict[str, Any]:
    base_dir = Path(__file__).resolve().parent
    carpeta_prolog = base_dir / "prolog"
    liga_nombre = LEAGUE_ID_TO_NAME.get(league_id)
    
    if not liga_nombre:
        return {"error": f"Liga con ID {league_id} no reconocida"}

    liga_formateada = nombre_formato(liga_nombre)
    archivo_datos = carpeta_prolog / f"datos_{liga_formateada}.pl"
    
    if not archivo_datos.exists():
        return {"error": f"No se encontró archivo de datos para la liga '{liga_nombre}'"}

    return {
        "base_dir": base_dir,
        "carpeta_prolog": carpeta_prolog,
        "archivo_datos": archivo_datos,
        "liga_formateada": liga_formateada
    }

def cargar_prolog(ruta_datos: Path, ruta_logica: Path) -> Prolog:
    prolog = Prolog()
    prolog.consult(str(ruta_datos))
    prolog.consult(str(ruta_logica))
    return prolog

def limpiar_ranking_item(item) -> Dict[str, Any]:
    try:
        s = item.lstrip(",").strip()
        s = re.sub(r'^(\w+)', r'"\1"', s)
        s = re.sub(r'\(([^,]+),', r'("\1",', s)
        equipo_nombre, puntos = ast.literal_eval(s)
        return {"equipo": equipo_nombre, "puntos": puntos}
    except Exception as e:
        print(f"❌ Error al parsear ranking: {item} => {e}")
        return {}

def obtener_equipos_y_puntos(prolog: Prolog) -> Dict[str, int]:
    query_puntos = "findall((Eq, Pts), puntos(Eq, Pts), ListaPuntos)"
    res_puntos = list(prolog.query(query_puntos))
    if not res_puntos:
        return {}

    ranking = {}
    for item in res_puntos[0]["ListaPuntos"]:
        try:
            if isinstance(item, str):
                equipo, puntos = parse_item(item)
            elif isinstance(item, tuple):
                equipo, puntos = item
            ranking[equipo] = puntos
        except Exception as e:
            print(f"❌ Error al parsear item '{item}': {e}")
    return ranking

@app.get("/prolog/escenarios_con_detalles/{league_id}/{equipo}")
def escenarios_con_detalles(league_id: int, equipo: str, min_pos: int = 1, max_pos: int = 2, partidos: int = 2):
    try:
        rutas = obtener_rutas_y_archivos(league_id)
        if "error" in rutas:
            return rutas
        
        prolog = cargar_prolog(rutas["archivo_datos"], rutas["base_dir"] / "prolog" / "nuevo42.pl")

        eq = nombre_formato(equipo)
        query = f"escenario_valido_goles_generador({eq}, {min_pos}, {max_pos}, {partidos}, Escenario, Ranking)"
        resultados = list(prolog.query(query, maxresult=15))

        resultados_procesados = []
        for r in resultados:
            escenario_limpio, ranking_limpio = [], []

            for item in r["Escenario"]:
                try:
                    partido_id, _, (goles_local, goles_visitante) = parse_escenario_item(item)
                    partido_data = list(prolog.query(f"partido({partido_id}, Local, Visitante)"))
                    local = partido_data[0]["Local"] if partido_data else "desconocido"
                    visitante = partido_data[0]["Visitante"] if partido_data else "desconocido"

                    escenario_limpio.append({
                        "partido_id": partido_id,
                        "equipo_local": local,
                        "goles_local": goles_local,
                        "equipo_visitante": visitante,
                        "goles_visitante": goles_visitante
                    })
                except Exception as e:
                    print(f"❌ Error al parsear escenario: {item} => {e}")

            for item in r["Ranking"]:
                parsed = limpiar_ranking_item(item)
                if parsed:
                    ranking_limpio.append(parsed)

            resultados_procesados.append({
                "escenario": escenario_limpio,
                "ranking": ranking_limpio
            })

        return {"resultados": resultados_procesados}
    except Exception as e:
        return {"error": str(e)}

# === ENDPOINT ESCENARIOS DETALLADOS ===
@app.get("/prolog/escenarios/{league_id}/{equipo}")
def escenarios(league_id:int, equipo: str, min_pos: int = 1, max_pos: int = 2, fechas: int = 2):
    try:
        rutas = obtener_rutas_y_archivos(league_id)
        if "error" in rutas:
            return rutas

        prolog = cargar_prolog(rutas["archivo_datos"], rutas["base_dir"] / "prolog" / "nuevo43.pl")

        eq = nombre_formato(equipo)
        query = f"posible({eq}, {min_pos}, {max_pos}, {fechas}, Escenario)"
        resultados = list(prolog.query(query, maxresult=15))

        ranking_base = obtener_equipos_y_puntos(prolog)
        if not ranking_base:
            return {"error": "No se pudo obtener los puntos actuales"}

        escenarios = []
        for r in resultados:
            escenario_limpio, escenario_ids = [], []

            for item in r["Escenario"]:
                if isinstance(item, str):
                    item_str = item.lstrip(",").strip()
                    partido_id, resultado = literal_eval(
                        item_str.replace("gana_local", "'gana_local'")
                                .replace("empate", "'empate'")
                                .replace("gana_visitante", "'gana_visitante'")
                    )
                else:
                    partido_id, resultado = item

                texto_partido = partido_a_texto(prolog, partido_id)
                resultado_texto = {
                    "gana_local": "Gana Local",
                    "empate": "Empate",
                    "gana_visitante": "Gana Visitante"
                }.get(resultado, resultado)

                escenario_limpio.append({
                    "partido": texto_partido,
                    "resultado": resultado_texto
                })
                escenario_ids.append((partido_id, resultado))

            ranking_actualizado = ranking_base.copy()
            modificados = set()

            for partido_id, resultado in escenario_ids:
                data = list(prolog.query(f"partido({partido_id}, Local, Visitante)"))
                if not data:
                    continue
                local, visitante = data[0]["Local"], data[0]["Visitante"]
                modificados.update([local, visitante])

                if resultado == "gana_local":
                    ranking_actualizado[local] += 3
                elif resultado == "gana_visitante":
                    ranking_actualizado[visitante] += 3
                elif resultado == "empate":
                    ranking_actualizado[local] += 1
                    ranking_actualizado[visitante] += 1

            ranking_ordenado = sorted(
                [{
                    "equipo": eq,
                    "puntos": pts,
                    "modificado": eq in modificados
                } for eq, pts in ranking_actualizado.items()],
                key=lambda x: x["puntos"], reverse=True
            )

            escenarios.append({
                "escenario": escenario_limpio,
                "ranking": ranking_ordenado
            })

        return {"resultados": escenarios}

    except Exception as e:
        return {"error": str(e)}


# === ENDPOINT: Listar Ligas ===
LEAGUES_HARDCODED = [
    {
        "id": 2021, "name": "Premier League", "country": "England",
        "flag": "https://crests.football-data.org/770.svg",
        "logo": "https://crests.football-data.org/PL.png", "season": 2025, "teams_count": 20
    },
    {
        "id": 2002, "name": "Bundesliga", "country": "Germany",
        "flag": "https://upload.wikimedia.org/wikipedia/en/b/ba/Flag_of_Germany.svg",
        "logo": "https://crests.football-data.org/BL1.png", "season": 2025, "teams_count": 18
    },
    {
        "id": 2014, "name": "La Liga", "country": "Spain",
        "flag": "https://crests.football-data.org/760.svg",
        "logo": "https://crests.football-data.org/PD.png", "season": 2025, "teams_count": 20
    },
    {
        "id": 2019, "name": "Serie A", "country": "Italy",
        "flag": "https://crests.football-data.org/784.svg",
        "logo": "https://crests.football-data.org/SA.png", "season": 2025, "teams_count": 20
    },
    {
        "id": 2015, "name": "Ligue 1", "country": "France",
        "flag": "https://crests.football-data.org/774.svg",
        "logo": "https://crests.football-data.org/FL1.png", "season": 2025, "teams_count": 18
    },
    {
    "id": 9999,
    "name": "Mundial de clubes",
    "country": "FIFA",
    "flag": "https://upload.wikimedia.org/wikipedia/commons/8/80/World_icon.svg",
    "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/FIFA_Club_World_Cup_logo.svg/800px-FIFA_Club_World_Cup_logo.svg.png",
    "season": 2025,
    "teams_count": 32
    },
    {
    "id": 9998,
    "name": "Copa UNPSJB",
    "country": "FIFA",
    "flag": "https://upload.wikimedia.org/wikipedia/commons/8/80/World_icon.svg",
    "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/FIFA_Club_World_Cup_logo.svg/800px-FIFA_Club_World_Cup_logo.svg.png",
    "season": 2025,
    "teams_count": 16
    }
]

@app.get("/leagues")
def get_leagues():
    return {"leagues": LEAGUES_HARDCODED}


def parse_item(item_str):
    item_str = item_str.lstrip(",").strip()
    if item_str.startswith("(") and item_str.endswith(")"):
        item_str = item_str[1:-1]
    try:
        equipo_raw, puntos_raw = item_str.split(",", 1)
        equipo = equipo_raw.strip()
        puntos = int(puntos_raw.strip())
        return equipo, puntos
    except Exception as e:
        raise ValueError(f"No se pudo parsear el item '{item_str}': {e}")
    
def get_tabla_custom():
    raw_data = [
        # Grupo A
        {"team": "Inter Miami", "team_normalized": "inter_miami", "group": "A",
         "points": 4, "won": 1, "draw": 1, "lost": 0, "goalsFor": 2, "goalsAgainst": 1,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/1/1b/Inter_Miami_CF_logo.svg"},
        {"team": "Al Ahly", "team_normalized": "al_ahly", "group": "A",
         "points": 1, "won": 0, "draw": 1, "lost": 1, "goalsFor": 0, "goalsAgainst": 2,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/2/2e/Al_Ahly_SC_logo.svg"},
        {"team": "Palmeiras", "team_normalized": "palmeiras", "group": "A",
         "points": 4, "won": 1, "draw": 1, "lost": 0, "goalsFor": 2, "goalsAgainst": 0,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/8/8d/Palmeiras_logo.svg"},
        {"team": "Porto", "team_normalized": "porto", "group": "A",
         "points": 1, "won": 0, "draw": 1, "lost": 1, "goalsFor": 1, "goalsAgainst": 2,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/5/5c/FC_Porto_logo.svg"},

        # Grupo B
        {"team": "PSG", "team_normalized": "psg", "group": "B",
         "points": 3, "won": 1, "draw": 0, "lost": 1, "goalsFor": 4, "goalsAgainst": 1,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/a/a7/Paris_Saint-Germain_FC_logo.svg"},
        {"team": "Botafogo", "team_normalized": "botafogo", "group": "B",
         "points": 6, "won": 2, "draw": 0, "lost": 0, "goalsFor": 3, "goalsAgainst": 1,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/4/4f/Botafogo_de_Futebol_e_Regatas_logo.svg"},
        {"team": "Atletico de Madrid", "team_normalized": "atletico_madrid", "group": "B",
         "points": 3, "won": 1, "draw": 0, "lost": 1, "goalsFor": 3, "goalsAgainst": 5,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/7/76/Atl%C3%A9tico_de_Madrid_logo.svg"},
        {"team": "Seattle Sounders", "team_normalized": "seattle_sounders", "group": "B",
         "points": 0, "won": 0, "draw": 0, "lost": 2, "goalsFor": 2, "goalsAgainst": 5,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/0/0b/Seattle_Sounders_FC_logo.svg"},

        # Grupo C
        {"team": "Bayern", "team_normalized": "bayern", "group": "C",
         "points": 6, "won": 2, "draw": 0, "lost": 0, "goalsFor": 12, "goalsAgainst": 1,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/1/1f/FC_Bayern_Munich_logo_%282017%29.svg"},
        {"team": "Boca Juniors", "team_normalized": "boca_juniors", "group": "C",
         "points": 1, "won": 0, "draw": 1, "lost": 1, "goalsFor": 3, "goalsAgainst": 4,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/2/24/Boca_Juniors_crest.svg"},
        {"team": "Benfica", "team_normalized": "benfica", "group": "C",
         "points": 4, "won": 1, "draw": 1, "lost": 0, "goalsFor": 8, "goalsAgainst": 2,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/5/5c/SL_Benfica_logo.svg"},
        {"team": "Auckland City", "team_normalized": "auckland_city", "group": "C",
         "points": 0, "won": 0, "draw": 0, "lost": 2, "goalsFor": 0, "goalsAgainst": 16,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/1/1b/Auckland_City_FC_logo.svg"},

        # Grupo D
        {"team": "Chelsea", "team_normalized": "chelsea", "group": "D",
         "points": 3, "won": 1, "draw": 0, "lost": 1, "goalsFor": 3, "goalsAgainst": 3,
         "logo": "https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg"},
        {"team": "Flamengo", "team_normalized": "flamengo", "group": "D",
         "points": 6, "won": 2, "draw": 0, "lost": 0, "goalsFor": 5, "goalsAgainst": 1,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/5/5f/Flamengo_logo.svg"},
        {"team": "ES Tunis", "team_normalized": "es_tunis", "group": "D",
         "points": 3, "won": 1, "draw": 0, "lost": 1, "goalsFor": 1, "goalsAgainst": 2,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/8/86/ES_Tunis_logo.svg"},
        {"team": "Los Angeles", "team_normalized": "los_angeles", "group": "D",
         "points": 0, "won": 0, "draw": 0, "lost": 2, "goalsFor": 0, "goalsAgainst": 3,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/6/6e/Los_Angeles_FC_logo.svg"},

        # Grupo E
        {"team": "River", "team_normalized": "river", "group": "E",
         "points": 4, "won": 1, "draw": 1, "lost": 0, "goalsFor": 3, "goalsAgainst": 1,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/3/34/C.A._River_Plate_logo.svg"},
        {"team": "Inter", "team_normalized": "inter", "group": "E",
         "points": 4, "won": 1, "draw": 1, "lost": 0, "goalsFor": 3, "goalsAgainst": 2,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/0/0f/FC_Internazionale_Milano_2021.svg"},
        {"team": "Monterrey", "team_normalized": "monterrey", "group": "E",
         "points": 2, "won": 0, "draw": 2, "lost": 0, "goalsFor": 1, "goalsAgainst": 1,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/f/f6/C.F._Monterrey_logo.svg"},
        {"team": "Urawa", "team_normalized": "urawa", "group": "E",
         "points": 0, "won": 0, "draw": 0, "lost": 2, "goalsFor": 2, "goalsAgainst": 5,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/1/1a/Urawa_Red_Diamonds_logo.svg"},

        # Grupo F
        {"team": "Dortmunt", "team_normalized": "dortmunt", "group": "F",
         "points": 4, "won": 1, "draw": 1, "lost": 0, "goalsFor": 4, "goalsAgainst": 3,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg"},
        {"team": "Fluminense", "team_normalized": "fluminense", "group": "F",
         "points": 4, "won": 1, "draw": 1, "lost": 0, "goalsFor": 4, "goalsAgainst": 2,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/4/4e/Fluminense_FC_logo.svg"},
        {"team": "Mamelodi", "team_normalized": "mamelodi", "group": "F",
         "points": 3, "won": 1, "draw": 0, "lost": 1, "goalsFor": 4, "goalsAgainst": 4,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/0/09/Mamelodi_Sundowns_FC_logo.svg"},
        {"team": "Ulsan", "team_normalized": "ulsan", "group": "F",
         "points": 0, "won": 0, "draw": 0, "lost": 2, "goalsFor": 2, "goalsAgainst": 5,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/9/9e/Ulsan_Hyundai_FC_logo.svg"},

        # Grupo G
        {"team": "Manchester City", "team_normalized": "manchester_city", "group": "G",
         "points": 6, "won": 2, "draw": 0, "lost": 0, "goalsFor": 8, "goalsAgainst": 0,
         "logo": "https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg"},
        {"team": "Juventus", "team_normalized": "juventus", "group": "G",
         "points": 6, "won": 2, "draw": 0, "lost": 0, "goalsFor": 9, "goalsAgainst": 1,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/1/15/Juventus_FC_2017_logo.svg"},
        {"team": "Wydad", "team_normalized": "wydad", "group": "G",
         "points": 0, "won": 0, "draw": 0, "lost": 2, "goalsFor": 1, "goalsAgainst": 6,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/8/8d/Wydad_AC_logo.svg"},
        {"team": "Al Ain", "team_normalized": "al_ain", "group": "G",
         "points": 0, "won": 0, "draw": 0, "lost": 2, "goalsFor": 0, "goalsAgainst": 11,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/4/4c/Al_Ain_FC_Logo.svg"},

        # Grupo H
        {"team": "Real Madrid", "team_normalized": "real_madrid", "group": "H",
         "points": 4, "won": 1, "draw": 1, "lost": 0, "goalsFor": 4, "goalsAgainst": 2,
         "logo": "https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg"},
        {"team": "Salzburg", "team_normalized": "salzburg", "group": "H",
         "points": 4, "won": 1, "draw": 1, "lost": 0, "goalsFor": 2, "goalsAgainst": 1,
         "logo": "https://upload.wikimedia.org/wikipedia/en/1/1d/FCRedBullSalzburg.svg"},
        {"team": "Al hilal", "team_normalized": "al_hilal", "group": "H",
         "points": 2, "won": 0, "draw": 2, "lost": 0, "goalsFor": 1, "goalsAgainst": 1,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/2/2d/Al_Hilal_SFC.svg"},
        {"team": "Pachuca", "team_normalized": "pachuca", "group": "H",
         "points": 0, "won": 0, "draw": 0, "lost": 2, "goalsFor": 2, "goalsAgainst": 5,
         "logo": "https://upload.wikimedia.org/wikipedia/commons/3/37/C.F._Pachuca_logo.svg"},
    ]

    for equipo in raw_data:
        equipo["played"] = equipo["won"] + equipo["draw"] + equipo["lost"]

    return raw_data

import random

def get_tabla_custom2():
    nombres = [
        "maia", "lucas", "facu", "eric", "alan", "rami", "meli", "romi",
        "fran", "claudio", "charly", "demian", "ricardo", "rodrigo", "aldana", "fabricio"
    ]

    # Logos variados de clubes y selecciones menos populares
    logos_varios = [
        "https://crests.football-data.org/106.png",   # Tigres UANL
        "https://crests.football-data.org/531.png",   # River Plate
        "https://crests.football-data.org/558.png",   # Boca Juniors
        "https://crests.football-data.org/1344.png",  # Al Ahly (Egipto)
        "https://crests.football-data.org/1350.png",  # Auckland City (NZ)
        "https://crests.football-data.org/1368.png",  # Mamelodi Sundowns
        "https://crests.football-data.org/1372.png",  # Urawa Red Diamonds
        "https://crests.football-data.org/1376.png",  # TP Mazembe
        "https://crests.football-data.org/1379.png",  # Wydad Casablanca
        "https://crests.football-data.org/1382.png",  # Al Hilal
        "https://crests.football-data.org/1384.png",  # Al Ittihad
        "https://crests.football-data.org/1387.png",  # Al Nassr
        "https://crests.football-data.org/1390.png",  # Raja Casablanca
        "https://crests.football-data.org/4391.png",  # Selección de Senegal
        "https://crests.football-data.org/4395.png",  # Selección de Marruecos
        "https://crests.football-data.org/4399.png",  # Selección de Japón
    ]

    tabla = []

    for i, nombre in enumerate(nombres):
        played = 27

        won = random.randint(5, 20)
        max_draws = played - won
        draw = random.randint(0, min(10, max_draws))
        lost = played - won - draw

        points = won * 3 + draw
        goals_for = random.randint(25, 65)
        goals_against = random.randint(20, 60)

        tabla.append({
            "rank": 0,
            "team": nombre.capitalize(),
            "logo": logos_varios[i % len(logos_varios)],
            "team_normalized": nombre.lower(),
            "points": points,
            "played": played,
            "won": won,
            "draw": draw,
            "lost": lost,
            "goalsFor": goals_for,
            "goalsAgainst": goals_against
        })

    tabla.sort(
        key=lambda e: (e["points"], e["goalsFor"] - e["goalsAgainst"], e["goalsFor"]),
        reverse=True
    )
    for idx, equipo in enumerate(tabla, start=1):
        equipo["position"] = idx

    return tabla

def get_fixtures_custom_unpsjb():
    equipos = [
        "maia", "lucas", "facu", "eric", "alan", "rami", "meli", "romi",
        "fran", "claudio", "charly", "demian", "ricardo", "rodrigo", "aldana", "fabricio"
    ]

    # Fijamos un fixture ficticio con fechas distintas
    fechas = ["2025-08-01T00:00:00Z", "2025-08-08T00:00:00Z", "2025-08-15T00:00:00Z"]

    # Partidos por fecha (asignación manual para simplicidad)
    fixture_jornadas = [
        [("maia", "lucas"), ("facu", "eric"), ("alan", "rami"), ("meli", "romi"),
         ("fran", "claudio"), ("charly", "demian"), ("ricardo", "rodrigo"), ("aldana", "fabricio")],

        [("lucas", "facu"), ("eric", "maia"), ("rami", "meli"), ("romi", "alan"),
         ("claudio", "charly"), ("demian", "fran"), ("rodrigo", "aldana"), ("fabricio", "ricardo")],

        [("maia", "facu"), ("lucas", "eric"), ("alan", "meli"), ("rami", "romi"),
         ("fran", "charly"), ("claudio", "demian"), ("rodrigo", "fabricio"), ("ricardo", "aldana")]
    ]

    fixtures = []
    match_id = 1
    for jornada_idx, partidos in enumerate(fixture_jornadas):
        for home, away in partidos:
            fixtures.append({
                "match_id": match_id,
                "utc_date": fechas[jornada_idx],
                "home_team": home,
                "away_team": away,
                "matchday": jornada_idx + 1
            })
            match_id += 1

    return fixtures
