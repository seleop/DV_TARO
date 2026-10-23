// lunar-javascript는 타입 정의를 제공하지 않는다. 이 앱이 사용하는 API만 선언한다.
declare module "lunar-javascript" {
  export interface DaYun {
    getGanZhi(): string;
    getStartAge(): number;
    getStartYear(): number;
  }
  export interface Yun {
    isForward(): boolean;
    getStartYear(): number;
    getStartMonth(): number;
    getStartDay(): number;
    getDaYun(n?: number): DaYun[];
  }
  export interface EightChar {
    setSect(sect: 1 | 2): void;
    getSect(): number;
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    getYearShiShenGan(): string;
    getMonthShiShenGan(): string;
    getTimeShiShenGan(): string;
    getYun(gender: 0 | 1, sect?: 1 | 2): Yun;
  }
  export interface SolarDate {
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    toYmd(): string;
    getLunar(): LunarDate;
  }
  export interface LunarDate {
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getSolar(): SolarDate;
    getEightChar(): EightChar;
    getDayInGanZhi(): string;
  }
  export const Solar: {
    fromYmd(y: number, m: number, d: number): SolarDate;
    fromYmdHms(y: number, m: number, d: number, h: number, mi: number, s: number): SolarDate;
  };
  export const Lunar: {
    fromYmd(y: number, m: number, d: number): LunarDate;
  };
  export const LunarYear: {
    fromYear(y: number): { getLeapMonth(): number };
  };
}
