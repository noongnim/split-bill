import { calculate } from './calculator.js';
const KEY = 'split-bill-v1';
const $ = id => document.getElementById(id);
const won = value => `${value.toLocaleString('ko-KR')}원`;
let state = { people: [], items: [] };
let result = null;
let storageWarning = '';
function validState(s) {
  return s && Array.isArray(s.people) && Array.isArray(s.items)
    && s.people.every(p => typeof p.id === 'string' && typeof p.name === 'string' && p.name.trim() && p.name.length <= 20)
    && new Set(s.people.map(p => p.id)).size === s.people.length
    && s.items.every(i => typeof i.id === 'string' && typeof i.name === 'string' && i.name.trim() && i.name.length <= 50 && Number.isSafeInteger(i.price) && i.price > 0 && i.price <= 1e9 && Number.isInteger(i.quantity) && i.quantity > 0 && i.quantity <= 10000 && Array.isArray(i.payers) && i.payers.every(id => s.people.some(p => p.id === id)))
    && new Set(s.items.map(i => i.id)).size === s.items.length;
}
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const saved = JSON.parse(raw);
    if (!validState(saved)) throw new Error();
    state = saved;
  }
} catch { storageWarning = '저장된 내역을 읽을 수 없어요. 새 내역으로 시작합니다.'; }
function message(text) { $('status').textContent = text; }
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { message('브라우저 저장 공간을 사용할 수 없어 새로고침하면 내역이 사라질 수 있어요.'); }
}
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function button(text, action, className) {
  const node = el('button', text, className);
  node.type = 'button'; node.addEventListener('click', action); return node;
}
function update() { render(); save(); }
function render() {
  $('people-count').textContent = `${state.people.length}명`;
  $('people-empty').hidden = state.people.length > 0;
  $('items-empty').hidden = state.items.length > 0;
  $('people').replaceChildren();
  state.people.forEach(person => {
    const chip = el('div', undefined, 'person');
    const remove = button('×', () => {
      const affected = state.items.some(i => i.payers.includes(person.id));
      if (affected && !confirm(`${person.name}님을 삭제하면 메뉴의 부담자에서도 제외됩니다. 삭제할까요?`)) return;
      state.people = state.people.filter(p => p.id !== person.id);
      state.items.forEach(i => { i.payers = i.payers.filter(id => id !== person.id); });
      update();
    });
    remove.setAttribute('aria-label', `${person.name} 참여자 삭제`);
    chip.append(el('span', person.name), remove); $('people').append(chip);
  });
  $('items').replaceChildren();
  state.items.forEach(item => {
    const card = el('article', undefined, 'menu');
    const top = el('div', undefined, 'menu-top');
    const title = el('div'); title.append(el('h3', item.name), el('small', `${won(item.price)} × ${item.quantity}개 = ${won(item.price * item.quantity)}`));
    const remove = button('삭제', () => { state.items = state.items.filter(i => i.id !== item.id); update(); }, 'delete');
    remove.setAttribute('aria-label', `${item.name} 메뉴 삭제`);
    top.append(title, remove); card.append(top);
    card.append(button('모두 선택', () => { item.payers = state.people.map(p => p.id); update(); }, 'all'));
    const choices = el('div', undefined, 'payer-list');
    state.people.forEach(person => {
      const label = el('label', undefined, 'payer');
      const input = document.createElement('input'); input.type = 'checkbox'; input.checked = item.payers.includes(person.id);
      input.setAttribute('aria-label', `${item.name}: ${person.name} 부담`);
      input.addEventListener('change', () => {
        item.payers = input.checked ? [...new Set([...item.payers, person.id])] : item.payers.filter(id => id !== person.id);
        // 체크박스를 다시 만들지 않아 키보드 포커스를 유지합니다.
        renderResult(); save();
        const old = card.querySelector('.warning'); if (old) old.remove();
        if (!item.payers.length) card.append(el('p', '부담자를 한 명 이상 선택해 주세요.', 'warning'));
      });
      label.append(input, el('span', person.name)); choices.append(label);
    });
    card.append(choices);
    if (!item.payers.length) card.append(el('p', '부담자를 한 명 이상 선택해 주세요.', 'warning'));
    $('items').append(card);
  });
  renderResult();
}
function renderResult() {
  $('manual-copy')?.remove();
  result = null;
  $('results').replaceChildren();
  $('copy').disabled = true;
  const total = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  $('total').textContent = Number.isSafeInteger(total) ? won(total) : '금액 범위 초과';
  if (!state.items.length) { $('result-note').textContent = '메뉴를 추가하면 개인별 금액이 표시돼요.'; return; }
  try { result = calculate(state.people, state.items); }
  catch (error) { $('result-note').textContent = error.message; return; }
  state.people.forEach(person => {
    const row = el('div', undefined, 'result-row');
    row.append(el('span', person.name), el('strong', won(result.totals[person.id]))); $('results').append(row);
  });
  $('result-note').textContent = `총 ${state.people.length}명 · 개인별 합계가 총 결제 금액과 일치해요.`;
  $('copy').disabled = false;
}
$('person-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = $('person-name').value.trim();
  if (!name) return message('이름을 입력해 주세요.');
  if (state.people.some(p => p.name === name)) return message('같은 이름이 있어요. 구분할 수 있는 이름을 입력해 주세요.');
  state.people.push({ id: crypto.randomUUID(), name }); $('person-name').value = ''; message('참여자를 추가했어요. 기존 메뉴의 부담자는 직접 선택해 주세요.'); update(); $('person-name').focus();
});
$('item-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!state.people.length) { message('먼저 참여자를 추가해 주세요.'); $('person-name').focus(); return; }
  const name = $('item-name').value.trim();
  const price = Number($('item-price').value), quantity = Number($('item-quantity').value);
  if (!name || !Number.isSafeInteger(price) || price < 1 || price > 1e9 || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000) return message('메뉴명과 올바른 가격·수량을 입력해 주세요.');
  state.items.push({ id: crypto.randomUUID(), name, price, quantity, payers: state.people.map(p => p.id) });
  $('item-form').reset(); message('메뉴를 추가했어요. 함께 먹은 사람만 선택해 주세요.'); update(); $('item-name').focus();
});
$('copy').addEventListener('click', async () => {
  if (!result) return;
  const text = ['[같이정산]', ...state.people.map(p => `${p.name}: ${won(result.totals[p.id])}`), `총 결제 금액: ${won(result.total)}`, '(나머지 금액은 참여자 등록 순서대로 1원씩 배분)'].join('\n');
  try { await navigator.clipboard.writeText(text); message('복사했어요! 카카오톡 등 원하는 곳에 붙여넣어 주세요.'); }
  catch {
    let area = $('manual-copy');
    if (!area) { area = document.createElement('textarea'); area.id = 'manual-copy'; area.setAttribute('aria-label', '직접 복사할 정산 결과'); $('copy').after(area); }
    area.value = text; area.focus(); area.select(); message('자동 복사가 지원되지 않아요. 선택된 내용을 직접 복사해 주세요.');
  }
});
$('reset').addEventListener('click', () => {
  if (!confirm('모든 참여자와 메뉴를 지울까요? 이 작업은 되돌릴 수 없어요.')) return;
  state = { people: [], items: [] }; $('manual-copy')?.remove(); update(); message('모든 내역을 지웠어요.');
});
render(); if (storageWarning) message(storageWarning);
