// Données extraites du Road Book de l'édition courante.
// Identité du rallye (édition, dates, nom) : src/rally.config.ts.
import { SHAKEDOWN_TIME_WINDOW, getStageDate } from "../rally.config";
import { validateSegments } from "./validateSegments";

export type SegmentType = "LIAISON" | "ES";

export type Segment = {
  id: string;
  type: SegmentType;
  /** Numéro 1..15 pour une ES */
  esNumber?: number;
  /** Numéro de la liaison dans la journée */
  liaisonNumber?: number;
  /** Nom court à afficher (ex. "Campuac-Espeyrac") */
  title: string;
  fromLocation?: string;
  toLocation?: string;
  distanceKm: number;
  /** Heure de départ de la 1ère voiture (HH:MM) */
  startTime: string;
  /** Créneau libre à afficher quand il n'y a pas d'horaire précis. */
  timeWindow?: string;
  /** Heure d'arrivée prévue de la 1ère voiture au CH suivant (HH:MM) */
  endTime?: string;
  /** Section du rallye (1..N) */
  section: number;
  /** Numéro d'étape 1-based. */
  stage: number;
  date: string;
  /** Indication ajoutée dans le panneau (ex. "Refueling", "Super-spéciale") */
  badge?: string;
  /**
   * Active le zoom rapproché (mapCamera.zoom.close) sur ce segment. Utilisé
   * pour les portions urbaines/spéciales où le tracé est très resserré
   * (ex. super-spéciale Rodez Agglomération + liaison podium).
   */
  closeZoom?: boolean;
};

// Builder de segment : injecte `stage` + `date` dérivée de l'édition.
const forStage =
  (stage: number) =>
  (s: Omit<Segment, "stage" | "date">): Segment => ({
    ...s,
    stage,
    date: getStageDate(stage),
  });

const s0 = forStage(0);
const s1 = forStage(1);
const s2 = forStage(2);

export const SEGMENTS: Segment[] = [
  // ───── SHAKEDOWN (jeudi) ─────
  s0({
    id: "S0-L01",
    type: "LIAISON",
    liaisonNumber: 1,
    title: "Liaison",
    fromLocation: "Assistance Laissac",
    toLocation: "Départ Shakedown",
    distanceKm: 1.902,
    startTime: "10:00",
    timeWindow: SHAKEDOWN_TIME_WINDOW,
    section: 0,
  }),
  s0({
    id: "S0-ES1",
    type: "ES",
    title: "Shakedown",
    distanceKm: 4.963,
    startTime: "10:00",
    timeWindow: SHAKEDOWN_TIME_WINDOW,
    section: 0,
    badge: "Shakedown",
  }),
  s0({
    id: "S0-L02",
    type: "LIAISON",
    liaisonNumber: 2,
    title: "Liaison retour",
    fromLocation: "Arrivée Shakedown",
    toLocation: "Assistance Laissac",
    distanceKm: 11.844,
    startTime: "10:15",
    timeWindow: SHAKEDOWN_TIME_WINDOW,
    section: 0,
  }),

  // ───── ÉTAPE 1 — Section 1 ─────
  s1({
    id: "S1-L01",
    type: "LIAISON",
    liaisonNumber: 1,
    title: "Liaison",
    fromLocation: "Parc fermé Rodez",
    toLocation: "Assistance Laissac",
    distanceKm: 32.135,
    startTime: "08:00",
    endTime: "08:45",
    section: 1,
  }),
  s1({
    id: "S1-L02",
    type: "LIAISON",
    liaisonNumber: 2,
    title: "Liaison",
    fromLocation: "Assistance Laissac",
    toLocation: "Départ ES 1 Campuac-Espeyrac",
    distanceKm: 34.447,
    startTime: "09:00",
    endTime: "09:50",
    section: 1,
  }),
  s1({
    id: "S1-ES1",
    type: "ES",
    esNumber: 1,
    title: "Campuac-Espeyrac",
    distanceKm: 20.020,
    startTime: "09:53",
    section: 1,
  }),
  s1({
    id: "S1-L03",
    type: "LIAISON",
    liaisonNumber: 3,
    title: "Liaison",
    fromLocation: "arrivée ES 1 Campuac-Espeyrac",
    toLocation: "Départ ES 2 Le Nayrac",
    distanceKm: 10.792,
    startTime: "10:08",
    endTime: "10:33",
    section: 1,
  }),
  s1({
    id: "S1-ES2",
    type: "ES",
    esNumber: 2,
    title: "Le Nayrac",
    distanceKm: 8.496,
    startTime: "10:36",
    section: 1,
  }),
  s1({
    id: "S1-L04",
    type: "LIAISON",
    liaisonNumber: 4,
    title: "Liaison",
    fromLocation: "arrivée ES 2 Le Nayrac",
    toLocation: "Regroupement Espalion",
    distanceKm: 17.159,
    startTime: "10:42",
    endTime: "11:11",
    section: 1,
  }),

  // ───── ÉTAPE 1 — Section 2 ─────
  s1({
    id: "S1-L05",
    type: "LIAISON",
    liaisonNumber: 5,
    title: "Liaison",
    fromLocation: "Regroupement Espalion",
    toLocation: "Départ ES 3 Espalion-Lassouts",
    distanceKm: 1.217,
    startTime: "12:01",
    endTime: "12:09",
    section: 2,
  }),
  s1({
    id: "S1-ES3",
    type: "ES",
    esNumber: 3,
    title: "Espalion-Lassouts",
    distanceKm: 14.751,
    startTime: "12:12",
    section: 2,
  }),
  s1({
    id: "S1-L06",
    type: "LIAISON",
    liaisonNumber: 6,
    title: "Liaison",
    fromLocation: "arrivée ES 3 Espalion-Lassouts",
    toLocation: "Départ ES 4 Vimenet",
    distanceKm: 18.372,
    startTime: "12:23",
    endTime: "12:57",
    section: 2,
  }),
  s1({
    id: "S1-ES4",
    type: "ES",
    esNumber: 4,
    title: "Vimenet",
    distanceKm: 9.207,
    startTime: "13:00",
    section: 2,
  }),
  s1({
    id: "S1-L07",
    type: "LIAISON",
    liaisonNumber: 7,
    title: "Liaison",
    fromLocation: "arrivée ES 4 Vimenet",
    toLocation: "Assistance Laissac",
    distanceKm: 7.441,
    startTime: "13:07",
    endTime: "13:25",
    section: 2,
  }),

  // ───── ÉTAPE 1 — Section 3 ─────
  s1({
    id: "S1-L08",
    type: "LIAISON",
    liaisonNumber: 8,
    title: "Liaison",
    fromLocation: "Assistance Laissac",
    toLocation: "Départ ES 5 Campuac-Espeyrac",
    distanceKm: 34.447,
    startTime: "14:25",
    endTime: "15:15",
    section: 3,
  }),
  s1({
    id: "S1-ES5",
    type: "ES",
    esNumber: 5,
    title: "Campuac-Espeyrac",
    distanceKm: 20.020,
    startTime: "15:18",
    section: 3,
  }),
  s1({
    id: "S1-L09",
    type: "LIAISON",
    liaisonNumber: 9,
    title: "Liaison",
    fromLocation: "arrivée ES 5 Campuac-Espeyrac",
    toLocation: "Départ ES 6 Le Nayrac",
    distanceKm: 10.792,
    startTime: "15:33",
    endTime: "15:58",
    section: 3,
  }),
  s1({
    id: "S1-ES6",
    type: "ES",
    esNumber: 6,
    title: "Le Nayrac",
    distanceKm: 8.496,
    startTime: "16:01",
    section: 3,
  }),
  s1({
    id: "S1-L10",
    type: "LIAISON",
    liaisonNumber: 10,
    title: "Liaison",
    fromLocation: "arrivée ES 6 Le Nayrac",
    toLocation: "Regroupement Espalion",
    distanceKm: 17.159,
    startTime: "16:07",
    endTime: "16:36",
    section: 3,
  }),
  s1({
    id: "S1-L11",
    type: "LIAISON",
    liaisonNumber: 11,
    title: "Liaison",
    fromLocation: "Regroupement Espalion",
    toLocation: "Départ ES 7 Espalion-Lassouts",
    distanceKm: 1.217,
    startTime: "17:16",
    endTime: "17:24",
    section: 3,
  }),
  s1({
    id: "S1-ES7",
    type: "ES",
    esNumber: 7,
    title: "Espalion-Lassouts",
    distanceKm: 14.751,
    startTime: "17:27",
    section: 3,
  }),
  s1({
    id: "S1-L12",
    type: "LIAISON",
    liaisonNumber: 12,
    title: "Liaison",
    fromLocation: "arrivée ES 7 Espalion-Lassouts",
    toLocation: "Départ ES 8 Vimenet",
    distanceKm: 18.372,
    startTime: "17:38",
    endTime: "18:12",
    section: 3,
  }),
  s1({
    id: "S1-ES8",
    type: "ES",
    esNumber: 8,
    title: "Vimenet",
    distanceKm: 9.207,
    startTime: "18:15",
    section: 3,
  }),
  s1({
    id: "S1-L13",
    type: "LIAISON",
    liaisonNumber: 13,
    title: "Liaison",
    fromLocation: "arrivée ES 8 Vimenet",
    toLocation: "Assistance Laissac",
    distanceKm: 7.441,
    startTime: "18:22",
    endTime: "18:40",
    section: 3,
  }),
  s1({
    id: "S1-L14",
    type: "LIAISON",
    liaisonNumber: 14,
    title: "Liaison retour podium",
    fromLocation: "Assistance Laissac",
    toLocation: "Parc fermé Bourran",
    distanceKm: 31.774,
    startTime: "19:20",
    endTime: "20:10",
    section: 3,
    badge: "Arrivée étape 1",
  }),

  // ───── ÉTAPE 2 — Section 4 ─────
  s2({
    id: "S2-L01",
    type: "LIAISON",
    liaisonNumber: 1,
    title: "Liaison",
    fromLocation: "Parc fermé Rodez",
    toLocation: "Assistance Laissac",
    distanceKm: 32.135,
    startTime: "08:00",
    endTime: "08:45",
    section: 4,
  }),
  s2({
    id: "S2-L02",
    type: "LIAISON",
    liaisonNumber: 2,
    title: "Liaison",
    fromLocation: "Assistance Laissac",
    toLocation: "Départ ES 9 Laissac",
    distanceKm: 4.587,
    startTime: "09:00",
    endTime: "09:15",
    section: 4,
  }),
  s2({
    id: "S2-ES9",
    type: "ES",
    esNumber: 9,
    title: "Laissac",
    distanceKm: 9.456,
    startTime: "09:18",
    section: 4,
  }),
  s2({
    id: "S2-L03",
    type: "LIAISON",
    liaisonNumber: 3,
    title: "Liaison",
    fromLocation: "arrivée ES 9 Laissac",
    toLocation: "Départ ES 10 Lévézou",
    distanceKm: 10.589,
    startTime: "09:25",
    endTime: "09:48",
    section: 4,
  }),
  s2({
    id: "S2-ES10",
    type: "ES",
    esNumber: 10,
    title: "Lévézou",
    distanceKm: 10.398,
    startTime: "09:51",
    section: 4,
  }),
  s2({
    id: "S2-L04",
    type: "LIAISON",
    liaisonNumber: 4,
    title: "Liaison",
    fromLocation: "arrivée ES 10 Lévézou",
    toLocation: "Départ ES 11 Luc-la-Primaube – Moyrazès",
    distanceKm: 17.409,
    startTime: "09:59",
    endTime: "10:26",
    section: 4,
  }),
  s2({
    id: "S2-ES11",
    type: "ES",
    esNumber: 11,
    title: "Luc-la-Primaube – Moyrazès",
    distanceKm: 27.476,
    startTime: "10:29",
    section: 4,
    badge: "Plus longue ES",
  }),
  s2({
    id: "S2-L05",
    type: "LIAISON",
    liaisonNumber: 5,
    title: "Liaison",
    fromLocation: "arrivée ES 11 Luc-la-Primaube – Moyrazès",
    toLocation: "Regroupement La Primaube",
    distanceKm: 22.475,
    startTime: "10:49",
    endTime: "11:34",
    section: 4,
  }),

  // ───── ÉTAPE 2 — Section 5 ─────
  s2({
    id: "S2-L06",
    type: "LIAISON",
    liaisonNumber: 6,
    title: "Liaison",
    fromLocation: "Regroupement La Primaube",
    toLocation: "Assistance Laissac",
    distanceKm: 32.180,
    startTime: "12:24",
    endTime: "13:09",
    section: 5,
  }),
  s2({
    id: "S2-L07",
    type: "LIAISON",
    liaisonNumber: 7,
    title: "Liaison",
    fromLocation: "Assistance Laissac",
    toLocation: "Départ ES 12 Laissac",
    distanceKm: 4.587,
    startTime: "14:09",
    endTime: "14:24",
    section: 5,
  }),
  s2({
    id: "S2-ES12",
    type: "ES",
    esNumber: 12,
    title: "Laissac",
    distanceKm: 9.456,
    startTime: "14:27",
    section: 5,
  }),
  s2({
    id: "S2-L08",
    type: "LIAISON",
    liaisonNumber: 8,
    title: "Liaison",
    fromLocation: "arrivée ES 12 Laissac",
    toLocation: "Départ ES 13 Lévézou",
    distanceKm: 10.589,
    startTime: "14:34",
    endTime: "14:57",
    section: 5,
  }),
  s2({
    id: "S2-ES13",
    type: "ES",
    esNumber: 13,
    title: "Lévézou",
    distanceKm: 10.398,
    startTime: "15:00",
    section: 5,
  }),
  s2({
    id: "S2-L09",
    type: "LIAISON",
    liaisonNumber: 9,
    title: "Liaison",
    fromLocation: "arrivée ES 13 Lévézou",
    toLocation: "Départ ES 14 Luc-la-Primaube – Moyrazès",
    distanceKm: 17.409,
    startTime: "15:08",
    endTime: "15:35",
    section: 5,
  }),
  s2({
    id: "S2-ES14",
    type: "ES",
    esNumber: 14,
    title: "Luc-la-Primaube – Moyrazès",
    distanceKm: 27.476,
    startTime: "15:38",
    section: 5,
  }),
  s2({
    id: "S2-L10",
    type: "LIAISON",
    liaisonNumber: 10,
    title: "Liaison",
    fromLocation: "arrivée ES 14 Luc-la-Primaube – Moyrazès",
    toLocation: "Regroupement La Primaube",
    distanceKm: 19.977,
    startTime: "15:58",
    endTime: "16:38",
    section: 5,
  }),

  // ───── ÉTAPE 2 — Section 6 ─────
  s2({
    id: "S2-L11",
    type: "LIAISON",
    liaisonNumber: 11,
    title: "Liaison",
    fromLocation: "Regroupement La Primaube",
    toLocation: "Départ ES 15 Rodez Agglomération",
    distanceKm: 8.079,
    startTime: "17:18",
    endTime: "17:33",
    section: 6,
  }),
  s2({
    id: "S2-ES15",
    type: "ES",
    esNumber: 15,
    title: "Rodez Agglomération",
    distanceKm: 1.350,
    startTime: "17:36",
    section: 6,
    badge: "Super-spéciale",
    closeZoom: true,
  }),
  s2({
    id: "S2-L12",
    type: "LIAISON",
    liaisonNumber: 12,
    title: "Liaison podium",
    fromLocation: "arrivée ES 15 Rodez Agglomération",
    toLocation: "Podium parc fermé Bourran",
    distanceKm: 3.000,
    startTime: "17:38",
    endTime: "17:51",
    section: 6,
    badge: "Arrivée du rallye",
    closeZoom: true,
  }),
];

// Distances cumulées par étape (calculées au chargement du module).
const computeCumulatives = () => {
  const out = new Map<string, number>();
  const cumulativeByStage = new Map<number, number>();
  for (const seg of SEGMENTS) {
    const cum = (cumulativeByStage.get(seg.stage) ?? 0) + seg.distanceKm;
    cumulativeByStage.set(seg.stage, cum);
    out.set(seg.id, cum);
  }
  return out;
};

const CUMULATIVE_KM = computeCumulatives();

export const getCumulativeKm = (segmentId: string) =>
  CUMULATIVE_KM.get(segmentId) ?? 0;

const sumKm = (predicate: (s: Segment) => boolean) =>
  SEGMENTS.filter(predicate).reduce((acc, s) => acc + s.distanceKm, 0);

// Le shakedown (stage 0) n'entre pas dans le total kilométrique du rallye :
// c'est de la reconnaissance, pas un parcours chronométré du week-end.
export const RALLY_TOTAL_KM = sumKm((s) => s.stage > 0);

export const getStageTotalKm = (stage: number) =>
  sumKm((s) => s.stage === stage);

export const getSegmentById = (id: string) =>
  SEGMENTS.find((s) => s.id === id);

export type Section = { number: number; stage: number; name: string };

export const SECTIONS: Section[] = [
  { number: 0, stage: 0, name: "Shakedown" },
  { number: 1, stage: 1, name: "Boucle Espalion (matin 1)" },
  { number: 2, stage: 1, name: "Boucle Espalion (matin 2)" },
  { number: 3, stage: 1, name: "Boucles Espalion (après-midi)" },
  { number: 4, stage: 2, name: "Boucle La Primaube (matin)" },
  { number: 5, stage: 2, name: "Boucle La Primaube (après-midi)" },
  { number: 6, stage: 2, name: "Super-spéciale Rodez" },
];

// Le shakedown n'est pas compté dans la barre de progression des sections,
// qui ne s'applique qu'aux étapes officielles du rallye.
export const TOTAL_SECTIONS = SECTIONS.filter(
  (section) => section.stage > 0
).length;

// Validation au chargement : déclenche tôt en cas de désynchro
// (sections orphelines, GPX manquants, distances invalides, …).
validateSegments(SEGMENTS, SECTIONS);
