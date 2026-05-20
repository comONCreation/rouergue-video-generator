// Validations exécutées au chargement de segments.ts.
// L'objectif est d'attraper le plus tôt possible les erreurs de saisie qui
// arrivent inévitablement lors d'un fork pour une nouvelle édition :
// - segment dupliqué, section orpheline, GPX manquant
// - distance négative ou nulle, totaux étape incohérents
// - heures de départ non monotones par étape
//
// Les erreurs *fatales* déclenchent une exception : le studio refuse alors
// de démarrer, ce qui force la correction. Les avertissements *souples*
// (totaux légèrement décalés du Road Book par exemple) passent par
// console.warn pour ne pas bloquer le développement.

import type { Section, Segment } from "./segments";
import { GPX_BY_SEGMENT_ID } from "./gpxFiles";

const fatal = (message: string): never => {
  throw new Error(`[segments] ${message}`);
};

const warn = (message: string) => {
  console.warn(`[segments] ${message}`);
};

const parseTimeMinutes = (hhmm: string): number | null => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

export const validateSegments = (
  segments: Segment[],
  sections: Section[]
) => {
  // 1) IDs uniques.
  const seenIds = new Set<string>();
  for (const seg of segments) {
    if (seenIds.has(seg.id)) fatal(`ID de segment dupliqué : ${seg.id}`);
    seenIds.add(seg.id);
  }

  // 2) GPX déclaré pour chaque segment.
  for (const seg of segments) {
    if (!GPX_BY_SEGMENT_ID[seg.id]) {
      fatal(`Segment ${seg.id} n'a pas de GPX déclaré dans gpxFiles.ts`);
    }
  }

  // 3) Sections : chaque segment référence une section existante,
  // chaque section est référencée par au moins un segment.
  const sectionByKey = new Map<string, Section>();
  for (const sec of sections) {
    sectionByKey.set(`${sec.stage}-${sec.number}`, sec);
  }
  const referencedSectionKeys = new Set<string>();
  for (const seg of segments) {
    const key = `${seg.stage}-${seg.section}`;
    if (!sectionByKey.has(key)) {
      fatal(
        `Segment ${seg.id} référence la section ${seg.section} (étape ${seg.stage}) qui n'existe pas dans SECTIONS`
      );
    }
    referencedSectionKeys.add(key);
  }
  for (const sec of sections) {
    const key = `${sec.stage}-${sec.number}`;
    if (!referencedSectionKeys.has(key)) {
      warn(
        `Section ${sec.number} (étape ${sec.stage}) "${sec.name}" n'est référencée par aucun segment`
      );
    }
  }

  // 4) Distances strictement positives.
  for (const seg of segments) {
    if (!Number.isFinite(seg.distanceKm) || seg.distanceKm <= 0) {
      fatal(
        `Segment ${seg.id} a une distance invalide : ${seg.distanceKm}`
      );
    }
  }

  // 5) Heures de départ monotones par étape.
  const lastTimeByStage = new Map<number, number>();
  for (const seg of segments) {
    const minutes = parseTimeMinutes(seg.startTime);
    if (minutes === null) {
      warn(`Segment ${seg.id} a un startTime mal formé : "${seg.startTime}"`);
      continue;
    }
    const last = lastTimeByStage.get(seg.stage);
    if (last !== undefined && minutes < last) {
      warn(
        `Segment ${seg.id} startTime ${seg.startTime} est antérieur au précédent dans l'étape ${seg.stage}`
      );
    }
    lastTimeByStage.set(seg.stage, minutes);
  }
};
