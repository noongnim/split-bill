import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from '../calculator.js';
const people = ['a', 'b', 'c'].map(id => ({ id, name: id }));
const menu = (price, payers, quantity = 1) => ({ price, quantity, payers });
test('개별 음료와 공유 디저트, 수량을 함께 계산한다', () => {
  assert.deepEqual(calculate(people, [menu(4500, ['a']), menu(5000, ['b']), menu(6000, ['c']), menu(8000, ['a','b','c'], 2)]), { total: 31500, totals: { a: 9834, b: 10333, c: 11333 } });
});
test('1원 나머지는 참여자 등록 순서로 나누며 부담자 선택 순서에 영향받지 않는다', () => {
  assert.deepEqual(calculate(people, [menu(10000, ['c','b','a'])]).totals, { a:3334,b:3333,c:3333 });
  assert.deepEqual(calculate(people, [menu(1, ['a','b','c'])]).totals, { a:1,b:0,c:0 });
});
test('비부담자는 0원이고 한 명이 전액 부담할 수 있다', () => {
  assert.deepEqual(calculate(people, [menu(3000, ['b'], 2)]).totals, { a:0,b:6000,c:0 });
});
test('부담자가 없거나 삭제된 참여자만 있으면 계산하지 않는다', () => {
  assert.throws(() => calculate(people, [menu(1000, [])]), /부담자/);
  assert.throws(() => calculate(people, [menu(1000, ['deleted'])]), /부담자/);
});
test('잘못된 가격, 수량, 정수 범위 초과를 거부한다', () => {
  for (const value of [0,-1,0.5,NaN,Infinity]) {
    assert.throws(() => calculate(people, [menu(value,['a'])]));
    assert.throws(() => calculate(people, [menu(1000,['a'],value)]));
  }
  assert.throws(() => calculate(people,[menu(Number.MAX_SAFE_INTEGER,['a'],2)]));
  assert.throws(() => calculate(people,[menu(Number.MAX_SAFE_INTEGER,['a']),menu(1,['a'])]));
});
test('여러 금액과 부담자 조합에서도 합계가 항상 정확하다', () => {
  for(let price=1;price<1000;price++) {
    const result=calculate(people,[menu(price,['a','b','c'],3),menu(price+1,['b','c'])]);
    assert.equal(Object.values(result.totals).reduce((a,b)=>a+b,0), result.total);
    assert.ok(Object.values(result.totals).every(Number.isSafeInteger));
  }
});
test('빈 내역은 0원이다', () => assert.deepEqual(calculate([],[]),{total:0,totals:{}}));
