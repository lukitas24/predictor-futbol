% TORNEO - ZONA INICIAL NUEVO (primavera 2026)
% Datos tomados de la tabla proporcionada.
% Los nombres están normalizados para usarse como átomos de Prolog.
% Todos contra todos, a una rueda: 20 equipos, 19 fechas, 190 partidos.
% Los enfrentamientos son combinaciones posibles, NO el calendario oficial.
% Podés borrar las líneas partido(...) de los enfrentamientos ya disputados.

% EQUIPOS (nombre interno = nombre de la tabla)
% ing = ING
% depo_globales = Depo Globales
% los_pioneros = Los pioneros
% cervecero = Cervecero
% almagro = Almagro
% el_rejunte = El rejunte
% katry = Katry
% depo_funebreros = Depo funebreros
% verdao = Verdao
% ruca_hue_juniors = Ruca hue juniors
% los_pumas = Los Pumas
% depo_mep = Depo mep
% instituto = Instituto
% los_elegidos = Los elegidos
% la_corona = La corona
% la_coruna = La Coruña
% ruca_hue = Ruca hue
% surland_fc = Surland FC
% depo_tercer_tiempo = Depo tercer tiempo
% depo_fv = Depo FV

% PUNTOS
puntos(ing, 16).
puntos(depo_globales, 16).
puntos(los_pioneros, 15).
puntos(cervecero, 14).
puntos(almagro, 12).
puntos(el_rejunte, 9).
puntos(katry, 9).
puntos(depo_funebreros, 6).
puntos(verdao, 6).
puntos(ruca_hue_juniors, 4).
puntos(los_pumas, 3).
puntos(depo_mep, 3).
puntos(instituto, 3).
puntos(los_elegidos, 3).
puntos(la_corona, 3).
puntos(la_coruna, 3).
puntos(ruca_hue, 1).
puntos(surland_fc, 0).
puntos(depo_tercer_tiempo, 0).
puntos(depo_fv, 0).

% GOLES A FAVOR / GOLES EN CONTRA
% La imagen solo muestra +/-, no GF y GC por separado.
% Cuando tengas esos datos, descomentá y completá las líneas siguientes.
% goles(ing, GF, GC).
% goles(depo_globales, GF, GC).
% goles(los_pioneros, GF, GC).
% goles(cervecero, GF, GC).
% goles(almagro, GF, GC).
% goles(el_rejunte, GF, GC).
% goles(katry, GF, GC).
% goles(depo_funebreros, GF, GC).
% goles(verdao, GF, GC).
% goles(ruca_hue_juniors, GF, GC).
% goles(los_pumas, GF, GC).
% goles(depo_mep, GF, GC).
% goles(instituto, GF, GC).
% goles(los_elegidos, GF, GC).
% goles(la_corona, GF, GC).
% goles(la_coruna, GF, GC).
% goles(ruca_hue, GF, GC).
% goles(surland_fc, GF, GC).
% goles(depo_tercer_tiempo, GF, GC).
% goles(depo_fv, GF, GC).

% DIFERENCIA DE GOLES (+/-) SEGÚN LA TABLA
diferencia_goles(ing, 11).
diferencia_goles(depo_globales, 10).
diferencia_goles(los_pioneros, 10).
diferencia_goles(cervecero, 8).
diferencia_goles(almagro, 9).
diferencia_goles(el_rejunte, 8).
diferencia_goles(katry, -3).
diferencia_goles(depo_funebreros, 1).
diferencia_goles(verdao, -4).
diferencia_goles(ruca_hue_juniors, -10).
diferencia_goles(los_pumas, 2).
diferencia_goles(depo_mep, -1).
diferencia_goles(instituto, -1).
diferencia_goles(los_elegidos, -2).
diferencia_goles(la_corona, -3).
diferencia_goles(la_coruna, -6).
diferencia_goles(ruca_hue, -12).
diferencia_goles(surland_fc, 0).
diferencia_goles(depo_tercer_tiempo, -3).
diferencia_goles(depo_fv, -14).

% ESTADÍSTICAS (equipo, PJ, PG, PE, PP)
estadisticas(ing, 7, 5, 1, 1).
estadisticas(depo_globales, 7, 5, 1, 1).
estadisticas(los_pioneros, 7, 5, 0, 2).
estadisticas(cervecero, 7, 4, 2, 1).
estadisticas(almagro, 4, 4, 0, 0).
estadisticas(el_rejunte, 4, 3, 0, 1).
estadisticas(katry, 5, 3, 0, 2).
estadisticas(depo_funebreros, 5, 2, 0, 3).
estadisticas(verdao, 5, 2, 0, 3).
estadisticas(ruca_hue_juniors, 5, 1, 1, 3).
estadisticas(los_pumas, 1, 1, 0, 0).
estadisticas(depo_mep, 2, 1, 0, 1).
estadisticas(instituto, 3, 1, 0, 2).
estadisticas(los_elegidos, 3, 1, 0, 2).
estadisticas(la_corona, 4, 1, 0, 3).
estadisticas(la_coruna, 3, 1, 0, 2).
estadisticas(ruca_hue, 6, 0, 1, 5).
estadisticas(surland_fc, 0, 0, 0, 0).
estadisticas(depo_tercer_tiempo, 3, 0, 0, 3).
estadisticas(depo_fv, 5, 0, 0, 5).

% TODOS LOS ENFRENTAMIENTOS - UNA VUELTA

% FECHA 1
partido(2, depo_globales, depo_tercer_tiempo).
partido(3, los_pioneros, surland_fc).
partido(4, cervecero, ruca_hue).
partido(5, almagro, la_coruna).
partido(6, el_rejunte, la_corona).
partido(7, katry, los_elegidos).
partido(8, depo_funebreros, instituto).
partido(9, verdao, depo_mep).

% FECHA 2
partido(11, depo_tercer_tiempo, ing).
partido(12, surland_fc, depo_fv).
partido(14, la_coruna, los_pioneros).
partido(17, instituto, el_rejunte).
partido(18, depo_mep, katry).
partido(19, los_pumas, depo_funebreros).

% FECHA 3
partido(21, ing, surland_fc).
partido(22, depo_tercer_tiempo, ruca_hue).
partido(23, depo_fv, la_coruna).
partido(25, los_pioneros, los_elegidos).
partido(26, cervecero, instituto).
partido(27, almagro, depo_mep).
partido(28, el_rejunte, los_pumas).
partido(29, katry, ruca_hue_juniors).


% FECHA 4
partido(32, la_coruna, surland_fc).
partido(33, la_corona, depo_tercer_tiempo).
partido(34, los_elegidos, depo_fv).
partido(35, instituto, depo_globales).
partido(36, depo_mep, los_pioneros).
partido(37, los_pumas, cervecero).
partido(38, ruca_hue_juniors, almagro).
partido(39, verdao, el_rejunte).

% FECHA 5
partido(41, ing, la_coruna).
partido(43, surland_fc, los_elegidos).
partido(45, depo_fv, depo_mep).
partido(46, depo_globales, los_pumas).
partido(48, cervecero, verdao).
partido(49, almagro, depo_funebreros).

% FECHA 6
partido(51, la_corona, ing).
partido(52, los_elegidos, la_coruna).
partido(53, instituto, ruca_hue).
partido(54, depo_mep, surland_fc).
partido(55, los_pumas, depo_tercer_tiempo).
partido(56, ruca_hue_juniors, depo_fv).
partido(58, depo_funebreros, los_pioneros).
partido(59, katry, cervecero).

% FECHA 7
partido(61, ing, los_elegidos).
partido(62, la_corona, instituto).
partido(63, la_coruna, depo_mep).
partido(64, ruca_hue, los_pumas).
partido(65, surland_fc, ruca_hue_juniors).
partido(66, depo_tercer_tiempo, verdao).
partido(67, depo_fv, depo_funebreros).
partido(68, depo_globales, katry).
partido(69, los_pioneros, el_rejunte).

% FECHA 8
partido(72, depo_mep, los_elegidos).
partido(73, los_pumas, la_corona).
partido(74, ruca_hue_juniors, la_coruna).
partido(75, verdao, ruca_hue).
partido(76, depo_funebreros, surland_fc).
partido(77, katry, depo_tercer_tiempo).
partido(79, almagro, depo_globales).

% FECHA 9
partido(81, ing, depo_mep).
partido(82, instituto, los_pumas).
partido(83, los_elegidos, ruca_hue_juniors).
partido(84, la_corona, verdao).
partido(85, la_coruna, depo_funebreros).
partido(86, ruca_hue, katry).
partido(87, surland_fc, el_rejunte).
partido(88, depo_tercer_tiempo, almagro).
partido(89, depo_fv, cervecero).
partido(90, depo_globales, los_pioneros).

% FECHA 10
partido(91, los_pumas, ing).
partido(92, ruca_hue_juniors, depo_mep).
partido(94, depo_funebreros, los_elegidos).
partido(95, katry, la_corona).
partido(96, el_rejunte, la_coruna).
partido(97, almagro, ruca_hue).
partido(98, cervecero, surland_fc).
partido(100, depo_globales, depo_fv).

% FECHA 11
partido(101, ing, ruca_hue_juniors).
partido(102, los_pumas, verdao).
partido(103, depo_mep, depo_funebreros).
partido(104, instituto, katry).
partido(105, los_elegidos, el_rejunte).
partido(106, la_corona, almagro).
partido(109, surland_fc, depo_globales).
partido(110, depo_tercer_tiempo, depo_fv).

% FECHA 12
partido(111, verdao, ing).
partido(112, depo_funebreros, ruca_hue_juniors).
partido(113, katry, los_pumas).
partido(114, el_rejunte, depo_mep).
partido(115, almagro, instituto).
partido(119, depo_fv, ruca_hue).
partido(120, depo_tercer_tiempo, surland_fc).

% FECHA 13
partido(122, verdao, katry).
partido(123, ruca_hue_juniors, el_rejunte).
partido(124, los_pumas, almagro).
partido(126, instituto, los_pioneros).
partido(127, los_elegidos, depo_globales).
partido(128, la_corona, depo_fv).
partido(129, la_coruna, depo_tercer_tiempo).
partido(130, ruca_hue, surland_fc).

% FECHA 14
partido(133, almagro, verdao).
partido(134, cervecero, ruca_hue_juniors).
partido(135, los_pioneros, los_pumas).
partido(136, depo_globales, depo_mep).
partido(137, depo_fv, instituto).
partido(138, depo_tercer_tiempo, los_elegidos).
partido(139, surland_fc, la_corona).

% FECHA 15
partido(141, ing, el_rejunte).
partido(143, depo_funebreros, cervecero).
partido(144, verdao, los_pioneros).
partido(146, los_pumas, depo_fv).
partido(148, instituto, surland_fc).
partido(149, los_elegidos, ruca_hue).
partido(150, la_corona, la_coruna).

% FECHA 16
partido(151, almagro, ing).
partido(152, cervecero, el_rejunte).
partido(153, los_pioneros, katry).
partido(156, depo_tercer_tiempo, ruca_hue_juniors).
partido(157, surland_fc, los_pumas).
partido(158, ruca_hue, depo_mep).
partido(159, la_coruna, instituto).

% FECHA 17
partido(162, almagro, los_pioneros).
partido(163, el_rejunte, depo_globales).
partido(165, depo_funebreros, depo_tercer_tiempo).
partido(166, verdao, surland_fc).
partido(168, los_pumas, la_coruna).
partido(169, depo_mep, la_corona).
partido(170, instituto, los_elegidos).

% FECHA 18
partido(173, depo_fv, almagro).
partido(174, depo_tercer_tiempo, el_rejunte).
partido(175, surland_fc, katry).
partido(176, ruca_hue, depo_funebreros).
partido(177, la_coruna, verdao).
partido(178, la_corona, ruca_hue_juniors).
partido(179, los_elegidos, los_pumas).
partido(180, instituto, depo_mep).

% FECHA 19
partido(181, ing, depo_globales).
partido(183, cervecero, depo_tercer_tiempo).
partido(184, almagro, surland_fc).
partido(185, el_rejunte, ruca_hue).
partido(186, katry, la_coruna).
partido(187, depo_funebreros, la_corona).
partido(188, verdao, los_elegidos).
partido(189, ruca_hue_juniors, instituto).
partido(190, los_pumas, depo_mep).