/**
 * Walking-man reference set — Image Studio prompt-bar samples (R2).
 * Full public URLs only.
 */
const BASE = "https://assets.motio2edit.com/samples/image-studio";

export type WalkingManSample = {
  id: string;
  url: string;
  label: string;
  alt: string;
};

export const WALKING_MAN_SAMPLES: WalkingManSample[] = [
  {
    id: "wm-1",
    url: `${BASE}/1p9siGSXDnwn7UKqeKCca_QMdG8Awh.jpg`,
    label: "Walk A",
    alt: "Walking figure reference A — full body motion",
  },
  {
    id: "wm-2",
    url: `${BASE}/GTFV-cDUdRzqCnSGJ7PaJ_a9c7ee33eba24d0493fb80d34f7f9ed0.jpg`,
    label: "Walk B",
    alt: "Walking figure reference B — side stride",
  },
  {
    id: "wm-3",
    url: `${BASE}/OUhB9WfESWuaSN5mcoOdN_qgmS96Ik.png`,
    label: "Walk C",
    alt: "Walking figure reference C — outdoor path",
  },
  {
    id: "wm-4",
    url: `${BASE}/u4f6EsYuC6ULCLO5xb2lx_b14eb1dd900b4a4d88be42fdc2e2bca7.png`,
    label: "Walk D",
    alt: "Walking figure reference D — clothing detail",
  },
  {
    id: "wm-5",
    url: `${BASE}/uNk-tPsU-FFoFlSjjByYu_e3RLxcBU.png`,
    label: "Walk E",
    alt: "Walking figure reference E — composition pose",
  },
];

export const REFERENCE_ACCURACY_NOTE =
  "Use one primary reference for the most accurate result. Extra references can guide style, pose, or clothing, but too many may reduce consistency and motion accuracy.";
