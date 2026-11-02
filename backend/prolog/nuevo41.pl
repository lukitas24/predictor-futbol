
% Reglas corregidas para consultas independientes en SWI-Prolog.
% Soportan ligas planas (MNT) y fases de grupos.
% Para muchos partidos hay explosión combinatoria: el backend usa simulacion.py
% con muestreo acotado en lugar de enumerar todas las posibilidades.

:- use_module(library(lists)).
:- use_module(library(apply)).

resultado_simple(gana_local).
resultado_simple(empate).
resultado_simple(gana_visitante).

puntos_por_goles(GL, GV, 3, 0) :- GL > GV, !.
puntos_por_goles(GL, GV, 1, 1) :- GL =:= GV, !.
puntos_por_goles(GL, GV, 0, 3) :- GL < GV.

partidos_pendientes(Lista) :-
    findall((Id, Local, Visita), partido(Id, Local, Visita), Lista).

partidos_pendientes_grupo(Grupo, Filtrados) :-
    findall((Id, Local, Visita),
            (partido(Id, Local, Visita), grupo(Local, Grupo), grupo(Visita, Grupo)),
            Filtrados).

competidores(Eq, Equipos) :-
    ( current_predicate(grupo/2), grupo(Eq, G) -> findall(E, grupo(E, G), Equipos)
    ; findall(E, puntos(E, _), Equipos)
    ).

partidos_competencia(Eq, Partidos) :-
    ( current_predicate(grupo/2), grupo(Eq, G) -> partidos_pendientes_grupo(G, Partidos)
    ; partidos_pendientes(Partidos)
    ).

% Selección determinista: hasta N enfrentamientos pendientes por equipo.
% Solo incluye un partido cuando AMBOS equipos tienen cupo disponible.
partidos_ventana(Eq, N, Partidos) :-
    integer(N), N > 0,
    partidos_competencia(Eq, Todos),
    seleccionar_con_cupos(Todos, N, [], Partidos).

seleccionar_con_cupos([], _, _, []).
seleccionar_con_cupos([(Id,L,V)|R], N, Conteos, Seleccion) :-
    cantidad_partidos(L, Conteos, CL),
    cantidad_partidos(V, Conteos, CV),
    ( CL < N, CV < N ->
        CL1 is CL + 1, CV1 is CV + 1,
        actualizar_contador(L, CL1, Conteos, A),
        actualizar_contador(V, CV1, A, B),
        Seleccion = [(Id,L,V)|Siguiente],
        seleccionar_con_cupos(R, N, B, Siguiente)
    ; seleccionar_con_cupos(R, N, Conteos, Seleccion)
    ).

cantidad_partidos(E, Conteos, C) :-
    ( memberchk(E-C0, Conteos) -> C = C0 ; C = 0 ).

actualizar_contador(E, N, Conteos, [E-N|R]) :-
    ( select(E-_, Conteos, R) -> true ; R = Conteos ).


% Solo se simulan enfrentamientos que afectan la posición del equipo elegido.
% Se considera competidor a quien puede alcanzar/superar los puntos del objetivo
% (o ser alcanzado por él) dentro de esta ventana de partidos pendientes.
% Los rivales de esos competidores se incluyen en el partido para que el
% resultado otorgue puntos a AMBOS equipos, sin modificar a los ajenos.

cuantos_partidos(E, Partidos, Cantidad) :-
    include(participa_en(E), Partidos, DeE),
    length(DeE, Cantidad).

participa_en(E, (_,L,V)) :- (E == L ; E == V).

puede_cruzar_puntos(PMin, PMax, Partidos, E) :-
    puntos(E, Actual),
    cuantos_partidos(E, Partidos, N),
    Maximo is Actual + 3*N,
    Actual =< PMax,
    Maximo >= PMin.

equipos_relevantes_para(Eq, Ventana, EquiposRelevantes) :-
    puntos(Eq, Base),
    cuantos_partidos(Eq, Ventana, N),
    Maximo is Base + 3*N,
    competidores(Eq, Equipos),
    include(puede_cruzar_puntos(Base, Maximo, Ventana), Equipos, Relevantes),
    sort([Eq|Relevantes], EquiposRelevantes).

partido_relevante(Equipos, (_,L,V)) :-
    ( memberchk(L, Equipos) ; memberchk(V, Equipos) ).

% Límite de equipos que participan efectivamente en un escenario.
% Ajustar si se desea explorar más partidos (mayor costo combinatorio).
max_equipos_relevantes(8).

ambos_competidores(Equipos, (_,L,V)) :-
    memberchk(L, Equipos), memberchk(V, Equipos).

seleccionar_hasta_limite([], _, _, []).
seleccionar_hasta_limite([P|R], Actuales, Max, Resultado) :-
    P = (_,L,V),
    sort([L,V|Actuales], Nuevos),
    length(Nuevos, Cant),
    ( Cant =< Max ->
        Resultado = [P|Res],
        seleccionar_hasta_limite(R, Nuevos, Max, Res)
    ; seleccionar_hasta_limite(R, Actuales, Max, Resultado)
    ).

partidos_relevantes_ventana(Eq, N, Partidos) :-
    partidos_ventana(Eq, N, Ventana),
    equipos_relevantes_para(Eq, Ventana, Competidores),
    include(partido_relevante(Competidores), Ventana, Relevantes),
    include(participa_en(Eq), Relevantes, DelObjetivo),
    include(ambos_competidores(Competidores), Relevantes, EntreCompetidores),
    append([DelObjetivo, EntreCompetidores, Relevantes], Prioridad),
    list_to_set(Prioridad, SinDuplicados),
    max_equipos_relevantes(Max),
    seleccionar_hasta_limite(SinDuplicados, [], Max, Elegidos),
    include(member_en(Elegidos), Relevantes, Partidos).

member_en(Lista, Elemento) :- memberchk(Elemento, Lista).

% Fallback: MNT no tiene goles/3 históricos, pero sí diferencia_goles/2.
% Se conserva la diferencia real para desempatar, sin inventar GF ni GC.
diferencia_base(E, DG) :- current_predicate(goles/3), goles(E, GF, GC), !, DG is GF - GC.
diferencia_base(E, DG) :- current_predicate(diferencia_goles/2), diferencia_goles(E, DG), !.
diferencia_base(_, 0).

goles_favor_base(E, GF) :- current_predicate(goles/3), goles(E, GF, _), !.
goles_favor_base(_, 0).

resultado_puntos(gana_local, 3, 0).
resultado_puntos(empate, 1, 1).
resultado_puntos(gana_visitante, 0, 3).

simular_simple([], []).
simular_simple([(Id,_,_)|R], [(Id,Res)|SR]) :-
    resultado_simple(Res), simular_simple(R, SR).

puntos_extra_simple(_, [], 0).
puntos_extra_simple(E, [(Id,Resultado)|R], Total) :-
    partido(Id,L,V),
    resultado_puntos(Resultado, PL, PV),
    ( E == L -> P = PL ; E == V -> P = PV ; P = 0 ),
    puntos_extra_simple(E, R, Acc), Total is P + Acc.

% Marcadores acotados a 0..3 para pruebas directas en Prolog.
goles_posibles(G) :- between(0, 3, G).
simular_goles([], []).
simular_goles([(Id,_,_)|R], [(Id, GL, GV)|SR]) :-
    goles_posibles(GL), goles_posibles(GV), simular_goles(R, SR).

puntos_extra_goles(_, [], 0).
puntos_extra_goles(E, [(Id,GL,GV)|R], Total) :-
    partido(Id,L,V),
    puntos_por_goles(GL,GV,PL,PV),
    ( E == L -> P = PL ; E == V -> P = PV ; P = 0 ),
    puntos_extra_goles(E,R,Acc), Total is P + Acc.

diferencia_extra_goles(_, [], 0, 0).
diferencia_extra_goles(E, [(Id,GL,GV)|R], DG, GFE) :-
    partido(Id,L,V),
    ( E == L -> DG1 is GL-GV, GF1 = GL
    ; E == V -> DG1 is GV-GL, GF1 = GV
    ; DG1 = 0, GF1 = 0
    ),
    diferencia_extra_goles(E,R,DGR,GFR),
    DG is DG1 + DGR, GFE is GF1 + GFR.

% Ranking: puntos, DG, GF (si se conoce), nombre como último desempate.
comparar_equipo(Orden, (E1,P1,D1,F1), (E2,P2,D2,F2)) :-
    ( P1 > P2 -> Orden = '<'
    ; P1 < P2 -> Orden = '>'
    ; D1 > D2 -> Orden = '<'
    ; D1 < D2 -> Orden = '>'
    ; F1 > F2 -> Orden = '<'
    ; F1 < F2 -> Orden = '>'
    ; compare(Orden, E1, E2)
    ).

ranking_simple(Eq, Escenario, Ranking) :-
    competidores(Eq, Equipos),
    findall((E,P,DG,GF),
      (member(E,Equipos), puntos(E,B), puntos_extra_simple(E,Escenario,EX),
       P is B + EX, diferencia_base(E,DG), goles_favor_base(E,GF)),
      Tabla),
    predsort(comparar_equipo, Tabla, Ordenado),
    maplist(equipo_puntos, Ordenado, Ranking).

ranking_goles(Eq, Escenario, Ranking) :-
    competidores(Eq, Equipos),
    findall((E,P,DG,GF),
      (member(E,Equipos), puntos(E,B), puntos_extra_goles(E,Escenario,EX),
       P is B + EX, diferencia_base(E,DG0), goles_favor_base(E,GF0),
       diferencia_extra_goles(E,Escenario,DGE,GFE),
       DG is DG0 + DGE, GF is GF0 + GFE),
      Tabla),
    predsort(comparar_equipo, Tabla, Ordenado),
    maplist(equipo_puntos, Ordenado, Ranking).

equipo_puntos((E,P,_,_), (E,P)).

posicion_en_lista(E, Ranking, Pos) :-
    nth1(Pos, Ranking, (E,_)).

posible(E, Min, Max, Fechas, Escenario) :-
    puntos(E,_), partidos_relevantes_ventana(E,Fechas,Partidos),
    simular_simple(Partidos, Escenario),
    ranking_simple(E, Escenario, Ranking),
    posicion_en_lista(E, Ranking, Pos),
    between(Min, Max, Pos).

escenario_valido_goles_generador(E,Min,Max,Fechas,Escenario,Ranking) :-
    puntos(E,_), partidos_relevantes_ventana(E,Fechas,Partidos),
    simular_goles(Partidos,Escenario),
    ranking_goles(E,Escenario,Ranking),
    posicion_en_lista(E,Ranking,Pos),
    between(Min,Max,Pos).
