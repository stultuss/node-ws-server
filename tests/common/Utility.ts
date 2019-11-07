import * as md5 from 'md5';
import {TimeTools, CommonTools, MathTools, JsonTools, SharingTools} from '../../src/common/Utility';


test('TimeTools::getDate', () => {
  const now = new Date();
  const nowTime = Math.floor(now.getTime() / 1000);
  expect(TimeTools.getDate().getMinutes()).toBe(now.getMinutes());
  expect(TimeTools.getDate(now.getTime()).getTime() / 1000).toBe(nowTime);
  expect(TimeTools.getDate(0).getTime() / 1000).toBe(1514736000);
});

test('TimeTools::getTime', () => {
  const now = new Date();
  const nowTime = Math.floor(now.getTime() / 1000);
  expect(TimeTools.getTime()).toBe(nowTime);
  expect(TimeTools.getTime(now.getTime())).toBe(nowTime);
});

test('TimeTools::getDayTime', () => {
  const now = new Date();
  const nowTime = Math.floor(now.getTime() / 1000);
  
  // 时分秒设置为0
  now.setHours(0, 0, 0, 0);
  const nowDayTime = Math.floor(now.getTime() / 1000);
  
  expect(TimeTools.getDayTime()).toBe(nowDayTime);
  expect(TimeTools.getDayTime(nowTime)).toBe(nowDayTime);
});

test('TimeTools::milliToSecond', () => {
  const now = new Date();
  const nowTime = Math.floor(now.getTime() / 1000);
  expect(TimeTools.milliToSecond()).toBe(nowTime);
  expect(TimeTools.milliToSecond(nowTime)).toBe(nowTime);
  expect(TimeTools.milliToSecond(now.getTime())).toBe(nowTime);
});

test('TimeTools::secondToMilli', () => {
  const now = new Date();
  const nowTime = Math.floor(now.getTime() / 1000);
  const nowMilliTime = nowTime * 1000;
  
  expect(TimeTools.secondToMilli()).toBe(nowMilliTime);
  expect(TimeTools.secondToMilli(nowTime)).toBe(nowMilliTime);
  expect(TimeTools.secondToMilli(now.getTime())).toBe(nowMilliTime);
});

test('CommonTools::padding', () => {
  expect(CommonTools.padding('100100', 6, '#', false)).toBe('100100');
  expect(CommonTools.padding('100100', 9, '#', false)).toBe('###100100');
  expect(CommonTools.padding('100100', 9, '#', true)).toBe('100100###');
});

test('CommonTools::genToken', () => {
  const key = 'string';
  const num = 1;
  expect(CommonTools.genToken(key, key, num)).toBe(md5(`${key},${key},${num}`).substr(0, 8));
});

test('CommonTools::format', () => {
  expect(CommonTools.format(`%s_%s`, 'a', 'b')).toBe('a_b');
});

test('MathTools', () => {
  expect(MathTools.getRandomFromRange(1, 1)).toBe(1);
  expect(MathTools.getRandomFromRange(1, 2)).toBeLessThanOrEqual(2);
  expect(MathTools.getRandomFromRange(2, 1)).toBeGreaterThanOrEqual(1);
});

test('JsonTools', () => {
  const map = new Map();
  map.set('a', 1);
  map.set('b', 2);
  map.set('c', 3);
  const obj = {a: 1, b: 2, c: 3};
  const objString = JSON.stringify(obj);
  
  expect(JsonTools.stringToJson(objString)).toStrictEqual(obj);
  expect(JsonTools.jsonToString(obj)).toBe(objString);
  expect(JsonTools.mapToJson(map)).toBe(objString);
  expect(JsonTools.jsonToMap(objString)).toStrictEqual(map);
  expect(JsonTools.mapToObj(map)).toStrictEqual(obj);
  expect(JsonTools.objToMap(obj)).toStrictEqual(map);
});

test('SharingTools', () => {
  expect(SharingTools.getShardId(0, 10001)).toBe(0);
  expect(SharingTools.getShardId(4, 10001)).toBe(1);
});
