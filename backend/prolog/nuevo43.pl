% -------------------------------
% Posibles resultados simples
% -------------------------------
resultado_simple(gana_local).
resultado_simple(empate).
resultado_simple(gana_visitante).

% -------------------------------
% Máximo de puntos posibles
% -------------------------------
puntos_maximos_posibles(Equipo, Fechas, PMax) :-
    puntos(Equipo, PAct),
    PMax is PAct + Fechas * 3.

% -------------------------------
% Equipos con chance de estar en el rango dado
% -------------------------------
equipos_competencia_para(EquipoObjetivo, PosMin, PosMax, Fechas, EquiposRelevantes) :-
    findall(Eq, puntos(Eq, _), Todos),
    include(puede_estar_en_rango(PosMin, PosMax, Fechas), Todos, Posibles),
    append(Posibles, [EquipoObjetivo], TodosRelevantes),
    list_to_set(TodosRelevantes, EquiposRelevantes).

puede_estar_en_rango(PosMin, PosMax, Fechas, Equipo) :-
    puntos(Equipo, P0),
    PMax is P0 + Fechas * 3,
    findall((E,P), puntos(E,P), BasePuntos),
    % Simula que el equipo gana todos sus partidos
    actualizar_puntajes_ficticio(Equipo, Fechas, BasePuntos, Simulados),
    sort(2, @>=, Simulados, Ranking),
    nth1(Pos, Ranking, (Equipo, _)),
    Pos >= PosMin,
    Pos =< PosMax.

actualizar_puntajes_ficticio(Equipo, Fechas, Base, Result) :-
    Bonus is Fechas * 3,
    ( select((Equipo, P0), Base, Resto) ->
        P1 is P0 + Bonus,
        Result = [(Equipo, P1)|Resto]
    ; Result = [(Equipo, Bonus)|Base]
    ).
% -------------------------------
% Filtrar partidos relevantes
% -------------------------------
partidos_relevantes(Equipos, PartidosFiltrados) :-
    findall(partido(ID, L, V), partido(ID, L, V), Todos),
    include(partido_interesa(Equipos), Todos, PartidosFiltrados).

partido_interesa(Equipos, partido(_, L, V)) :-
    member(L, Equipos);
    member(V, Equipos).

% -------------------------------
% Simulación de resultados simples
% -------------------------------
simular_escenario_simple([], [], []).
simular_escenario_simple([partido(ID, L, V)|Partidos], [Resultado|Resultados], [partido(ID, L, V, Resultado)|Escenario]) :-
    resultado_simple(Resultado),
    simular_escenario_simple(Partidos, Resultados, Escenario).

% -------------------------------
% Aplicar resultado simple a puntajes
% -------------------------------
sumar_resultado_simple(gana_local, L, V, [(L, 3), (V, 0)]).
sumar_resultado_simple(empate, L, V, [(L, 1), (V, 1)]).
sumar_resultado_simple(gana_visitante, L, V, [(L, 0), (V, 3)]).

acumular_puntos([], [], []).
acumular_puntos([(Equipo, P)|T], Acc, Res) :-
    ( select((Equipo, P0), Acc, Resto) -> P1 is P0 + P, Acc1 = [(Equipo, P1)|Resto]
    ; Acc1 = [(Equipo, P)|Acc]
    ),
    acumular_puntos(T, Acc1, Res).
acumular_puntos([], Acc, Acc).

actualizar_puntajes([], Acum, Acum).
actualizar_puntajes([partido(_, L, V, R)|T], Acum, Res) :-
    sumar_resultado_simple(R, L, V, Sumas),
    acumular_puntos(Sumas, Acum, NuevoAcum),
    actualizar_puntajes(T, NuevoAcum, Res).

% -------------------------------
% Calcular ranking con puntos actualizados
% -------------------------------
ranking_con_escenario(Escenario, Ranking) :-
    findall((E, P), puntos(E, P), Base),
    actualizar_puntajes(Escenario, Base, Todos),
    sort(2, @>=, Todos, Ranking).

% -------------------------------
% Verificar si equipo está en el rango
% -------------------------------
en_rango(Ranking, Equipo, Min, Max) :-
    nth1(Pos, Ranking, (Equipo, _)),
    Pos >= Min, Pos =< Max.

% -------------------------------
% Predicado principal
% -------------------------------

%posible(Equipo, Min, Max, Fechas, ResultadoFinal) :-
 %   equipos_competencia_para(Equipo, Min, Max, Fechas, EquiposRelevantes),
  %partidos_relevantes(EquiposRelevantes, Partidos),
   % simular_escenario_simple(Partidos, _, Escenario),
    %ranking_con_escenario(Escenario, Ranking),
    %en_rango(Ranking, Equipo, Min, Max),
    %extraer_resultados(Escenario, ResultadoFinal).

posible(Equipo, Min, Max, Fechas, ResultadoFinal) :-
    equipos_competencia_para(Equipo, Min, Max, Fechas, EquiposRelevantes),
    partidos_relevantes_por_fecha(EquiposRelevantes, Fechas, Partidos),
    simular_escenario_simple(Partidos, _, Escenario),
    ranking_con_escenario(Escenario, Ranking),
    en_rango(Ranking, Equipo, Min, Max),
    extraer_resultados(Escenario, ResultadoFinal).


extraer_resultados([], []).
extraer_resultados([partido(ID, _, _, Resultado)|T], [(ID, Resultado)|Resto]) :-
    extraer_resultados(T, Resto).

%funciona para solo mirar los partidos relevantes en escenario simple
%se ejecuta asi posible(chelsea_fc, 2, 2, 2, Escenario).


% -------------------------------
% Partidos relevantes limitados por fechas
% -------------------------------

partidos_relevantes_por_fecha(Equipos, Fechas, PartidosLimitados) :-
    findall(partido(ID, L, V), partido(ID, L, V), Todos),
    include(partido_interesa(Equipos), Todos, Filtrados),
    limitar_partidos_por_equipo(Equipos, Fechas, Filtrados, PartidosLimitados).

% Limita la cantidad de partidos por equipo a Fechas
limitar_partidos_por_equipo([], _, _, []).
limitar_partidos_por_equipo([E|Es], N, Partidos, Result) :-
    include(involucra_equipo(E), Partidos, PartidosE),
    prefix(PartidosE, N, Tomados),
    limitar_partidos_por_equipo(Es, N, Partidos, Resto),
    append(Tomados, Resto, Parcial),
    list_to_set(Parcial, Result).  % Elimina duplicados

% True si el partido involucra al equipo E
involucra_equipo(E, partido(_, L, V)) :-
    E == L ; E == V.

% Toma los primeros N elementos de una lista
prefix(Lista, N, Prefijo) :- length(Prefijo, N), append(Prefijo, _, Lista).

% Limita los partidos por equipo a N partidos en total (no duplicados)
partidos_relevantes_por_fecha(Equipos, N, PartidosFinales) :-
    findall(partido(ID, L, V), partido(ID, L, V), TodosPartidos),
    filtrar_partidos_por_equipos_limitados(Equipos, N, TodosPartidos, [], PartidosFiltrados),
    list_to_set(PartidosFiltrados, PartidosFinales).

% Caso base
filtrar_partidos_por_equipos_limitados(_, _, [], _, []).

% Caso recursivo
filtrar_partidos_por_equipos_limitados(Equipos, N, [P|Resto], Conteos, [P|Res]) :-
    P = partido(_, L, V),
    (member(L, Equipos); member(V, Equipos)),
    actualizar_conteo(L, N, Conteos, Conteos1, AgregarL),
    actualizar_conteo(V, N, Conteos1, Conteos2, AgregarV),
    (AgregarL ; AgregarV),  % Al menos uno de los dos puede seguir sumando
    filtrar_partidos_por_equipos_limitados(Equipos, N, Resto, Conteos2, Res).

filtrar_partidos_por_equipos_limitados(Equipos, N, [_|Resto], Conteos, Res) :-
    filtrar_partidos_por_equipos_limitados(Equipos, N, Resto, Conteos, Res).

% Actualiza el conteo de un equipo
actualizar_conteo(E, N, Conteos, ConteosActualizados, Agregar) :-
    (   memberchk(E-C, Conteos)
    ->  (C < N -> C1 is C + 1, Agregar = true ; C1 = C, Agregar = false),
        select(E-C, Conteos, E-C1, ConteosActualizados)
    ;   C1 = 1, Agregar = true, ConteosActualizados = [E-1|Conteos]
    ).
