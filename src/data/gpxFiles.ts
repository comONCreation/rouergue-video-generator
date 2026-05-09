import { SEGMENTS, type Segment } from "./segments";

const STAGE_1_GPX_DIR = "GPX/E\u0301tape 1";
const STAGE_2_GPX_DIR = "GPX/E\u0301tape 2";

const s1 = (file: string) => `${STAGE_1_GPX_DIR}/${file}`;
const s2 = (file: string) => `${STAGE_2_GPX_DIR}/${file}`;

export const GPX_BY_SEGMENT_ID: Record<string, string> = {
  "S1-L01": s1("R26 1.01 Li RODEZ LAISSAC.gpx"),
  "S1-L02": s1("R26 1.02 Li LAISSAC CAMPUAC.gpx"),
  "S1-ES1": s1("R26 1.03 ES1-5 CAMPUAC ESPEYRAC.gpx"),
  "S1-L03": s1("R26 1.04 Li ENTRAYGUES PONT DE LETH.gpx"),
  "S1-ES2": s1("R26 1.05 ES2-6 LE NAYRAC.gpx"),
  "S1-L04": s1("R26 1.06 Li LE NAYRAC ESPALION.gpx"),
  "S1-L05": s1("R26 1.07 Li ESPALION PERSE.gpx"),
  "S1-ES3": s1("R26 1.08 ES3-7 ESPALION LASSOUTS.gpx"),
  "S1-L06": s1("R26 1.09 Li LASSOUTS ST MARTIN.gpx"),
  "S1-ES4": s1("R26 1.10 ES4-8 VIMENET.gpx"),
  "S1-L07": s1("R26 1.11 Li COUSSERGUES LAISSAC.gpx"),
  "S1-L08": s1("R26 1.02 Li LAISSAC CAMPUAC.gpx"),
  "S1-ES5": s1("R26 1.03 ES1-5 CAMPUAC ESPEYRAC.gpx"),
  "S1-L09": s1("R26 1.04 Li ENTRAYGUES PONT DE LETH.gpx"),
  "S1-ES6": s1("R26 1.05 ES2-6 LE NAYRAC.gpx"),
  "S1-L10": s1("R26 1.06 Li LE NAYRAC ESPALION.gpx"),
  "S1-L11": s1("R26 1.07 Li ESPALION PERSE.gpx"),
  "S1-ES7": s1("R26 1.08 ES3-7 ESPALION LASSOUTS.gpx"),
  "S1-L12": s1("R26 1.09 Li LASSOUTS ST MARTIN.gpx"),
  "S1-ES8": s1("R26 1.10 ES4-8 VIMENET.gpx"),
  "S1-L13": s1("R26 1.11 Li COUSSERGUES LAISSAC.gpx"),
  "S1-L14": s1("R26 1.12 Li LAISSAC RODEZ.gpx"),

  "S2-L01": s2("R26 2.01 Li RODEZ LAISSAC.gpx"),
  "S2-L02": s2("R26 2.02 Li LAISSAC SEVERAC.gpx"),
  "S2-ES9": s2("R26 2.03 ES9-12 LAISSAC.gpx"),
  "S2-L03": s2("R26 2.04 Li MONTMERLHE  LEVEZOU.gpx"),
  "S2-ES10": s2("R26 2.05 ES10-13 LEVEZOU.gpx"),
  "S2-L04": s2("R26 2.06 Li BARRAQUE SEGALA RUOLS.gpx"),
  "S2-ES11": s2("R26 2.07 ES11-14 LUC MOYRAZES.gpx"),
  "S2-L05": s2(
    "R26 2.08 Li LE PAS RODEZ RECO PUIS LA PRIMAUBE (fusionne\u0301).gpx"
  ),
  "S2-L06": s2("R26 2.09 Li PRIMAUBE LAISSAC.gpx"),
  "S2-L07": s2("R26 2.02 Li LAISSAC SEVERAC.gpx"),
  "S2-ES12": s2("R26 2.03 ES9-12 LAISSAC.gpx"),
  "S2-L08": s2("R26 2.04 Li MONTMERLHE  LEVEZOU.gpx"),
  "S2-ES13": s2("R26 2.05 ES10-13 LEVEZOU.gpx"),
  "S2-L09": s2("R26 2.06 Li BARRAQUE SEGALA RUOLS.gpx"),
  "S2-ES14": s2("R26 2.07 ES11-14 LUC MOYRAZES.gpx"),
  "S2-L10": s2("R26 2.10 Li LE PAS PRIMAUBE Tour 2.gpx"),
  "S2-L11": s2("R26 2.11 Li PRIMAUBE RODEZ .gpx"),
  "S2-ES15": s2("R26 2.12 ES15 RODEZ AGGLOMERATION.gpx"),
  "S2-L12": s2(
    "R26 2.13 Li RTE MOYRAZES REPOSITIONNEMENT IN VERS PODIUM (complet).gpx"
  ),
};

export const getGpxPathForSegment = (segment: Segment | string) => {
  const id = typeof segment === "string" ? segment : segment.id;
  return GPX_BY_SEGMENT_ID[id] ?? null;
};

export const getSegmentsWithoutGpx = () =>
  SEGMENTS.filter((segment) => !getGpxPathForSegment(segment));
