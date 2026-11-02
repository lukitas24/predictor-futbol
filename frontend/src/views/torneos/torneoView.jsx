
import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Compass,
  Flame,
  Goal,
  Info,
  Layers3,
  Search,
  Shield,
  Sparkles,
  Target,
  Trophy,
  WandSparkles,
  Zap,
} from "lucide-react";

import "./torneoView.css";

const formatoNumero = (valor) =>
  valor === null || valor === undefined ? "—" : valor;

const normalizar = (valor) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const diferencia = (team) => {
  if (team.goalDifference != null)
    return Number(team.goalDifference);

  const gf = team.goalsFor ?? team.goals_for;
  const gc = team.goalsAgainst ?? team.goals_against;

  return gf == null || gc == null
    ? null
    : Number(gf) - Number(gc);
};

const resultadoEnTexto = {
  gana_local: "GANA LOCAL",
  empate: "EMPATE",
  gana_visitante: "GANA VISITANTE",
};

// =======================================================
// COMPONENTE DE ESCUDOS
// =======================================================

function Escudo({ src, nombre, className = "" }) {
  const [fallo, setFallo] = useState(false);

  useEffect(() => setFallo(false), [src]);

  return src && !fallo ? (
    <img
      className={`ft-crest ${className}`}
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFallo(true)}
    />
  ) : (
    <span
      className={`ft-crest-placeholder ${className}`}
      aria-hidden="true"
    >
      {String(nombre ?? "FC")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((s) => s[0])
        .join("")
        .toUpperCase() || "FC"}
    </span>
  );
}

// =======================================================
// TABLA DE POSICIONES
// =======================================================

function TablaPosiciones({
  equipos = [],
  getPositionColor,
  findLogo,
  simulada = false,
}) {
  return (
    <div
      className="ft-table-scroll"
      role="region"
      aria-label={
        simulada ? "Tabla simulada" : "Tabla de posiciones"
      }
      tabIndex={0}
    >
      <table className="ft-table">
        <thead>
          <tr>
            <th>POS</th>
            <th>EQUIPO</th>
            <th>PJ</th>
            <th>G</th>
            <th>E</th>
            <th>P</th>
            <th>GF</th>
            <th>GC</th>
            <th>DG</th>
            <th>PTS</th>
          </tr>
        </thead>

        <tbody>
          {equipos.map((team, idx) => {
            const rank =
              team.rank ?? team.position ?? idx + 1;

            const name =
              typeof team.team === "string"
                ? team.team
                : team.equipo ??
                  team.team?.name ??
                  "Equipo";

            const dg = diferencia(team);

            return (
              <tr
                key={
                  team.team_normalized ??
                  team.equipo ??
                  `${name}-${idx}`
                }
                className={
                  team.modificado ? "ft-row-modified" : ""
                }
              >
                <td>
                  <span
                    className={`ft-position ${
                      rank <= 3 ? "ft-position-top" : ""
                    } ${getPositionColor?.(rank) ?? ""}`}
                  >
                    {rank}
                  </span>
                </td>

                <td>
                  <div className="ft-team-name">
                    <Escudo
                      src={
                        team.logo ||
                        (simulada
                          ? findLogo?.(
                              team.team_normalized || name
                            )
                          : null)
                      }
                      nombre={name}
                      className="ft-table-crest"
                    />

                    <span>{name}</span>

                    {simulada && team.modificado && (
                      <span
                        className="ft-affected"
                        title="Estadísticas modificadas"
                      >
                        SIM
                      </span>
                    )}
                  </div>
                </td>

                <td>
                  {formatoNumero(
                    team.played ?? team.playedGames
                  )}
                </td>

                <td className="ft-stat-win">
                  {formatoNumero(team.won)}
                </td>

                <td>{formatoNumero(team.draw)}</td>

                <td>{formatoNumero(team.lost)}</td>

                <td>
                  {formatoNumero(
                    team.goalsFor ?? team.goals_for
                  )}
                </td>

                <td>
                  {formatoNumero(
                    team.goalsAgainst ?? team.goals_against
                  )}
                </td>

                <td
                  className={
                    dg == null
                      ? "ft-muted"
                      : dg >= 0
                      ? "ft-stat-positive"
                      : "ft-stat-negative"
                  }
                >
                  {dg == null
                    ? "—"
                    : dg > 0
                    ? `+${dg}`
                    : dg}
                </td>

                <td>
                  <strong className="ft-points">
                    {formatoNumero(
                      team.points ?? team.puntos
                    )}
                  </strong>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {equipos.length === 0 && (
        <p className="ft-empty">
          Todavía no hay posiciones disponibles.
        </p>
      )}
    </div>
  );
}

// =======================================================
// VISTA PRINCIPAL
// =======================================================

export default function TorneosView({
  tournaments = [],
  selectedTournament,
  setSelectedTournament,
  getPositionColor,

  seasons = [],
  selectedSeason,
  setSelectedSeason,

  fixtures = [],
  activeMatchday,
  setActiveMatchday,
  findLogo,

  selectedTeam,
  setSelectedTeam,
  handleSubmit,

  minPos,
  setMinPos,
  maxPos,
  setMaxPos,
  numFechas,
  setNumFechas,

  prediccionResultado = [],
  escenarioIndex = 0,
  setEscenarioIndex,

  tablaSimulada = [],
  grupoDelEquipo,
  tablaGrupo = [],

  modoPrediccion,
  setModoPrediccion,
  error,
  loading,
  prediccionInfo,
}) {
  const [panel, setPanel] = useState("tabla");

  const [busquedaEquipo, setBusquedaEquipo] =
    useState("");

  const [busquedaPartido, setBusquedaPartido] =
    useState("");

  const [limitePartidos, setLimitePartidos] =
    useState(24);

  const stage = Boolean(
    selectedTournament?.group_stage
  );

  const teams = selectedTournament?.teams;

  // Equipos para selección
  const seleccionables = useMemo(
    () =>
      stage && teams && !Array.isArray(teams)
        ? Object.values(teams).flat()
        : Array.isArray(teams)
        ? teams
        : [],
    [stage, teams]
  );

  // Buscador de equipos
  const equiposFiltrados = useMemo(
    () =>
      seleccionables.filter(
        (t) =>
          normalizar(t.team).includes(
            normalizar(busquedaEquipo)
          ) ||
          normalizar(t.team_normalized).includes(
            normalizar(busquedaEquipo)
          )
      ),
    [seleccionables, busquedaEquipo]
  );

  const result =
    prediccionResultado?.[escenarioIndex];

  // Fechas disponibles
  const matchdays = useMemo(
    () =>
      [...new Set(fixtures.map((f) => f.matchday))]
        .filter((md) => md != null)
        .sort((a, b) => Number(a) - Number(b)),
    [fixtures]
  );

  // Partidos filtrados
  const pendientes = useMemo(
    () =>
      fixtures
        .filter((f) =>
          activeMatchday == null
            ? f.matchday == null
            : f.matchday === activeMatchday
        )
        .filter((f) =>
          normalizar(
            `${f.home_team} ${f.away_team}`
          ).includes(normalizar(busquedaPartido))
        ),
    [fixtures, activeMatchday, busquedaPartido]
  );

  const pendientesVisibles = pendientes.slice(
    0,
    limitePartidos
  );

  const lider =
    seleccionables.length && !stage
      ? seleccionables[0]
      : null;

  const afectados =
    result?.ranking?.filter((e) => e.modificado)
      ?.length ?? 0;

  const temporada =
    selectedTournament?.season || selectedSeason;

  useEffect(() => {
    setLimitePartidos(24);
  }, [
    activeMatchday,
    busquedaPartido,
    selectedTournament?.id,
  ]);

  const seleccionarTorneo = (torneo) => {
    setSelectedTournament(torneo);
    setPanel("tabla");
    setBusquedaEquipo("");
    setBusquedaPartido("");
    setLimitePartidos(24);
  };

  const volver = () => {
    setSelectedTournament(null);
    setPanel("tabla");
  };

  return (
    <main className="tournaments-app">
      {/* Efectos de fondo */}
      <div
        className="ft-glow ft-glow-a"
        aria-hidden="true"
      />
      <div
        className="ft-glow ft-glow-b"
        aria-hidden="true"
      />

      <div className="ft-shell">
        {/* ===========================
            NAVBAR
        ============================ */}

        <nav
          className="ft-navbar"
          aria-label="Navegación principal"
        >
          <div className="ft-brand">
            <span className="ft-brand-icon">
              <Goal size={23} strokeWidth={2.3} />
            </span>

            <span>
              FUTURE
              <span className="ft-brand-highlight">
                TABLE
              </span>

              <small>FOOTBALL ANALYTICS</small>
            </span>
          </div>

          <div className="ft-nav-meta">
            <span className="ft-status-dot" />
            SIMULADOR DE COMPETICIONES

            <span className="ft-nav-version">
              / 26
            </span>
          </div>
        </nav>

        {/* ===========================
            PANTALLA INICIAL
        ============================ */}

        {!selectedTournament ? (
          <>
            <header className="ft-hero">
              <div className="ft-hero-copy">
                <div className="ft-eyebrow">
                  <span className="ft-eyebrow-line" />
                  LA NUEVA FORMA DE VIVIR EL FÚTBOL
                  <Sparkles size={14} />
                </div>

                <h1>
                  El partido no termina
                  <br />
                  <em>hasta que vos decís.</em>
                </h1>

                <p>
                  Explorá tus competiciones,
                  analizá cada tabla y descubrí qué
                  resultados pueden cambiar el
                  destino de tu equipo.
                </p>

                <div className="ft-hero-badges">
                  <span>
                    <Activity size={15} />
                    Posiciones
                  </span>

                  <span>
                    <Target size={15} />
                    Escenarios
                  </span>

                  <span>
                    <Zap size={15} />
                    Predicciones
                  </span>
                </div>
              </div>

              <div
                className="ft-hero-art"
                aria-hidden="true"
              >
                <div className="ft-art-rings">
                  <div className="ft-art-center">
                    <Trophy
                      size={78}
                      strokeWidth={1.15}
                    />
                  </div>
                </div>

                <span className="ft-art-label ft-art-label-a">
                  DATA / 01
                </span>

                <span className="ft-art-label ft-art-label-b">
                  PLAY YOUR FUTURE
                </span>
              </div>
            </header>

            {/* TORNEOS DISPONIBLES */}
            <section className="ft-list-section">
              <div className="ft-section-header">
                <div>
                  <div className="ft-kicker">
                    EXPLORAR
                  </div>

                  <h2>
                    Competiciones{" "}
                    <span>disponibles</span>
                  </h2>
                </div>

                <span className="ft-section-count">
                  {tournaments.length} TORNEOS
                </span>
              </div>

              <div className="ft-tournament-grid">
                {tournaments.map((t, i) => (
                  <button
                    type="button"
                    className="ft-tournament-card"
                    key={t.id}
                    onClick={() =>
                      seleccionarTorneo(t)
                    }
                  >
                    <div className="ft-card-top">
                      <span className="ft-card-number">
                        /{" "}
                        {String(i + 1).padStart(
                          2,
                          "0"
                        )}
                      </span>

                      <span className="ft-card-arrow">
                        <ArrowRight size={19} />
                      </span>
                    </div>

                    <div className="ft-card-crest-wrap">
                      <Escudo
                        src={t.logo}
                        nombre={t.name}
                        className="ft-card-crest"
                      />
                    </div>

                    <h3>{t.name}</h3>

                    <p>
                      {t.country} · Temporada{" "}
                      {t.season}
                    </p>

                    <div className="ft-card-bottom">
                      <span>
                        <Shield size={16} />
                        {t.teams_count ??
                          t.teams?.length ??
                          0}{" "}
                        equipos
                      </span>

                      <span>
                        VER TORNEO
                        <ArrowRight size={14} />
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {tournaments.length === 0 &&
                !loading && (
                  <p className="ft-empty">
                    No hay competiciones disponibles.
                  </p>
                )}
            </section>
          </>
        ) : (
          <>
            {/* ===========================
                HEADER TORNEO
            ============================ */}

            <header className="ft-selected-hero">
              <button
                type="button"
                className="ft-back"
                onClick={volver}
              >
                <ArrowLeft size={16} />
                Todas las competiciones
              </button>

              <div className="ft-selected-grid">
                <div className="ft-selected-identity">
                  <div className="ft-league-crest">
                    <Escudo
                      src={selectedTournament.logo}
                      nombre={selectedTournament.name}
                      className="ft-league-img"
                    />
                  </div>

                  <div>
                    <div className="ft-kicker">
                      CENTRO DE COMPETICIÓN

                      <span className="ft-kicker-slash">
                        / {selectedTournament.id}
                      </span>
                    </div>

                    <h1>
                      {selectedTournament.name}
                    </h1>

                    <p>
                      <span className="ft-status-dot" />

                      Temporada {temporada}

                      <span className="ft-separator">
                        ·
                      </span>

                      {selectedTournament.country}
                    </p>
                  </div>
                </div>

                <div className="ft-selected-metrics">
                  <div>
                    <span>EQUIPOS</span>

                    <strong>
                      {seleccionables.length ||
                        selectedTournament.teams_count ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>PARTIDOS CARGADOS</span>

                    <strong>
                      {fixtures.length}
                    </strong>
                  </div>

                  <div>
                    <span>FORMATO</span>

                    <strong className="ft-metric-format">
                      {stage ? "GRUPOS" : "LIGA"}
                    </strong>
                  </div>
                </div>
              </div>
            </header>

            {/* ===========================
                NAVEGACIÓN POR PESTAÑAS
            ============================ */}

            <div
              className="ft-tabs"
              role="tablist"
              aria-label="Secciones del torneo"
            >
              <button
                type="button"
                role="tab"
                aria-selected={panel === "tabla"}
                className={
                  panel === "tabla"
                    ? "ft-tab active"
                    : "ft-tab"
                }
                onClick={() => setPanel("tabla")}
              >
                <BarChart3 size={18} />
                Clasificación
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={panel === "simulador"}
                className={
                  panel === "simulador"
                    ? "ft-tab active"
                    : "ft-tab"
                }
                onClick={() =>
                  setPanel("simulador")
                }
              >
                <WandSparkles size={18} />
                Simulador

                <span className="ft-tab-new">
                  LAB
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={panel === "partidos"}
                className={
                  panel === "partidos"
                    ? "ft-tab active"
                    : "ft-tab"
                }
                onClick={() =>
                  setPanel("partidos")
                }
              >
                <CalendarDays size={18} />
                Partidos

                <span className="ft-tab-count">
                  {fixtures.length}
                </span>
              </button>
            </div>

            {/* ===========================
                TABLA DE POSICIONES
            ============================ */}

            {panel === "tabla" && (
              <section
                className="ft-panel ft-panel-enter"
                role="tabpanel"
              >
                <div className="ft-panel-heading">
                  <div>
                    <div className="ft-kicker">
                      DATOS DE TEMPORADA
                    </div>

                    <h2>
                      <Trophy size={27} />
                      Tabla de posiciones
                    </h2>

                    <p>
                      Seguí el rendimiento de todos
                      los equipos durante la temporada.
                    </p>
                  </div>

                  <div className="ft-season-picker">
                    <label htmlFor="ft-season">
                      TEMPORADA
                    </label>

                    <select
                      id="ft-season"
                      value={selectedSeason}
                      onChange={(e) =>
                        setSelectedSeason(
                          e.target.value
                        )
                      }
                    >
                      {seasons.map((s) => (
                        <option
                          value={s}
                          key={s}
                        >
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* LÍDER */}
                {lider && (
                  <div className="ft-leader-banner">
                    <div className="ft-leader-medal">
                      <Trophy size={22} />
                    </div>

                    <div>
                      <small>
                        LÍDER DE LA TABLA
                      </small>

                      <strong>
                        {lider.team}
                      </strong>
                    </div>

                    <div className="ft-leader-points">
                      <strong>
                        {lider.points}
                      </strong>

                      <span>PTS</span>
                    </div>
                  </div>
                )}

                {/* TABLAS */}
                {stage &&
                teams &&
                !Array.isArray(teams) ? (
                  Object.entries(teams).map(
                    ([grupo, equipos]) => (
                      <div
                        key={grupo}
                        className="ft-group"
                      >
                        <h3>
                          <Layers3 size={18} />
                          GRUPO {grupo}
                        </h3>

                        <TablaPosiciones
                          equipos={equipos}
                          getPositionColor={
                            getPositionColor
                          }
                          findLogo={findLogo}
                        />
                      </div>
                    )
                  )
                ) : (
                  <TablaPosiciones
                    equipos={seleccionables}
                    getPositionColor={
                      getPositionColor
                    }
                    findLogo={findLogo}
                  />
                )}

                <div className="ft-hint">
                  <Info size={16} />

                  <span>
                    Las posiciones se muestran
                    según los datos disponibles.
                    La diferencia de gol puede
                    existir aunque falten GF y GC.
                  </span>
                </div>

                <button
                  type="button"
                  className="ft-inline-cta"
                  onClick={() =>
                    setPanel("simulador")
                  }
                >
                  ¿Y si los próximos partidos cambian
                  todo?

                  <strong>
                    PROBAR SIMULADOR
                    <ArrowRight size={16} />
                  </strong>
                </button>
              </section>
            )}

            {/* ===========================
                SIMULADOR
            ============================ */}

            {panel === "simulador" && (
              <div
                className="ft-panel-enter"
                role="tabpanel"
              >
                {/* HERO SIMULADOR */}
                <section className="ft-simulator-intro">
                  <div className="ft-kicker">
                    <Flame size={14} />
                    PREDICTION ENGINE
                  </div>

                  <h2>
                    Simulá lo{" "}
                    <em>imposible.</em>
                  </h2>

                  <p>
                    Elegí un equipo, definí el
                    objetivo y explorá resultados
                    que lo puedan llevar a esa
                    posición.
                  </p>

                  <div
                    className="ft-sim-deco"
                    aria-hidden="true"
                  >
                    <Target
                      size={124}
                      strokeWidth={0.8}
                    />
                  </div>
                </section>

                {/* PASO 1 - EQUIPO */}
                <section className="ft-panel ft-select-panel">
                  <div className="ft-panel-heading">
                    <div>
                      <div className="ft-kicker">
                        PASO 01 / ELEGÍ TU EQUIPO
                      </div>

                      <h2>
                        <Shield size={26} />
                        ¿Por quién jugamos?
                      </h2>

                      <p>
                        Buscá y seleccioná el equipo
                        que querés analizar.
                      </p>
                    </div>

                    <div className="ft-search">
                      <Search size={18} />

                      <input
                        aria-label="Buscar equipo"
                        placeholder="Buscar equipo…"
                        value={busquedaEquipo}
                        onChange={(e) =>
                          setBusquedaEquipo(
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="ft-team-grid">
                    {equiposFiltrados.map((team) => (
                      <button
                        type="button"
                        key={
                          team.team_normalized ||
                          team.team
                        }
                        className={
                          selectedTeam?.team_normalized ===
                          team.team_normalized
                            ? "ft-team-card selected"
                            : "ft-team-card"
                        }
                        onClick={() =>
                          setSelectedTeam(team)
                        }
                      >
                        <Escudo
                          src={team.logo}
                          nombre={team.team}
                          className="ft-team-card-crest"
                        />

                        <span>
                          {team.team}
                        </span>

                        {selectedTeam?.team_normalized ===
                        team.team_normalized ? (
                          <Check
                            size={17}
                            className="ft-check"
                          />
                        ) : (
                          <ArrowRight
                            size={15}
                            className="ft-team-arrow"
                          />
                        )}
                      </button>
                    ))}
                  </div>

                  {equiposFiltrados.length === 0 && (
                    <div className="ft-empty">
                      No encontramos equipos con
                      ese nombre.
                    </div>
                  )}
                </section>

                {/* PASO 2 - CONFIGURACIÓN */}
                {selectedTeam && (
                  <section className="ft-panel ft-config-panel">
                    <div className="ft-panel-heading">
                      <div>
                        <div className="ft-kicker">
                          PASO 02 / CONFIGURÁ EL OBJETIVO
                        </div>

                        <h2>
                          <Target size={26} />
                          Diseñá tu escenario
                        </h2>

                        <p>
                          Seleccionaste a{" "}
                          <strong>
                            {selectedTeam.team}
                          </strong>
                          . ¿Hasta dónde puede llegar?
                        </p>
                      </div>

                      <div className="ft-selected-team-chip">
                        <Escudo
                          src={selectedTeam.logo}
                          nombre={selectedTeam.team}
                          className="ft-chip-crest"
                        />

                        {selectedTeam.team}
                      </div>
                    </div>

                    <form
                      onSubmit={handleSubmit}
                      className="ft-prediction-form"
                    >
                      <div className="ft-form-grid">
                        <label className="ft-form-row">
                          <span>
                            Puesto más alto
                          </span>

                          <input
                            type="number"
                            min="1"
                            max={
                              stage && grupoDelEquipo
                                ? grupoDelEquipo[1].length
                                : seleccionables.length
                            }
                            value={minPos}
                            onChange={(e) =>
                              setMinPos(e.target.value)
                            }
                            required
                          />
                        </label>

                        <label className="ft-form-row">
                          <span>
                            Puesto más bajo
                          </span>

                          <input
                            type="number"
                            min="1"
                            max={
                              stage && grupoDelEquipo
                                ? grupoDelEquipo[1].length
                                : seleccionables.length
                            }
                            value={maxPos}
                            onChange={(e) =>
                              setMaxPos(e.target.value)
                            }
                            required
                          />
                        </label>

                        <label className="ft-form-row">
                          <span>
                            Fechas a evaluar
                          </span>

                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={numFechas}
                            onChange={(e) =>
                              setNumFechas(
                                e.target.value
                              )
                            }
                            required
                          />
                        </label>

                        <label className="ft-form-row">
                          <span>
                            Tipo de simulación
                          </span>

                          <select
                            value={modoPrediccion}
                            onChange={(e) =>
                              setModoPrediccion(
                                e.target.value
                              )
                            }
                          >
                            <option value="simple">
                              Ganador / empate
                            </option>

                            <option value="goles">
                              Marcadores exactos
                            </option>
                          </select>
                        </label>
                      </div>

                      <button
                        className="ft-primary-button"
                        type="submit"
                        disabled={loading}
                      >
                        <Zap size={20} />

                        {loading
                          ? "CALCULANDO…"
                          : "GENERAR ESCENARIOS"}

                        <ArrowRight size={18} />
                      </button>
                    </form>
                  </section>
                )}

                {/* INFORMACIÓN DE PREDICCIÓN */}
                {prediccionInfo && (
                  <div
                    className="ft-info-banner"
                    role="status"
                  >
                    <Info size={18} />
                    {prediccionInfo}
                  </div>
                )}

                {/* PASO 3 - RESULTADOS */}
                {result && (
                  <section className="ft-results ft-panel">
                    <div className="ft-panel-heading">
                      <div>
                        <div className="ft-kicker">
                          PASO 03 / RESULTADOS DEL LABORATORIO
                        </div>

                        <h2>
                          <Sparkles size={26} />
                          Un futuro posible
                        </h2>

                        <p>
                          Ejemplo {escenarioIndex + 1} de{" "}
                          {prediccionResultado.length}.
                          Los escenarios son
                          simulaciones, no pronósticos.
                        </p>
                      </div>

                      <span className="ft-result-count">
                        {afectados} EQUIPOS AFECTADOS
                      </span>
                    </div>

                    {/* PARTIDOS SIMULADOS */}
                    <div className="ft-results-head">
                      <span>
                        <Activity size={17} />
                        ENFRENTAMIENTOS SIMULADOS
                      </span>

                      <span>
                        {result.escenario?.length ?? 0}{" "}
                        PARTIDOS
                      </span>
                    </div>

                    <div className="ft-score-grid">
                      {result.escenario?.map((p) => (
                        <div
                          key={p.partido_id}
                          className="ft-score-card"
                        >
                          <div className="ft-score-team">
                            <Escudo
                              src={findLogo?.(
                                p.equipo_local
                              )}
                              nombre={p.equipo_local}
                              className="ft-score-crest"
                            />

                            <span>
                              {p.equipo_local.replace(
                                /_/g,
                                " "
                              )}
                            </span>
                          </div>

                          <div className="ft-score-result">
                            <strong>
                              {p.goles_local != null &&
                              p.goles_visitante != null
                                ? `${p.goles_local} : ${p.goles_visitante}`
                                : "VS"}
                            </strong>

                            <small>
                              {p.goles_local != null
                                ? "RESULTADO"
                                : resultadoEnTexto[
                                    p.resultado
                                  ] ?? p.resultado}
                            </small>
                          </div>

                          <div className="ft-score-team">
                            <Escudo
                              src={findLogo?.(
                                p.equipo_visitante
                              )}
                              nombre={
                                p.equipo_visitante
                              }
                              className="ft-score-crest"
                            />

                            <span>
                              {p.equipo_visitante.replace(
                                /_/g,
                                " "
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* TABLA SIMULADA */}
                    <div className="ft-results-head ft-results-head-table">
                      <span>
                        <BarChart3 size={17} />
                        CLASIFICACIÓN SIMULADA

                        {stage && grupoDelEquipo
                          ? ` · GRUPO ${grupoDelEquipo[0]}`
                          : ""}
                      </span>

                      <span>
                        <span className="ft-mini-dot" />
                        FILAS MARCADAS = SIMULADAS
                      </span>
                    </div>

                    <TablaPosiciones
                      equipos={
                        stage
                          ? tablaGrupo
                          : tablaSimulada
                      }
                      getPositionColor={
                        getPositionColor
                      }
                      findLogo={findLogo}
                      simulada
                    />

                    {/* PAGINACIÓN */}
                    <div className="ft-pagination">
                      <span>
                        ESCENARIO{" "}
                        <strong>
                          {String(
                            escenarioIndex + 1
                          ).padStart(2, "0")}
                        </strong>{" "}
                        /{" "}
                        {String(
                          prediccionResultado.length
                        ).padStart(2, "0")}
                      </span>

                      <div>
                        <button
                          type="button"
                          onClick={() =>
                            setEscenarioIndex((i) =>
                              Math.max(0, i - 1)
                            )
                          }
                          disabled={
                            escenarioIndex === 0
                          }
                          aria-label="Escenario anterior"
                        >
                          <ChevronLeft size={19} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setEscenarioIndex((i) =>
                              Math.min(
                                prediccionResultado.length -
                                  1,
                                i + 1
                              )
                            )
                          }
                          disabled={
                            escenarioIndex >=
                            prediccionResultado.length -
                              1
                          }
                          aria-label="Escenario siguiente"
                        >
                          <ChevronRight size={19} />
                        </button>
                      </div>
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* ===========================
                PARTIDOS PENDIENTES
            ============================ */}

            {panel === "partidos" && (
              <section
                className="ft-panel ft-panel-enter"
                role="tabpanel"
              >
                <div className="ft-panel-heading">
                  <div>
                    <div className="ft-kicker">
                      AGENDA DE LA COMPETICIÓN
                    </div>

                    <h2>
                      <CalendarDays size={26} />
                      Partidos pendientes
                    </h2>

                    <p>
                      Explorá todos los
                      enfrentamientos cargados en
                      el sistema.
                    </p>
                  </div>

                  <div className="ft-search">
                    <Search size={18} />

                    <input
                      aria-label="Buscar partido"
                      placeholder="Buscar equipo…"
                      value={busquedaPartido}
                      onChange={(e) =>
                        setBusquedaPartido(
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>

                {/* AVISO MNT */}
                {String(selectedTournament.id) ===
                  "9997" && (
                  <div className="ft-info-banner">
                    <Info size={18} />

                    <span>
                      En MNT los cruces cargados son
                      combinaciones generadas,{" "}
                      <strong>
                        no el calendario oficial
                      </strong>
                      . Eliminá de Prolog los
                      partidos ya disputados.
                    </span>
                  </div>
                )}

                {/* SELECTOR FECHAS */}
                {matchdays.length > 0 && (
                  <div
                    className="ft-matchdays"
                    aria-label="Seleccionar fecha"
                  >
                    {matchdays.map((md) => (
                      <button
                        type="button"
                        key={md}
                        className={
                          activeMatchday === md
                            ? "ft-matchday active"
                            : "ft-matchday"
                        }
                        onClick={() =>
                          setActiveMatchday(md)
                        }
                      >
                        <span>FECHA</span>

                        <strong>
                          {String(md).padStart(
                            2,
                            "0"
                          )}
                        </strong>
                      </button>
                    ))}
                  </div>
                )}

                {/* RESUMEN */}
                <div className="ft-fixture-meta">
                  <span>
                    {pendientes.length} ENFRENTAMIENTOS
                  </span>

                  <span>
                    {activeMatchday != null
                      ? `FECHA ${activeMatchday}`
                      : "PENDIENTES"}
                  </span>
                </div>

                {/* TARJETAS DE PARTIDOS */}
                <div className="ft-fixture-grid">
                  {pendientesVisibles.map((f) => (
                    <article
                      className="ft-fixture-card"
                      key={f.match_id}
                    >
                      <div className="ft-fixture-top">
                        <span>
                          PARTIDO #{f.match_id}
                        </span>

                        <span>
                          <Clock3 size={14} />

                          {f.utc_date
                            ? new Date(
                                f.utc_date
                              ).toLocaleDateString(
                                "es-AR"
                              )
                            : "FECHA NO CONFIRMADA"}
                        </span>
                      </div>

                      <div className="ft-fixture-versus">
                        <div>
                          <Escudo
                            src={findLogo?.(
                              f.home_team
                            )}
                            nombre={f.home_team}
                            className="ft-fixture-crest"
                          />

                          <span>
                            {f.home_team.replace(
                              /_/g,
                              " "
                            )}
                          </span>
                        </div>

                        <b>VS</b>

                        <div>
                          <Escudo
                            src={findLogo?.(
                              f.away_team
                            )}
                            nombre={f.away_team}
                            className="ft-fixture-crest"
                          />

                          <span>
                            {f.away_team.replace(
                              /_/g,
                              " "
                            )}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {/* SIN RESULTADOS */}
                {pendientes.length === 0 && (
                  <div className="ft-empty">
                    <Compass size={28} />
                    No hay partidos que coincidan
                    con tu búsqueda.
                  </div>
                )}

                {/* CARGAR MÁS */}
                {pendientes.length >
                  limitePartidos && (
                  <button
                    type="button"
                    className="ft-load-more"
                    onClick={() =>
                      setLimitePartidos(
                        (n) => n + 24
                      )
                    }
                  >
                    MOSTRAR MÁS PARTIDOS

                    <ArrowRight size={17} />

                    <span>
                      (
                      {pendientes.length -
                        limitePartidos}{" "}
                      restantes)
                    </span>
                  </button>
                )}
              </section>
            )}
          </>
        )}

        {/* ===========================
            ERRORES Y CARGA
        ============================ */}

        {error && (
          <div
            className="ft-error"
            role="alert"
          >
            <Info size={17} />
            {error}
          </div>
        )}

        {loading && (
          <div
            className="ft-loading"
            role="status"
          >
            <span className="ft-spinner" />
            Actualizando datos…
          </div>
        )}

        {/* ===========================
            FOOTER
        ============================ */}

        <footer className="ft-footer">
          <span>
            FUTURETABLE <span>© 2026</span>
          </span>

          <span>
            BUILT FOR THE BEAUTIFUL GAME

            <span className="ft-footer-star">
              ✦
            </span>
          </span>
        </footer>
      </div>
    </main>
  );
}
