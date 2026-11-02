import React, { useEffect, useMemo, useState } from "react";
import TorneosView from "./torneoView";
import {
  getLeagues, getStandings, getFixtures,
  predecir_simple, predecir_goles,
} from "./torneo.service.js";

const year = String(new Date().getFullYear());
const norm = (s = "") => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export default function Torneos() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(year);
  const [fixtures, setFixtures] = useState([]);
  const [activeMatchday, setActiveMatchday] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [minPos, setMinPos] = useState("");
  const [maxPos, setMaxPos] = useState("");
  const [numFechas, setNumFechas] = useState("1");
  const [modoPrediccion, setModoPrediccion] = useState("simple");
  const [prediccionResultado, setPrediccionResultado] = useState([]);
  const [prediccionInfo, setPrediccionInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [escenarioIndex, setEscenarioIndex] = useState(0);

  const seasons = useMemo(() => {
    const base = Array.from({ length: 5 }, (_, i) => String(Number(year) - i));
    return [...new Set([String(selectedTournament?.season ?? year), ...base])];
  }, [selectedTournament?.season]);

  const getPositionColor = (pos) => {
    if (pos <= 4) return "text-green-600 bg-green-50";
    if (pos <= 6) return "text-blue-600 bg-blue-50";
    if (pos <= 8) return "text-orange-600 bg-orange-50";
    return "text-gray-600 bg-gray-50";
  };

  useEffect(() => {
    let active = true;
    getLeagues()
      .then((leagues) => {
        if (!active) return;
        setTournaments(leagues.map((l) => ({
          ...l, id: String(l.id), season: String(l.season ?? year), teams: [],
        })));
      })
      .catch((e) => active && setError(e.message));
    return () => { active = false; };
  }, []);

  const seleccionarTorneo = (torneo) => {
    setSelectedTournament(torneo ? { ...torneo, teams: [] } : null);
    setSelectedSeason(String(torneo?.season ?? year));
    setSelectedTeam(null);
    setPrediccionResultado([]);
    setPrediccionInfo("");
    setFixtures([]);
    setActiveMatchday(null);
    setError("");
    setEscenarioIndex(0);
    setModoPrediccion(torneo?.id === "9999" ? "goles" : "simple");
  };

  // Solo se carga si cambian torneo o temporada. No depende de `selectedTournament`
  // entero, evitando el bucle fetch -> setState -> fetch.
  useEffect(() => {
    if (!selectedTournament?.id) return;
    const id = selectedTournament.id;
    let active = true;
    setLoading(true);
    setError("");
    Promise.allSettled([getStandings(id, selectedSeason), getFixtures(id, selectedSeason)])
      .then(([tablaResp, fixtureResp]) => {
        if (!active) return;
        const errores = [];
        if (tablaResp.status === "fulfilled") {
          const standings = tablaResp.value;
          const teams = standings.group_stage ? standings.groups : standings.tabla;
          if (!teams) errores.push("La tabla llegó con un formato inválido.");
          else setSelectedTournament((prev) => prev?.id === id ? {
            ...prev, teams, group_stage: standings.group_stage, season: selectedSeason,
          } : prev);
        } else errores.push(`Tabla: ${tablaResp.reason.message}`);
        if (fixtureResp.status === "fulfilled" && Array.isArray(fixtureResp.value)) {
          const partidos = fixtureResp.value;
          setFixtures(partidos);
          const fechas = [...new Set(partidos.map((p) => p.matchday).filter((v) => v != null))]
            .sort((a, b) => Number(a) - Number(b));
          setActiveMatchday(fechas.length ? fechas[0] : null);
        } else {
          setFixtures([]);
          setActiveMatchday(null);
          errores.push(`Partidos: ${fixtureResp.status === "rejected"
            ? fixtureResp.reason.message : "Formato inválido"}`);
        }
        if (errores.length) setError(errores.join(" | "));
        setSelectedTeam(null);
        setPrediccionResultado([]);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedTournament?.id, selectedSeason]);

  const findLogo = (teamName) => {
    if (!selectedTournament?.teams) return "/default-logo.png";
    const equipos = Array.isArray(selectedTournament.teams)
      ? selectedTournament.teams : Object.values(selectedTournament.teams).flat();
    return equipos.find((t) => norm(t.team_normalized) === norm(teamName) || norm(t.team) === norm(teamName))?.logo
      || "/default-logo.png";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTeam || !selectedTournament) return;
    setPrediccionResultado([]);
    setPrediccionInfo("");
    setError("");
    setLoading(true);
    try {
      const id = selectedTournament.id;
      const equipo = selectedTeam.team_normalized;
      const min = Number(minPos), max = Number(maxPos), fechas = Number(numFechas);
      if (!Number.isInteger(min) || !Number.isInteger(max) || !Number.isInteger(fechas) ||
          min < 1 || max < min || fechas < 1) {
        throw new Error("Indicá posiciones y fechas válidas.");
      }
      const data = modoPrediccion === "goles"
        ? await predecir_goles(id, equipo, min, max, fechas)
        : await predecir_simple(id, equipo, min, max, fechas);
      setPrediccionResultado(Array.isArray(data.resultados) ? data.resultados : []);
      setPrediccionInfo(data.mensaje || "");
      setEscenarioIndex(0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const isGroupStage = selectedTournament?.group_stage === true;
  const grupoDelEquipo = isGroupStage && selectedTeam && selectedTournament?.teams
    ? Object.entries(selectedTournament.teams).find(([, equipos]) =>
      equipos.some((e) => e.team_normalized === selectedTeam.team_normalized)) ?? null
    : null;
  const tablaSimulada = prediccionResultado?.[escenarioIndex]?.ranking ?? [];
  const tablaGrupo = grupoDelEquipo
    ? tablaSimulada.filter((e) => grupoDelEquipo[1].some(
        (original) => original.team_normalized === (e.team_normalized || e.equipo)))
    : tablaSimulada;

  return (
    <TorneosView
      tournaments={tournaments}
      selectedTournament={selectedTournament}
      setSelectedTournament={seleccionarTorneo}
      getPositionColor={getPositionColor}
      seasons={seasons}
      selectedSeason={selectedSeason}
      setSelectedSeason={setSelectedSeason}
      fixtures={fixtures}
      activeMatchday={activeMatchday}
      setActiveMatchday={setActiveMatchday}
      findLogo={findLogo}
      selectedTeam={selectedTeam}
      setSelectedTeam={setSelectedTeam}
      handleSubmit={handleSubmit}
      minPos={minPos} setMinPos={setMinPos}
      maxPos={maxPos} setMaxPos={setMaxPos}
      numFechas={numFechas} setNumFechas={setNumFechas}
      prediccionResultado={prediccionResultado}
      escenarioIndex={escenarioIndex} setEscenarioIndex={setEscenarioIndex}
      tablaSimulada={tablaSimulada}
      grupoDelEquipo={grupoDelEquipo}
      tablaGrupo={tablaGrupo}
      modoPrediccion={modoPrediccion} setModoPrediccion={setModoPrediccion}
      error={error} loading={loading} prediccionInfo={prediccionInfo}
    />
  );
}