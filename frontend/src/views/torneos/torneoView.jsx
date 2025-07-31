import { Calendar, Trophy } from "lucide-react";
import React, { useMemo } from "react";
import "./torneoView.css";
export default function TorneosView({
  tournaments,
  selectedTournament,
  setSelectedTournament,
  getPositionColor,
  seasons,
  selectedSeason,
  setSelectedSeason,
  fixtures,
  activeMatchday,
  setActiveMatchday,
  findLogo,
  selectedTeam,
  setSelectedTeam,
  handleSubmit,
  minPos, setMinPos,
  maxPos, setMaxPos,
  numFechas, setNumFechas,
  prediccionResultado,
  escenarioIndex,
  setEscenarioIndex,
  tablaSimulada,
  grupoDelEquipo,
  tablaGrupo
}) {

  const esFaseDeGrupos = grupoDelEquipo !== null && grupoDelEquipo.length > 0;

  // Detectar si la tabla de posiciones viene en formato grupos (objeto) o liga normal (array)
  const isGroupStage = selectedTournament &&
    selectedTournament.teams &&
    !Array.isArray(selectedTournament.teams) &&
    typeof selectedTournament.teams === "object";

  // Equipos planos para el grid de selección (aplanar grupos si es necesario)
  const teamsForSelection = !isGroupStage
    ? selectedTournament?.teams ?? []
    : Object.values(selectedTournament.teams).flat();

  return (
    <div className="container">
      <div className="inner-container">
        <header className="title-section">
          <h1>Torneos de Fútbol</h1>
          <p>Selecciona un torneo para ver la tabla de posiciones</p>
        </header>

        {!selectedTournament ? (
          <div className="tournaments-grid">
            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="tournament-card"
                onClick={() => setSelectedTournament(tournament)}
              >
                <img
                  src={tournament.logo}
                  alt={`${tournament.name} logo`}
                  className="tournament-logo"
                  loading="lazy"
                />
                <h3 className="tournament-name">{tournament.name}</h3>
                <div className="badges">
                  <span className="badge country">{tournament.country}</span>
                  <span className="badge season">{tournament.season}</span>
                </div>
                <div className="tournament-info">
                  <div className="info-item">
                    <img src={tournament.flag} alt={`${tournament.country} flag`} className="flag" loading="lazy" />
                    <span>{tournament.teams_count || tournament.teams.length} equipos</span>
                  </div>
                  <div className="info-item">
                    <Calendar className="icon" />
                    <span>En curso</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="header-selected">
              <button className="back-button" onClick={() => setSelectedTournament(null)}>← Volver</button>
              <div className="tournament-header">
                <img src={selectedTournament.logo} alt={`${selectedTournament.name} logo`} className="selected-logo" />
                <div>
                  <h2>{selectedTournament.name}</h2>
                  <p>{selectedTournament.country} • {selectedTournament.season}</p>
                </div>
              </div>
            </div>

            <section className="table-container">
              <h3 className="table-title">
                <Trophy className="icon trophy-icon" />
                Tabla de Posiciones
              </h3>

              <div className="season-selector-wrapper">
                <label htmlFor="season" className="season-label">Temporada:</label>
                <select
                  id="season"
                  className="season-selector"
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                >
                  {seasons.map((season) => (
                    <option key={season} value={season}>
                      {season}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tabla liga normal */}
              {!isGroupStage && Array.isArray(selectedTournament.teams) && (
                <table className="positions-table">
                  <thead>
                    <tr>
                      <th>Pos</th>
                      <th>Equipo</th>
                      <th>PJ</th>
                      <th>G</th>
                      <th>E</th>
                      <th>P</th>
                      <th>GF</th>
                      <th>GC</th>
                      <th>DG</th>
                      <th>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTournament.teams.map((team, index) => (
                      <tr key={index} className="table-row">
                        <td>
                          <span className={getPositionColor(team.rank)}>
                            {team.rank}
                          </span>
                        </td>
                        <td className="team-name">
                          {team.logo && (
                            <img src={team.logo} alt={`${team.team} logo`} className="team-logo" />
                          )}
                          {team.team}
                        </td>
                        <td>{team.played}</td>
                        <td className="text-green">{team.won}</td>
                        <td className="text-yellow">{team.draw}</td>
                        <td className="text-red">{team.lost}</td>
                        <td>{team.goalsFor ?? team.goals_for ?? "-"}</td>
                        <td>{team.goalsAgainst ?? team.goals_against ?? "-"}</td>
                        <td className={`${((team.goalsFor ?? team.goals_for) - (team.goalsAgainst ?? team.goals_against) >= 0) ? "text-green" : "text-red"} font-semibold`}>
                          {((team.goalsFor ?? team.goals_for) - (team.goalsAgainst ?? team.goals_against)) > 0 ? "+" : ""}
                          {((team.goalsFor ?? team.goals_for) - (team.goalsAgainst ?? team.goals_against))}
                        </td>
                        <td className="text-blue font-bold">{team.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Tabla fase de grupos */}
              {isGroupStage && (
                <>
                  {Object.entries(selectedTournament.teams).map(([groupId, equipos]) => (
                    <section key={groupId} className="group-standings">
                      <h4>Grupo {groupId}</h4>
                      <table className="positions-table">
                        <thead>
                          <tr>
                            <th>Pos</th>
                            <th>Equipo</th>
                            <th>PJ</th>
                            <th>G</th>
                            <th>E</th>
                            <th>P</th>
                            <th>GF</th>
                            <th>GC</th>
                            <th>DG</th>
                            <th>Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {equipos.map((team, idx) => (
                            <tr key={idx} className="table-row">
                              <td>
                                <span className={getPositionColor(team.position ?? team.rank)}>
                                  {team.position ?? team.rank}
                                </span>
                              </td>
                              <td className="team-name">
                                {team.logo && (
                                  <img src={team.logo} alt={`${team.team} logo`} className="team-logo" />
                                )}
                                {team.team}
                              </td>
                              <td>{team.playedGames ?? team.played ?? "-"}</td>
                              <td className="text-green">{team.won ?? "-"}</td>
                              <td className="text-yellow">{team.draw ?? "-"}</td>
                              <td className="text-red">{team.lost ?? "-"}</td>
                              <td>{team.goalsFor ?? team.goals_for ?? "-"}</td>
                              <td>{team.goalsAgainst ?? team.goals_against ?? "-"}</td>
                              <td className={`${((team.goalsFor ?? team.goals_for) - (team.goalsAgainst ?? team.goals_against) >= 0) ? "text-green" : "text-red"} font-semibold`}>
                                {((team.goalsFor ?? team.goals_for) - (team.goalsAgainst ?? team.goals_against)) > 0 ? "+" : ""}
                                {((team.goalsFor ?? team.goals_for) - (team.goalsAgainst ?? team.goals_against))}
                              </td>
                              <td className="text-blue font-bold">{team.points ?? "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  ))}
                </>
              )}
            </section>

            <div className="team-grid-section">
              <h3>Selecciona un equipo para predecir posiciones</h3>
              <div className="team-grid">
                {teamsForSelection.map((team) => (
                  <div
                    key={team.team}
                    className={`team-card ${selectedTeam?.team === team.team ? 'selected' : ''}`}
                    onClick={() => setSelectedTeam(team)}
                  >
                    <img src={team.logo} alt={team.team} className="team-logo-grid" />
                    <p>{team.team}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Formulario si hay equipo seleccionado */}
            {selectedTeam && (
              <div className="prediction-form">
                <h4>Predicción para: <strong>{selectedTeam.team}</strong></h4>
                <form onSubmit={handleSubmit}>
                  <div className="form-row">
                    <label>Puesto más alto:</label>
                    <input
                      type="number"
                      min="1"
                      value={minPos}
                      onChange={(e) => setMinPos(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <label>Puesto más bajo:</label>
                    <input
                      type="number"
                      min="1"
                      value={maxPos}
                      onChange={(e) => setMaxPos(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <label>Cantidad de fechas a evaluar:</label>
                    <input
                      type="number"
                      min="1"
                      value={numFechas}
                      onChange={(e) => setNumFechas(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="submit-button">Evaluar escenarios</button>
                </form>
              </div>
            )}
            {Array.isArray(prediccionResultado) &&
              prediccionResultado.length > escenarioIndex &&
              prediccionResultado[escenarioIndex] &&
              prediccionResultado[escenarioIndex].escenario &&
              prediccionResultado[escenarioIndex].ranking && (
                <div className="pizarra-escenario">
                  <h4>Resultados simulados:</h4>
                  <ul>
                    {prediccionResultado[escenarioIndex].escenario.map((partido, i) => {
                      if ("partido" in partido && "resultado" in partido) {
                        // Segundo JSON
                        const [home, away] = partido.partido.split(" vs ");
                        return (
                          <li key={i} className="match-line">
                            <img src={findLogo(home)} alt={home} className="tiny-logo" /> {home}
                            <span className="vs-text">vs</span>
                            <img src={findLogo(away)} alt={away} className="tiny-logo" /> {away}
                            <strong>{partido.resultado}</strong>
                          </li>
                        );
                      } else if (
                        "partido_id" in partido &&
                        "equipo_local" in partido &&
                        "equipo_visitante" in partido
                      ) {
                        // Primer JSON
                        return (
                          <li key={partido.partido_id} className="match-line">
                            <img src={findLogo(partido.equipo_local)} alt={partido.equipo_local} className="tiny-logo" /> {partido.equipo_local} {partido.goles_local}
                            <span className="vs-text">vs</span>
                            <img src={findLogo(partido.equipo_visitante)} alt={partido.equipo_visitante} className="tiny-logo" /> {partido.equipo_visitante} {partido.goles_visitante}
                          </li>
                        );
                      } else {
                        return (
                          <li key={i} className="match-line">
                            Datos del partido no reconocidos
                          </li>
                        );
                      }
                    })}
                  </ul>
                  <h4 className="mt-4">Tabla de posiciones:</h4>

                  {esFaseDeGrupos ? (
                    <>
                      {grupoDelEquipo && (
                        <h5 style={{ textAlign: 'center' }}>Grupo {grupoDelEquipo[0]}</h5>
                      )}
                      <table className="ranking-table">
                        <thead>
                          <tr>
                            <th>Pos</th>
                            <th>Equipo</th>
                            <th>PJ</th>
                            <th>G</th>
                            <th>E</th>
                            <th>P</th>
                            <th>GF</th>
                            <th>GC</th>
                            <th>DG</th>
                            <th>Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tablaGrupo.map((team, i) => {
                            const dg = (team.goals_for ?? 0) - (team.goals_against ?? 0);
                            return (
                              <tr key={i}>
                                <td>{i + 1}</td>
                                <td>
                                  <img src={findLogo(team.team)} alt={`${team.team} logo`} className="small-logo" />
                                  {team.team}
                                </td>
                                <td>{team.played ?? 0}</td>
                                <td className="text-green">{team.won ?? 0}</td>
                                <td className="text-yellow">{team.draw ?? 0}</td>
                                <td className="text-red">{team.lost ?? 0}</td>
                                <td>{team.goals_for ?? 0}</td>
                                <td>{team.goals_against ?? 0}</td>
                                <td className={`${dg >= 0 ? "text-green" : "text-red"} font-semibold`}>
                                  {dg > 0 ? "+" : ""}
                                  {dg}
                                </td>
                                <td className="text-blue font-bold">{team.points ?? 0}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  ) : (
                    <table className="ranking-table">
                      <thead>
                        <tr>
                          <th>Pos</th>
                          <th>Equipo</th>
                          <th>Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prediccionResultado &&
                          prediccionResultado[escenarioIndex]?.ranking
                          ? prediccionResultado[escenarioIndex].ranking.map((team, i) => {
                            const isModified = team.modificado === true;
                            return (
                              <tr key={i} className={isModified ? "row-modificado" : ""}>
                                <td>{i + 1}</td>
                                <td>
                                  <img
                                    src={findLogo(team.equipo)}
                                    alt={`${team.equipo} logo`}
                                    className="small-logo"
                                  />
                                  {team.equipo}
                                  {isModified && (
                                    <span className="modificado-label" title="Posición modificada">
                                      ✱ Modificado
                                    </span>
                                  )}
                                </td>
                                <td className="text-blue font-bold">{team.puntos ?? 0}</td>
                              </tr>
                            );
                          })
                          : null}
                      </tbody>
                    </table>
                  )}


                  <div className="pizarra-controls">
                    <button
                      onClick={() => setEscenarioIndex((prev) => Math.max(prev - 1, 0))}
                      disabled={escenarioIndex === 0}
                    >
                      ← Anterior
                    </button>
                    <button
                      onClick={() => setEscenarioIndex((prev) => Math.min(prev + 1, prediccionResultado.length - 1))}
                      disabled={escenarioIndex === prediccionResultado.length - 1}
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}

            {fixtures.length > 0 && (
              <div className="fixtures-section">
                <h3>Partidos pendientes</h3>

                <div className="matchday-selector">
                  {Array.from(new Set(fixtures.map(f => f.matchday))).sort((a, b) => a - b).map((md) => (
                    <button
                      key={md}
                      onClick={() => setActiveMatchday(md)}
                      className={`matchday-btn ${md === activeMatchday ? 'active' : ''}`}
                    >
                      Fecha {md}
                    </button>
                  ))}
                </div>

                <ul className="fixtures-list">
                  {fixtures
                    .filter(f => f.matchday === activeMatchday)
                    .map(f => (
                      <li key={f.match_id} className="flex items-center gap-2">
                        <img src={findLogo(f.home_team)} className="small-logo" alt="" />
                        {f.home_team}
                        <span className="text-sm text-gray-400">vs</span>
                        <img src={findLogo(f.away_team)} className="small-logo" alt="" />
                        {f.away_team}
                        <em className="ml-2 text-xs text-gray-500">{new Date(f.utc_date).toLocaleString()}</em>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </>
        )
        }
      </div >
    </div >
  );
}
