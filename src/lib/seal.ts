import type { PortionMode } from './ranges';

// Words for the portion in the first person: "my thumn" / "my rub'", and the genitive for "a thumn of".
const NOUN = {
  thumn: { mine: 'ثمني', of: 'ثمنٍ', the: 'الثمن' },
  rub: { mine: 'ربعي', of: 'ربعٍ', the: 'الربع' },
} as const;

export type SealText = { title: string; sub: string; doneTitle: string; doneSub: string };

/**
 * What the completion seal says: "I finished my thumn / rub'", said with a smile.
 * The line is chosen by the portion number, so it varies day to day but is stable while reading.
 */
export function sealText(mode: PortionMode, n: number): SealText {
  const w = NOUN[mode];
  const lines: { title: string; sub: string }[] = [
    { title: `ختمتُ ${w.mine} اليوم`, sub: 'والحديقة تبتسم لي 🌱' },
    { title: `${w.mine} في الجيب`, sub: 'ونوره في القلب' },
    { title: `سقيتُ زهرتي بـ${w.of} من القرآن`, sub: 'وستكبر بإذن الله 🌿' },
    { title: `أتممتُ ${w.mine}… وبقي الأجر`, sub: 'يا له من وردٍ طيّب ✨' },
    { title: 'وردي اليوم تمّ', sub: `و${w.the} هذا في سجلّ النور` },
  ];
  const l = lines[(n - 1 + lines.length * 1000) % lines.length];
  return { ...l, doneTitle: 'تقبّل الله منك', doneSub: 'نبتت ورقةٌ جديدة في حديقتك 🍃' };
}
