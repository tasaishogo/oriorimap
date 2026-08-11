// design §5.2 / §4.2 / 01_requirements.md の確定値（詳細は .agent-tasks/T006/spec.md 参照）
export const LIMITS = {
  iconMaxBytes: 1 * 1024 * 1024,
  photoMaxBytes: 5 * 1024 * 1024,
  spotsPerMap: 1000,
  overlayMapsMax: 10,
  reportsPerHourPerReporter: 10,
} as const;

// かさねの色目（design §5.2）。先頭5色（紅梅・山吹・萌黄・浅葱・藤）は design 本文の確定値。
// 残り5色（洗柿・若苗・青竹・縹・牡丹）は伝統色系統からの補完。
export const KASANE_COLORS: readonly string[] = [
  '#D0576B',
  '#DFA820',
  '#7FA85B',
  '#3A8FA3',
  '#8A76B5',
  '#D68466',
  '#ADBC4E',
  '#49AB6D',
  '#436BA3',
  '#B356B2',
] as const;
