%nuevo41.pl


escenario_valido_goles_generador(Eq, MinPos, MaxPos, N, Escenario, Ranking) :-
    grupo(Eq, Grupo),
    partidos_pendientes_grupo(Grupo, Pendientes),
    length(PartidosN, N),
    append(PartidosN, _, Pendientes),
    escenario_valido_goles(Eq, MinPos, MaxPos, PartidosN, Escenario, Ranking).

partidos_pendientes(Lista) :-
    findall((Id, Local, Visitante), partido(Id, Local, Visitante), Lista).

partidos_pendientes_grupo(Grupo, Filtrados) :-
    findall((Id, Local, Visitante), 
        (partido(Id, Local, Visitante), 
         grupo(Local, Grupo), 
         grupo(Visitante, Grupo)),
        Filtrados).

escenario_valido_goles(Eq, MinPos, MaxPos, Partidos, Escenario, Ranking) :-
    combinacion_resultados_exactos(Partidos, Escenario),
    ranking_por_escenario_goles(Eq, Escenario, Ranking),
    posicion_en_lista(Eq, Ranking, 1, Pos),
    between(MinPos, MaxPos, Pos).

combinacion_resultados_exactos([], []).
combinacion_resultados_exactos([(Id, _, _) | Resto], [(Id, GL, GV) | RestoRes]) :-
    goles_posibles(GL),
    goles_posibles(GV),
    combinacion_resultados_exactos(Resto, RestoRes).

ranking_por_escenario_goles(Eq, Escenario, RankingFinal) :-
    grupo(Eq, Grupo),
    findall(E, grupo(E, Grupo), Equipos),  % solo equipos del grupo
    ranking_parcial(Equipos, Escenario, Datos),
    predsort(comparar_equipo, Datos, Ordenado),
    maplist(extraer_equipo_puntos, Ordenado, RankingFinal).

posicion_en_lista(Eq, [(Eq,_)|_], Pos, Pos).
posicion_en_lista(Eq, [_|Resto], N, Pos) :-
    N1 is N + 1,
    posicion_en_lista(Eq, Resto, N1, Pos).

goles_posibles(0). goles_posibles(1). goles_posibles(2). goles_posibles(3).
goles_posibles(4). goles_posibles(5). goles_posibles(6).

ranking_parcial([], _, []).
ranking_parcial([Eq|Resto], Escenario, [(Eq, P, DG, GF)|R]) :-
    puntos_totales(Eq, Escenario, P),
    goles_con_escenario_goles(Eq, Escenario, GF, GC),
    DG is GF - GC,
    ranking_parcial(Resto, Escenario, R).


comparar_equipo(Res, (_, P1, DG1, GF1), (_, P2, DG2, GF2)) :-
    ( P1 > P2 -> Res = '<'
    ; P1 < P2 -> Res = '>'
    ; DG1 > DG2 -> Res = '<'
    ; DG1 < DG2 -> Res = '>'
    ; GF1 > GF2 -> Res = '<'
    ; GF1 < GF2 -> Res = '>'
    ; Res = '=' ).

extraer_equipo_puntos((E, P, _, _), (E, P)).

goles_con_escenario_goles(Eq, Escenario, GF, GC) :-
    goles(Eq, GFbase, GCbase),
    goles_por_escenario_goles(Eq, Escenario, GFesc, GCesc),
    GF is GFbase + GFesc,
    GC is GCbase + GCesc.

goles_por_escenario_goles(_, [], 0, 0).
goles_por_escenario_goles(Eq, [(Id, GL, GV)|R], GF, GC) :-
    partido(Id, Local, Visitante),
    ( Eq = Local -> GF1 = GL, GC1 = GV
    ; Eq = Visitante -> GF1 = GV, GC1 = GL
    ; GF1 = 0, GC1 = 0 ),
    goles_por_escenario_goles(Eq, R, GFrest, GCrest),
    GF is GF1 + GFrest,
    GC is GC1 + GCrest.

puntos_por_escenario_goles(_, [], 0).
puntos_por_escenario_goles(Eq, [(Id, GL, GV)|R], Total) :-
    partido(Id, Local, Visitante),
    puntos_por_goles(GL, GV, PL, PV),
    ( Eq = Local -> P = PL
    ; Eq = Visitante -> P = PV
    ; P = 0 ),
    puntos_por_escenario_goles(Eq, R, SubTotal),
    Total is P + SubTotal.

puntos_totales(Eq, Escenario, Total) :-
    puntos(Eq, Base),
    puntos_por_escenario_goles(Eq, Escenario, Extra),
    Total is Base + Extra.

puntos_por_goles(GL, GV, 3, 0) :- GL > GV.
puntos_por_goles(GL, GV, 1, 1) :- GL =:= GV.
puntos_por_goles(GL, GV, 0, 3) :- GL < GV.

