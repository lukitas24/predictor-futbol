import React, { useState, useEffect } from "react";
import TorneosView from "./torneoView";
import { getLeagues, getStandings, getFixtures, predecir_simple, predecir_goles } from "./torneo.service.js";

export default function Torneos() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);

  const getPositionColor = (position) => {
    if (position <= 4) return "text-green-600 bg-green-50";
    if (position <= 6) return "text-blue-600 bg-blue-50";
    if (position <= 8) return "text-orange-600 bg-orange-50";
    return "text-gray-600 bg-gray-50";
  };

  const currentYear = new Date().getFullYear();
  const seasons = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const [selectedSeason, setSelectedSeason] = useState(currentYear.toString());

  const [fixtures, setFixtures] = useState([]);
  const [activeMatchday, setActiveMatchday] = useState(null);

  // Función para normalizar nombres y buscar logo del equipo
  const nombre_formato = (nombre) => {
    return nombre.trim().toLowerCase().replaceAll(" ", "_");
  };

  const findLogo = (teamName) => {
    if (!selectedTournament) return "/default-logo.png";

    if (Array.isArray(selectedTournament.teams)) {
      const team = selectedTournament.teams.find(t => t.team_normalized === nombre_formato(teamName));
      return team?.logo || "/default-logo.png";
    } else if (typeof selectedTournament.teams === "object" && selectedTournament.teams !== null) {
      for (const grupo of Object.values(selectedTournament.teams)) {
        const team = grupo.find(t => t.team_normalized === nombre_formato(teamName));
        if (team) return team.logo || "/default-logo.png";
      }
    }
    return "/default-logo.png";
  };

  const [selectedTeam, setSelectedTeam] = useState(null);

  const [minPos, setMinPos] = useState("");
  const [maxPos, setMaxPos] = useState("");
  const [numFechas, setNumFechas] = useState("");


  const [escenarioIndex, setEscenarioIndex] = useState(0);

  const [prediccionResultado, setPrediccionResultado] = useState([]);


  useEffect(() => {
    async function fetchLeagues() {
      try {
        const leagues = await getLeagues();
        const formatted = leagues.map((l) => ({
          id: l.id.toString(),
          name: l.name,
          country: l.country,
          season: l.season || currentYear.toString(),
          logo: l.logo,
          flag: l.flag,
          teams_count: l.teams_count,
          teams: [],
        }));
        setTournaments(formatted);
      } catch (err) {
        console.error("Error cargando ligas:", err);
      }
    }
    fetchLeagues();
  }, []);

  // Cargar tabla de posiciones al seleccionar torneo y temporada
  useEffect(() => {
    if (!selectedTournament || !selectedSeason) return;

    // No volver a cargar si ya tenemos equipos para la misma temporada
    if (selectedTournament.teams && Object.keys(selectedTournament.teams).length > 0 && selectedTournament.season === selectedSeason) return;

    async function fetchStandingsData() {
      try {
        const data = await getStandings(selectedTournament.id, selectedSeason);
        if (data.error) {
          console.error("Error API backend:", data.error);
          return;
        }
        let teamsData = null;
        if (data.group_stage) {
          // Fase de grupos
          teamsData = data.groups;
        } else {
          // Liga normal
          teamsData = data.tabla;
        }

        setTournaments((prev) =>
          prev.map((t) =>
            t.id.toString() === selectedTournament.id.toString()
              ? { ...t, teams: teamsData, season: selectedSeason, group_stage: data.group_stage }
              : t
          )
        );

        setSelectedTournament((prev) => ({
          ...prev,
          teams: teamsData,
          season: selectedSeason,
          group_stage: data.group_stage
        }));

      } catch (err) {
        console.error("Error al cargar tabla de posiciones:", err);
      }
    }

    fetchStandingsData();
  }, [selectedTournament, selectedSeason]);

  // Cargar fixtures al seleccionar torneo
  useEffect(() => {
    if (!selectedTournament) return;

    let cancelado = false;

    async function fetchFixturesData() {
      try {
        const data = await getFixtures(selectedTournament.id, selectedTournament.season);
        if (cancelado) return;

        setFixtures(data);

        const fechas = data.map(f => f.matchday);
        const matchdaysUnicos = [...new Set(fechas)].sort((a, b) => a - b);
        setActiveMatchday(matchdaysUnicos[0]);
      } catch (err) {
        console.error("Error al cargar fixtures:", err);
      }
    }

    fetchFixturesData();

    return () => {
      cancelado = true;
    };
  }, [selectedTournament]);

 const handleSubmit = async (e) => {
  e.preventDefault();
  if (!selectedTeam) return;

  const equipo = selectedTeam.team_normalized;
  try {
    let data;
    if (selectedTournament?.group_stage) {
      // Para fase de grupos
      data = await predecir_goles(selectedTournament.id, equipo, minPos, maxPos, numFechas);
    } else {
      // Para liga normal
      data = await predecir_simple(selectedTournament.id, equipo, minPos, maxPos, numFechas);
    }

    setPrediccionResultado(data.resultados); // esto actualiza el estado, pero el nuevo valor no está disponible aún en este punto
    console.log(data)
  } catch (error) {
    console.error("Error al predecir:", error);
  }
};

// Este efecto se activa cuando cambia prediccionResultado
useEffect(() => {
  if (Array.isArray(prediccionResultado) && prediccionResultado.length > 0) {
    console.log("=== Resultado actualizado ===");
    console.log("Escenario actual:", prediccionResultado[escenarioIndex]);
    console.log("Ranking actual:", prediccionResultado[escenarioIndex]?.ranking);
    setEscenarioIndex(0);
  }
}, [prediccionResultado]);

useEffect(() => {
  console.log("Predicción resultado:", prediccionResultado);
  console.log("Escenario actual:", prediccionResultado[escenarioIndex]);
}, [prediccionResultado]);

  const isGroupStage = selectedTournament?.group_stage === true;


  const tablaSimulada = React.useMemo(() => {
    if (!prediccionResultado?.[escenarioIndex]?.escenario || !selectedTournament?.teams) return [];

    let equiposArray = [];

    if (Array.isArray(selectedTournament.teams)) {
      // Liga normal, ya es array
      equiposArray = selectedTournament.teams;
    } else if (typeof selectedTournament.teams === "object" && selectedTournament.teams !== null) {
      // Fase de grupos, unir todos los arrays de los grupos en uno solo
      equiposArray = Object.values(selectedTournament.teams).flat();
    } else {
      return [];
    }

    return calcularTablaSimulada(equiposArray, prediccionResultado[escenarioIndex].escenario);
  }, [prediccionResultado, escenarioIndex, selectedTournament]);

// Solo si hay fase de grupos y un equipo seleccionado
const grupoDelEquipo = isGroupStage && selectedTeam
  ? Object.entries(selectedTournament.teams).find(([grupoId, equipos]) =>
      equipos.some(e => e.team === selectedTeam.team)
    )
  : null;

const tablaGrupo = grupoDelEquipo
  ? tablaSimulada.filter(team =>
      grupoDelEquipo[1].some(e => e.team === team.team)
    )
  : tablaSimulada;


  function calcularTablaSimulada(teamsOriginal, partidosSimulados) {
    // Clonamos los equipos originales para no mutar el estado original
    const tablaSim = teamsOriginal.map(team => ({
      ...team,
      played: team.played ?? 0,
      won: team.won ?? 0,
      lost: team.lost ?? 0,
      draw: team.draw ?? 0,
      goals_for: team.goalsFor ?? 0,
      goals_against: team.goalsAgainst ?? 0,
      points: team.points ?? 0
    }));

    const equiposMap = new Map(tablaSim.map(team => [team.team_normalized, team]));

    for (const partido of partidosSimulados) {
      let local, visitante, golesLocal, golesVisitante;

      if (
        partido.equipo_local &&
        partido.equipo_visitante &&
        typeof partido.goles_local !== "undefined" &&
        typeof partido.goles_visitante !== "undefined"
      ) {
        // ✅ Formato con datos explícitos (el que estás recibiendo)
        local = partido.equipo_local;
        visitante = partido.equipo_visitante;
        golesLocal = partido.goles_local;
        golesVisitante = partido.goles_visitante;
      } else if (partido.partido && partido.resultado) {
        // Solo si llega en formato string (no es tu caso actual)
        [local, visitante] = partido.partido.split(" vs ");
        [golesLocal, golesVisitante] = partido.resultado.split("-").map(Number);
      } else {
        console.warn("Formato de partido no reconocido:", partido);
        continue;
      }

      const equipoLocal = equiposMap.get(local);
      const equipoVisitante = equiposMap.get(visitante);


      if (!equipoLocal || !equipoVisitante) {
        console.warn("Equipo no encontrado en tabla:", local, visitante);
        continue;
      }

      equipoLocal.played += 1;
      equipoVisitante.played += 1;

      equipoLocal.goals_for += golesLocal;
      equipoLocal.goals_against += golesVisitante;
      equipoVisitante.goals_for += golesVisitante;
      equipoVisitante.goals_against += golesLocal;

      if (golesLocal > golesVisitante) {
        equipoLocal.won += 1;
        equipoVisitante.lost += 1;
        equipoLocal.points += 3;
      } else if (golesLocal < golesVisitante) {
        equipoVisitante.won += 1;
        equipoLocal.lost += 1;
        equipoVisitante.points += 3;
      } else {
        equipoLocal.draw += 1;
        equipoVisitante.draw += 1;
        equipoLocal.points += 1;
        equipoVisitante.points += 1;
      }
    }


    return tablaSim.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;

      const dgA = a.goals_for - a.goals_against;
      const dgB = b.goals_for - b.goals_against;
      return dgB - dgA;
    });
  }


  return (
    <TorneosView
      tournaments={tournaments}
      selectedTournament={selectedTournament}
      setSelectedTournament={setSelectedTournament}
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
      minPos={minPos}
      setMinPos={setMinPos}
      maxPos={maxPos}
      setMaxPos={setMaxPos}
      numFechas={numFechas}
      setNumFechas={setNumFechas}
      prediccionResultado={prediccionResultado}
      escenarioIndex={escenarioIndex}
      setEscenarioIndex={setEscenarioIndex}
      tablaSimulada={tablaSimulada}
      grupoDelEquipo={grupoDelEquipo}
      tablaGrupo={tablaGrupo}
    />
  );
}
