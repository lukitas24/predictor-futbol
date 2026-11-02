// services/torneo.service.js
const BASE_URL = 'http://localhost:8000'; // Cambiá esta URL si el backend corre en otro servidor.

async function obtener(path) {
    let res;
    try {
        res = await fetch(`${BASE_URL}${path}`);
    } catch (err) {
        throw new Error(`No se pudo conectar con el backend: ${err.message}`);
    }

    let data;
    try {
        data = await res.json();
    } catch {
        throw new Error(`Respuesta inválida del backend (HTTP ${res.status}).`);
    }

    if (!res.ok || data?.error) {
        throw new Error(typeof data?.detail === 'string' ? data.detail : data?.error || `Error HTTP ${res.status}`);
    }

    return data;
}

export async function getLeagues() {
    const data = await obtener('/leagues');
    return data.leagues;
}

export function getStandings(leagueId, season = '2026') {
    return obtener(`/tabla/leagues/${encodeURIComponent(leagueId)}?season=${encodeURIComponent(season)}`);
}

export function getFixtures(leagueId, season = '2026') {
    return obtener(`/fixtures/league/${encodeURIComponent(leagueId)}?season=${encodeURIComponent(season)}`);
}

export function predecir_simple(leagueId, equipo, minPos = 1, maxPos = 2, fechas = 1) {
    const params = new URLSearchParams({
        min_pos: String(minPos),
        max_pos: String(maxPos),
        fechas: String(fechas)
    });

    return obtener(`/prolog/escenarios/${encodeURIComponent(leagueId)}/${encodeURIComponent(equipo)}?${params}`);
}

export function predecir_goles(leagueId, equipo, minPos = 1, maxPos = 2, fechas = 1) {
    // 'fechas' significa jornadas pendientes.
    // Ya no se multiplica por dos.
    const params = new URLSearchParams({
        min_pos: String(minPos),
        max_pos: String(maxPos),
        fechas: String(fechas)
    });

    return obtener(
        `/prolog/escenarios_con_detalles/${encodeURIComponent(leagueId)}/${encodeURIComponent(equipo)}?${params}`
    );
}
