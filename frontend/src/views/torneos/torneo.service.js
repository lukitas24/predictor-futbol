// services/footballService.js

const BASE_URL = "http://localhost:8000" // o tu URL backend

// Trae las ligas filtradas (ej: whitelist en backend)
export async function getLeagues() {
  const res = await fetch(`${BASE_URL}/leagues`)
  const data = await res.json()
  return data.leagues // asumimos { leagues: [...] }
}

// Trae tabla de posiciones para una liga y temporada
export async function getStandings(leagueId, season = "2024") {
  const res = await fetch(`${BASE_URL}/tabla/leagues/${leagueId}?season=${season}`);
  const data = await res.json();
  console.log("Datos standings recibidos:", data);
  return data;
}

export async function getFixtures(leagueId, season = "2024") {
  const res = await fetch(`${BASE_URL}/fixtures/league/${leagueId}?season=${season}`);
  const data = await res.json();
  console.log("Datos fixtures recibidos:", data);
  return data;
}

export async function predecir_simple(league_id, equipo, min_pos = 1, max_pos = 2, fechas = 1) {
  const res = await fetch(`${BASE_URL}/prolog/escenarios/${league_id}/${equipo}?min_pos=${min_pos}&max_pos=${max_pos}&fechas=${fechas}`);
  const data = await res.json();
  console.log("Datos predicción recibidos:", data);
  return data;
}

export async function predecir_goles(league_id, equipo, min_pos = 1, max_pos = 2, fechas = 1) {
  let partidos= fechas*2;
  const res = await fetch(`${BASE_URL}/prolog/escenarios_con_detalles/${league_id}/${equipo}?min_pos=${min_pos}&max_pos=${max_pos}&fechas=${partidos}`);
  const data = await res.json();
  console.log("Datos predicción goles recibidos:", data);
  return data;
}