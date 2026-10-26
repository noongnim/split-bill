// 원 단위 정수로 나눕니다. 나머지 1원은 참여자 등록 순서로 배분합니다.
export function calculate(people, items) {
  const totals = Object.fromEntries(people.map(p => [p.id, 0]));
  let total = 0;
  for (const item of items) {
    if (!Number.isSafeInteger(item.price) || item.price < 1 || !Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new Error('가격과 수량은 1 이상의 정수로 입력해 주세요.');
    const amount = item.price * item.quantity;
    if (!Number.isSafeInteger(amount) || !Number.isSafeInteger(total + amount)) throw new Error('계산할 수 있는 금액 범위를 초과했어요.');
    const payers = people.filter(p => item.payers.includes(p.id));
    if (!payers.length) throw new Error('모든 메뉴에 부담자를 한 명 이상 선택해 주세요.');
    const share = Math.floor(amount / payers.length);
    const remainder = amount % payers.length;
    payers.forEach((p, i) => { totals[p.id] += share + (i < remainder ? 1 : 0); });
    total += amount;
  }
  return { total, totals };
}
