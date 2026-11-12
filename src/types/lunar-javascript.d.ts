// lunar-javascript 최소 타입 선언 (엔진에서 쓰는 API만)
declare module "lunar-javascript" {
  export class Solar {
    static fromYmd(y: number, m: number, d: number): Solar;
    static fromYmdHms(y: number, m: number, d: number, h: number, mi: number, s: number): Solar;
    getYear(): number; getMonth(): number; getDay(): number;
    getHour(): number; getMinute(): number; getSecond(): number;
    getLunar(): Lunar;
    toYmd(): string; toYmdHms(): string;
  }
  export class Lunar {
    static fromYmd(y: number, m: number, d: number): Lunar; // 윤달은 음수 월
    static fromYmdHms(y: number, m: number, d: number, h: number, mi: number, s: number): Lunar;
    getSolar(): Solar;
    getYear(): number; getMonth(): number; getDay(): number;
    getJieQiTable(): Record<string, Solar>;
    getEightChar(): any;
  }
  const lunar: { Solar: typeof Solar; Lunar: typeof Lunar };
  export default lunar;
}
