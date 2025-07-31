import os
import requests

def nombre_formato(nombre):
    return nombre.strip().lower().replace(" ", "_").replace(".", "_")



def guardar_hechos_prolog(nombre_archivo, tabla, fixtures):
    # Crear la carpeta si no existe
    carpeta = os.path.dirname(nombre_archivo)
    os.makedirs(carpeta, exist_ok=True)
    with open(nombre_archivo, 'w', encoding='utf-8') as f:
        # Hechos de puntos            
        for equipo in tabla:
            nombre = nombre_formato(equipo["team"])
            puntos = equipo["points"]
            gf = equipo["goals_for"]
            gc = equipo["goals_against"]
            
            f.write(f"puntos({nombre}, {puntos}).\n")
            f.write(f"goles({nombre}, {gf}, {gc}).\n")


        f.write("\n")

        # Hechos de partidos
        for partido in fixtures:
            id = partido["fixture_id"]
            local = nombre_formato(partido["home_team"])
            visitante = nombre_formato(partido["away_team"])
            f.write(f"partido({id}, {local}, {visitante}).\n")

if __name__ == "__main__":
    # Parámetros
    base_url = "http://localhost:8000"
    league_id = 128
    season = 2025

    # Llamar al backend FastAPI
    try:
        tabla_url = f"{base_url}/tabla/leagues/{league_id}?season={season}"
        fixtures_url = f"{base_url}/fixtures/league/{league_id}?season={season}"

        print("Obteniendo tabla de posiciones...")
        res_tabla = requests.get(tabla_url)
        tabla = res_tabla.json()

        print("Obteniendo partidos pendientes...")
        res_fixtures = requests.get(fixtures_url)
        fixtures = res_fixtures.json()

        if isinstance(tabla, dict) and 'error' in tabla:
            raise Exception(f"Error al obtener tabla: {tabla['error']}")
        if isinstance(fixtures, dict) and 'error' in fixtures:
            raise Exception(f"Error al obtener fixtures: {fixtures['error']}")

        # Guardar hechos en archivo .pl
        ruta_prolog = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'prolog', 'datos.pl'))
        guardar_hechos_prolog(ruta_prolog, tabla, fixtures)

    except Exception as e:
        print("❌ Error:", e)