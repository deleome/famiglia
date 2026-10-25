"use strict";
// «Фамилья» — движок игры. Вся логика правил здесь, сервер только передаёт действия.

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

// extra: карта из набора «Новые карты»
const CARDS = {
  zakaz:    { n: "Заказ", kind: "brown", count: 25, d: "Отнимите 1 жизнь у игрока в пределах дальности оружия. Один «Заказ» за ход." },
  krysha:   { n: "Крыша", kind: "brown", count: 12, d: "Сыграйте, когда на вас «Заказ»: жизнь не теряется." },
  whiskey:  { n: "Виски", kind: "brown", count: 6, d: "+1 жизнь. Спасает в момент гибели. Не действует, когда в игре двое." },
  feast:    { n: "Застолье", kind: "brown", count: 1, d: "Все живые получают +1 жизнь." },
  parcel:   { n: "Посылка", kind: "brown", count: 2, d: "Возьмите 2 карты." },
  obshak:   { n: "Общак", kind: "brown", count: 1, d: "Возьмите 3 карты." },
  robbery:  { n: "Ограбление", kind: "brown", count: 4, d: "Заберите карту у игрока на дистанции 1: из руки наугад или со стола." },
  arson:    { n: "Поджог", kind: "brown", count: 4, d: "Сбросьте карту любого игрока: из руки наугад или со стола." },
  showdown: { n: "Разборка", kind: "brown", count: 3, d: "По очереди сбрасываете «Заказ», начинает противник. Кто не смог — теряет жизнь." },
  raid:     { n: "Облава", kind: "brown", count: 2, d: "Каждый другой игрок сбрасывает «Заказ» или теряет жизнь." },
  tommygun: { n: "Томми-ган", kind: "brown", count: 1, d: "«Заказ» по всем остальным. Защита — «Крыша»." },
  loot:     { n: "Делёж добычи", kind: "brown", count: 2, d: "Открываются карты по числу живых, каждый по кругу берёт одну." },
  vest:     { n: "Бронежилет", kind: "blue", count: 2, d: "При «Заказе» в вас — проверка: ♥ — пуля мимо." },
  cadillac: { n: "Кадиллак", kind: "blue", count: 2, d: "Остальные видят вас на 1 дальше." },
  scope:    { n: "Оптика", kind: "blue", count: 1, d: "Вы видите всех на 1 ближе." },
  trunk:    { n: "Багажник", kind: "blue", count: 3, d: "На любого, кроме Крёстного отца. В начале хода проверка: ♥ — выбрался, иначе пропускает ход." },
  c4:       { n: "C4", kind: "blue", count: 1, d: "Перед собой. В начале хода проверка: ♠ 2–9 — взрыв, −3 жизни. Иначе C4 уходит к соседу." },
  sawnoff:  { n: "Обрез", kind: "weapon", range: 1, count: 2, d: "Дальность 1. «Заказ» сколько угодно раз за ход." },
  beretta:  { n: "Беретта", kind: "weapon", range: 2, count: 3, d: "Дальность 2." },
  magnum:   { n: "Магнум", kind: "weapon", range: 3, count: 1, d: "Дальность 3." },
  carbine:  { n: "Карабин", kind: "weapon", range: 4, count: 1, d: "Дальность 4." },
  rifle:    { n: "Винтовка", kind: "weapon", range: 5, count: 1, d: "Дальность 5." },
  eagle:    { n: "Пустынный орёл", kind: "weapon", range: 1, count: 1, d: "Дальность 1. Ваш «Заказ» отнимает 2 жизни. Защита — одна «Крыша»." },
  // новые карты
  interrogation: { n: "Допрос", kind: "brown", count: 4, extra: true, d: "Обменяйте на карту из колоды. Журналист вдобавок тайно узнаёт роль любого игрока." },
  bribe:     { n: "Подкуп", kind: "brown", count: 2, extra: true, d: "Заберите оружие у любого игрока и наденьте на себя." },
  lawyer:    { n: "Адвокат", kind: "brown", count: 2, extra: true, d: "Вытащите из «Багажника» себя или другого игрока. Можно сыграть в начале своего хода, сидя в багажнике." },
  kompromat: { n: "Компромат", kind: "brown", count: 1, extra: true, d: "Выбранный игрок в свой следующий ход не может сыграть «Заказ» на вас." },
  mole:      { n: "Крот", kind: "brown", count: 1, extra: true, d: "Отдайте карту из руки любому игроку и заберите у него случайную карту. Обе карты видят все." },
  molotov:   { n: "Коктейль Молотова", kind: "brown", count: 1, extra: true, d: "Цель и оба её соседа теряют по 1 жизни (вы сами не горите). Защита — «Крыша»." },
  "double-agent": { n: "Двойной агент", kind: "brown", count: 1, extra: true, d: "Сыграйте, когда на вас «Заказ»: он уходит в соседа (на выбор)." },
  ambush:    { n: "Засада", kind: "blue", count: 2, extra: true, d: "Перед собой. Первый, кто сыграет «Заказ» на вас, сам теряет 1 жизнь." },
  knuckles:  { n: "Кастет", kind: "blue", count: 2, extra: true, d: "Перед собой. От вашего «Заказа» по соседям нужны две «Крыши»." },
  safe:      { n: "Сейф", kind: "blue", count: 1, extra: true, d: "Перед собой. Карты из вашей руки нельзя украсть или поджечь." },
};

const CHARS = {
  vincenzo:  { n: "Снайпер Винченцо", hp: 4, d: "Его «Заказ» достаёт на 1 дальше, чем позволяет оружие." },
  rocco:     { n: "Боксёр Рокко", hp: 4, d: "По соседям (дистанция 1) может кидать «Заказ» без ограничения за ход." },
  luca:      { n: "Киллер Лука", hp: 4, d: "На его «Заказ» нужны две «Крыши»." },
  carlo:     { n: "Мститель Карло", hp: 4, d: "Получив «Заказ», может сразу ответить своим «Заказом» обидчику, бесплатно и на любую дистанцию." },
  nitti:     { n: "Подрывник Нитти", hp: 4, d: "Раз за ход может сыграть любую карту как «Поджог»." },
  benny:     { n: "Здоровяк Бенни", hp: 5, d: "Нет способности. Просто очень крепкий." },
  enzo:      { n: "Водитель Энцо", hp: 3, d: "Его видят на 2 дальше." },
  moisha:    { n: "Адвокат Мойша", hp: 4, d: "«Багажник» на него не действует." },
  salvatore: { n: "Бармен Сальваторе", hp: 4, d: "Любая карта масти ♥ из руки работает как «Виски»." },
  lucia:     { n: "Доктор Лучия", hp: 4, d: "Может лечить «Виски» любого игрока, не только себя." },
  santino:   { n: "Информатор Сантино", hp: 4, d: "Один раз за игру тайно узнаёт роль любого игрока." },
  tino:      { n: "Курьер Тино", hp: 4, d: "При наборе берёт 3 карты, но одну обязан отдать другому игроку." },
  fredo:     { n: "Шулер Фредо", hp: 4, d: "Дважды за ход может сбросить карту и взять новую из колоды." },
  alberto:   { n: "Бухгалтер Альберто", hp: 4, d: "Может держать в руке на 2 карты больше лимита." },
  donatella: { n: "Вдова Донателла", hp: 4, d: "Когда кто-то погибает, она берёт 2 карты." },
  rosa:      { n: "Мамма Роза", hp: 4, d: "Если у неё меньше всех жизней, при наборе берёт 3 карты вместо 2." },
};

const ROLES = {
  godfather:  { n: "Крёстный отец", d: "Роль открыта всем. Больше жизней, чем у остальных (+1…+3, зависит от числа игроков). Цель: уничтожить всех Полицейских и Крыс." },
  guard:      { n: "Телохранитель", d: "Защищайте Крёстного отца. Побеждаете вместе с ним." },
  cop:        { n: "Полицейский", d: "Убейте Крёстного отца. Побеждает вся полиция, даже погибшие." },
  rat:        { n: "Крыса", d: "Останьтесь последним живым. Крёстного отца нужно убрать последним." },
  journalist: { n: "Журналист", d: "Ни за кого не играете. Узнайте «Допросом» роли 3 игроков (кроме Крёстного отца) — и победите вместе с победителем, если будете живы." },
};

const ROLESETS = {
  4: ["godfather", "rat", "cop", "cop"],
  5: ["godfather", "rat", "cop", "cop", "guard"],
  6: ["godfather", "rat", "cop", "cop", "cop", "guard"],
  7: ["godfather", "rat", "cop", "cop", "cop", "guard", "guard"],
  8: ["godfather", "rat", "rat", "cop", "cop", "cop", "guard", "guard"],
};

const EVENTS = {
  prohibition: { n: "Сухой закон", d: "Весь круг «Виски» не лечит." },
  shootout:    { n: "Перестрелка", d: "Весь круг «Заказ» можно играть без ограничения." },
  fog:         { n: "Туман", d: "Весь круг все видят друг друга на 1 дальше." },
  festival:    { n: "Праздник", d: "Весь круг при наборе берут на 1 карту больше." },
  curfew:      { n: "Комендантский час", d: "Весь круг нельзя играть «Облаву», «Томми-ган» и «Коктейль Молотова»." },
  elections:   { n: "Выборы мэра", d: "Каждый отдаёт случайную карту из руки соседу слева." },
  strike:      { n: "Забастовка докеров", d: "Весь круг нельзя брать новое оружие и играть «Подкуп»." },
  vendetta:    { n: "Кровная месть", d: "Весь круг каждый, кто теряет жизнь (и остаётся жив), берёт карту." },
};

const ZONES = {
  port:   { n: "Порт", d: "Хозяин при наборе берёт на 1 карту больше, пока в руке не больше 4 карт." },
  casino: { n: "Казино", d: "Хозяин раз за ход может сбросить карту и взять новую." },
  bar:    { n: "Бар", d: "У хозяина «Виски» лечит 2 жизни." },
};

// Доп. жизни Крёстному отцу (проверено ботами): без них на 6–7 игроках полиция выигрывает 60–75% партий.
// С Журналистом бонус не нужен: он заменяет одного Полицейского.
const GF_BONUS = { 4: 1, 6: 2, 7: 1, 8: 1 };

const DEFAULT_OPTIONS = { extra: true, events: true, zones: false, shodka: false, debt: false, journalist: false };

const OVER = Symbol("over");
const TURN_END = Symbol("turnEnd");

function shuffle(a, rng) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const lives = n => (n === 1 ? "жизнь" : n < 5 ? "жизни" : "жизней");
const cardsWord = n => (n % 10 === 1 && n % 100 !== 11 ? "карту" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "карты" : "карт");

class Game {
  constructor(list, opts = {}) {
    if (!ROLESETS[list.length]) throw new Error("Нужно от 4 до 8 игроков");
    this.rng = opts.rng || Math.random;
    this.onChange = opts.onChange || (() => {});
    this.opt = { ...DEFAULT_OPTIONS, ...(opts.options || {}) };
    this.logs = [];
    this.prompt = null;
    this.phase = "chars";
    this.winner = null;
    this.turn = null;
    this.loot = null;
    this.lastCheck = null;
    this.event = null;
    this.zones = { port: null, casino: null, bar: null };
    this.shodkaUsed = false;
    this.vote = null;
    this.cards = [];
    let i = 0;
    for (const [key, c] of Object.entries(CARDS)) {
      if (c.extra && !this.opt.extra) continue;
      for (let k = 0; k < c.count; k++, i++) this.cards.push({ id: i, key, suit: SUITS[i % 4], rank: RANKS[(i * 5) % 13] });
    }
    this.deck = shuffle(this.cards.map(c => c.id), this.rng);
    this.discard = [];
    const set = ((this.opt.rolesets && this.opt.rolesets[list.length]) || ROLESETS[list.length]).slice();
    if (this.opt.journalist && list.length >= 7) set[set.indexOf(this.opt.jReplace || "cop")] = "journalist";
    const roles = shuffle(set, this.rng);
    const chars = shuffle(Object.keys(CHARS), this.rng);
    this.players = shuffle(list.slice(), this.rng).map((p, k) => ({
      id: p.id, name: p.name, role: roles[k], char: null, offer: [chars[2 * k], chars[2 * k + 1]],
      hp: 0, max: 0, hand: [], inPlay: [], alive: true, revealed: roles[k] === "godfather",
      zakazUsed: 0, nittiUsed: false, swaps: 0, casinoUsed: false, zoneTaken: false,
      spied: null, seen: [], known: [], noShoot: null, debt: null,
    }));
    this.log("Роли розданы. Выберите персонажа на телефоне.");
  }

  /* ---------- помощники ---------- */
  P(id) { return this.players.find(p => p.id === id); }
  C(id) { return this.cards[id]; }
  alive() { return this.players.filter(p => p.alive); }
  has(p, key) { return p.inPlay.some(id => this.C(id).key === key); }
  inPlayOf(p, key) { return p.inPlay.find(id => this.C(id).key === key); }
  weapon(p) { return p.inPlay.find(id => CARDS[this.C(id).key].kind === "weapon"); }
  weaponKey(p) { const w = this.weapon(p); return w != null ? this.C(w).key : null; }
  range(p) { const k = this.weaponKey(p); return k ? CARDS[k].range : 1; }
  limit(p) { return p.hp + (p.char === "alberto" ? 2 : 0); }
  others(p) { const al = this.alive(); const i = al.indexOf(p); return al.slice(i + 1).concat(al.slice(0, i)).filter(q => q !== p); }
  nextAlive(p) {
    const n = this.players.length, i = this.players.indexOf(p);
    for (let k = 1; k <= n; k++) { const q = this.players[(i + k) % n]; if (q.alive) return q; }
    return p;
  }
  prevAlive(p) {
    const n = this.players.length, i = this.players.indexOf(p);
    for (let k = 1; k <= n; k++) { const q = this.players[(i - k + n * 2) % n]; if (q.alive) return q; }
    return p;
  }
  neighbours(p) { return [...new Set([this.prevAlive(p), this.nextAlive(p)])].filter(q => q !== p); }
  ev(key) { return this.opt.events && this.event === key; }
  zoneOf(p) { return Object.keys(this.zones).find(z => this.zones[z] === p.id) || null; }
  owns(p, z) { return this.opt.zones && this.zones[z] === p.id; }
  dist(a, b) {
    const al = this.alive(), n = al.length, ia = al.indexOf(a), ib = al.indexOf(b);
    if (ia < 0 || ib < 0 || a === b) return 0;
    let d = Math.abs(ia - ib); d = Math.min(d, n - d);
    if (this.has(b, "cadillac")) d += 1;
    if (b.char === "enzo") d += 2;
    if (this.has(a, "scope")) d -= 1;
    if (this.ev("fog")) d += 1;
    return Math.max(1, d);
  }
  log(t) { this.logs.push({ t, at: Date.now() }); if (this.logs.length > 200) this.logs.shift(); }
  cardName(id) { const c = this.C(id); return `«${CARDS[c.key].n}»`; }
  whiskeyHeal(p) { return this.owns(p, "bar") ? 2 : 1; }

  flip() {
    if (!this.deck.length && this.discard.length > 1) {
      const top = this.discard.pop();
      this.deck = shuffle(this.discard, this.rng);
      this.discard = [top];
      this.log("Колода перемешана из сброса.");
    }
    return this.deck.length ? this.deck.pop() : null;
  }
  draw(p, n) { for (let k = 0; k < n; k++) { const id = this.flip(); if (id == null) break; p.hand.push(id); } }
  takeFromHand(p, id) { const i = p.hand.indexOf(id); if (i >= 0) p.hand.splice(i, 1); return i >= 0; }
  dropInPlay(p, id) { p.inPlay = p.inPlay.filter(x => x !== id); this.discard.push(id); }
  check(p, what, good) {
    const id = this.flip();
    if (id == null) { this.lastCheck = null; return { suit: "♥", rank: "A" }; }
    this.discard.push(id);
    const c = this.C(id), ok = good(c);
    this.lastCheck = { pid: p.id, what, card: this.cv(id), ok, at: Date.now() };
    this.log(`${p.name}: проверка «${what}» — ${c.rank}${c.suit}`);
    return c;
  }
  heal(p, n) { const before = p.hp; p.hp = Math.min(p.max, p.hp + n); return p.hp - before; }

  /* ---------- урон и смерть ---------- */
  damage(p, n, from) {
    if (!p.alive || n <= 0) return;
    p.hp -= n;
    this.log(`${p.name} теряет ${n} ${lives(n)}${from && from !== p ? ` от ${from.name}` : ""}.`);
    const z = this.zoneOf(p);
    if (z && this.opt.zones) { this.zones[z] = null; this.log(`${p.name} теряет район «${ZONES[z].n}».`); }
    if (p.hp <= 0) this.rescue(p);
    if (p.hp <= 0) this.kill(p, from);
    if (this.ev("vendetta") && p.alive) { this.draw(p, 1); this.log(`${p.name} берёт карту: кровная месть.`); }
  }
  rescue(p) {
    if (this.ev("prohibition")) return;
    while (p.hp <= 0 && this.alive().length > 2) {
      let w = p.hand.find(id => this.C(id).key === "whiskey");
      if (w == null && p.char === "salvatore") w = p.hand.find(id => this.C(id).suit === "♥");
      if (w == null) break;
      this.takeFromHand(p, w); this.discard.push(w); p.hp += this.whiskeyHeal(p);
      if (p.hp > p.max) p.hp = p.max;
      this.log(`${p.name} спасается: ${this.cardName(w)} как «Виски».`);
    }
  }
  kill(p, from) {
    p.alive = false; p.hp = 0; p.revealed = true;
    this.log(`☠ ${p.name} погиб. Роль: ${ROLES[p.role].n}.`);
    this.discard.push(...p.hand, ...p.inPlay); p.hand = []; p.inPlay = [];
    const z = this.zoneOf(p); if (z) this.zones[z] = null;
    if (from && from.alive && from !== p) {
      if (p.role === "cop") { this.draw(from, 3); this.log(`${from.name} получает 3 карты за полицейского.`); }
      if (p.role === "guard" && from.role === "godfather") {
        this.discard.push(...from.hand, ...from.inPlay); from.hand = []; from.inPlay = [];
        this.log(`Крёстный отец убил своего Телохранителя и сбрасывает все карты.`);
      }
    }
    for (const q of this.alive()) if (q.char === "donatella") { this.draw(q, 2); this.log(`${q.name} берёт 2 карты на поминках.`); }
    const w = this.checkWin();
    if (w) { this.finish(w); throw OVER; }
    if (this.turn === p.id) throw TURN_END;
  }
  checkWin() {
    const al = this.alive(), gf = this.players.find(p => p.role === "godfather");
    if (!gf.alive) {
      if (al.length === 1 && al[0].role === "rat") return { team: "rat", pid: al[0].id };
      return { team: "cop" };
    }
    if (!al.some(p => p.role === "cop" || p.role === "rat")) return { team: "mafia" };
    return null;
  }
  finish(w) {
    this.phase = "over"; this.winner = w; this.prompt = null; this.loot = null; this.vote = null;
    for (const p of this.players) p.revealed = true;
    let t = { mafia: "Победила Семья: Крёстный отец и Телохранители!", cop: "Победила полиция!", rat: `Победила Крыса: ${w.pid ? this.P(w.pid).name : ""}!` }[w.team];
    const j = this.players.find(p => p.role === "journalist");
    if (j && j.alive && j.known.length >= 3) { w.journalist = j.id; t += ` И Журналист ${j.name} — у него сенсация!`; }
    this.winner.text = t;
    this.log("🏁 " + t);
    this.onChange();
  }

  /* ---------- общение с игроками ---------- */
  ask(pid, prompt) {
    this.seq = (this.seq || 0) + 1;
    const seq = this.seq;
    return new Promise(res => { this.prompt = { pid, ...prompt, seq, res }; this.onChange(); });
  }
  answer(v) { const r = this.prompt.res; this.prompt = null; r(v); }
  defs(p, key) { return p.hand.filter(id => this.C(id).key === key); }

  /* ---------- основной цикл ---------- */
  async run() {
    try {
      const gf = this.players.find(p => p.role === "godfather");
      let cur = gf;
      for (;;) {
        this.turn = cur.id;
        if (cur === gf && this.opt.events) this.newEvent();
        try { await this.playTurn(cur); } catch (e) { if (e !== TURN_END) throw e; }
        if (cur.alive) cur.noShoot = null;
        cur = this.nextAlive(cur);
      }
    } catch (e) {
      if (e !== OVER) { console.error("Ошибка в игре:", e); this.log("Ошибка игры. Нажмите «В лобби» на ноутбуке."); this.crashed = true; this.onChange(); }
    }
  }

  newEvent() {
    const keys = Object.keys(EVENTS).filter(k => k !== this.event);
    this.event = keys[Math.floor(this.rng() * keys.length)];
    this.eventAt = Date.now();
    this.log(`📰 Событие города: «${EVENTS[this.event].n}». ${EVENTS[this.event].d}`);
    if (this.event === "elections") {
      const al = this.alive();
      const gifts = al.map(p => p.hand.length ? p.hand.splice(Math.floor(this.rng() * p.hand.length), 1)[0] : null);
      al.forEach((p, i) => { if (gifts[i] != null) this.nextAlive(p).hand.push(gifts[i]); });
      this.log("Каждый передал случайную карту соседу слева.");
    }
  }

  async playTurn(p) {
    p.zakazUsed = 0; p.nittiUsed = false; p.swaps = 0; p.casinoUsed = false; p.zoneTaken = false;
    this.log(`— Ход: ${p.name} —`);
    const c4 = this.inPlayOf(p, "c4");
    if (c4 != null) {
      const boom = c => c.suit === "♠" && RANKS.indexOf(c.rank) <= 7;
      const c = this.check(p, "C4", c => !boom(c));
      if (boom(c)) {
        this.dropInPlay(p, c4);
        this.log(`💥 C4 взорвалась у ${p.name}!`);
        this.damage(p, 3, null);
      } else {
        const nx = this.nextAlive(p);
        p.inPlay = p.inPlay.filter(x => x !== c4);
        if (nx !== p && !this.has(nx, "c4")) { nx.inPlay.push(c4); this.log(`C4 тикает дальше — к ${nx.name}.`); }
        else p.inPlay.push(c4);
      }
    }
    const trunk = this.inPlayOf(p, "trunk");
    if (trunk != null) {
      const law = this.defs(p, "lawyer")[0];
      let freed = false;
      if (law != null) {
        const a = await this.ask(p.id, { kind: "lawyer" });
        if (a.yes && p.hand.includes(law)) {
          this.takeFromHand(p, law); this.discard.push(law); this.dropInPlay(p, trunk);
          this.log(`${p.name} вызывает «Адвоката» и выходит из багажника.`);
          freed = true;
        }
      }
      if (!freed) {
        const c = this.check(p, "Багажник", c => c.suit === "♥");
        this.dropInPlay(p, trunk);
        if (c.suit !== "♥") { this.log(`${p.name} сидит в багажнике и пропускает ход.`); return; }
        this.log(`${p.name} выбрался из багажника!`);
      }
    }
    await this.drawPhase(p);
    if (p.debt) {
      p.debt.left--;
      if (p.debt.left <= 0) {
        const a = await this.ask(p.id, { kind: "debt" });
        if (a.pay && a.cards && a.cards.length === 3 && a.cards.every(id => p.hand.includes(id))) {
          for (const id of a.cards) { this.takeFromHand(p, id); this.discard.push(id); }
          this.log(`${p.name} возвращает долг ростовщику: 3 карты.`);
          p.debt = null;
        } else {
          p.debt = null;
          this.log(`${p.name} не вернул долг!`);
          this.damage(p, 1, null);
        }
      }
    }
    for (;;) {
      const a = await this.ask(p.id, { kind: "turn" });
      if (a.type === "end") {
        for (const id of a.discard || []) { this.takeFromHand(p, id); this.discard.push(id); }
        if ((a.discard || []).length) this.log(`${p.name} сбрасывает ${a.discard.length} ${cardsWord(a.discard.length)}.`);
        return;
      }
      if (a.type === "swap" || a.type === "casino") {
        this.takeFromHand(p, a.card); this.discard.push(a.card); this.draw(p, 1);
        if (a.type === "swap") p.swaps++; else p.casinoUsed = true;
        this.log(a.type === "casino" ? `${p.name} меняет карту в казино.` : `${p.name} меняет карту.`);
        continue;
      }
      if (a.type === "zone") {
        this.takeFromHand(p, a.card); this.discard.push(a.card);
        this.zones[a.zone] = p.id; p.zoneTaken = true;
        this.log(`${p.name} берёт под контроль район «${ZONES[a.zone].n}».`);
        continue;
      }
      if (a.type === "loan") {
        this.draw(p, 2); p.debt = { left: 2 };
        this.log(`${p.name} берёт в долг у ростовщика 2 карты.`);
        continue;
      }
      if (a.type === "shodka") { await this.runShodka(p); continue; }
      await this.playCard(p, a);
    }
  }

  drawCount(p) {
    let n = 2;
    if (p.char === "rosa" && this.others(p).every(q => p.hp < q.hp)) n = 3;
    if (this.ev("festival")) n++;
    if (this.owns(p, "port") && p.hand.length <= 4) n++;
    return n;
  }
  async drawPhase(p) {
    const n = this.drawCount(p);
    if (p.char === "tino") {
      const before = p.hand.length;
      this.draw(p, n + 1);
      const got = p.hand.slice(before);
      const others = this.others(p);
      if (got.length && others.length) {
        const a = await this.ask(p.id, { kind: "tino", cards: got });
        const to = this.P(a.to);
        this.takeFromHand(p, a.card); to.hand.push(a.card);
        this.log(`${p.name} передаёт карту игроку ${to.name}.`);
      }
      return;
    }
    if (n > 2) this.log(`${p.name} берёт ${n} ${cardsWord(n)}.`);
    this.draw(p, n);
  }

  /* ---------- сходка ---------- */
  shodkaTargets() { return this.alive().filter(q => q.role !== "godfather").map(q => q.id); }
  runShodka(caller) {
    this.shodkaUsed = true;
    this.log(`🗳 ${caller.name} созывает сходку! Все тайно голосуют, кого убрать.`);
    return new Promise(res => {
      this.vote = { by: caller.id, votes: {}, voters: this.alive().map(q => q.id), res, at: Date.now() };
      this.onChange();
    }).then(() => {
      const v = this.vote; this.vote = null;
      const tally = {};
      for (const t of Object.values(v.votes)) if (t) tally[t] = (tally[t] || 0) + 1;
      const rows = Object.entries(tally).sort((a, b) => b[1] - a[1]);
      if (rows.length) this.log("Итоги сходки: " + rows.map(([id, k]) => `${this.P(id).name} — ${k}`).join(", ") + ".");
      if (!rows.length || (rows[1] && rows[1][1] === rows[0][1])) { this.log("Голоса разделились — сходка никого не наказала."); this.onChange(); return; }
      const t = this.P(rows[0][0]);
      this.log(`Сходка решила: ${t.name} теряет 2 жизни.`);
      this.damage(t, 2, null);
      this.onChange();
    });
  }
  castVote(p, target) {
    const v = this.vote;
    if (!v) throw new Error("Сходки сейчас нет");
    if (!v.voters.includes(p.id)) throw new Error("Вы не голосуете на этой сходке");
    if (p.id in v.votes) throw new Error("Вы уже проголосовали");
    if (target != null && !this.shodkaTargets().includes(target)) throw new Error("За этого игрока голосовать нельзя");
    v.votes[p.id] = target || null;
    if (v.voters.every(id => id in v.votes || !this.P(id).alive)) v.res();
    this.onChange();
  }

  /* ---------- что можно сыграть ---------- */
  optFor(p, key) {
    const others = this.others(p);
    switch (key) {
      case "zakaz": {
        const unlimited = this.weaponKey(p) === "sawnoff" || p.zakazUsed < 1 || this.ev("shootout");
        const reach = this.range(p) + (p.char === "vincenzo" ? 1 : 0);
        const t = others.filter(q => q.id !== p.noShoot && this.dist(p, q) <= reach && (unlimited || (p.char === "rocco" && this.dist(p, q) <= 1)));
        return t.length ? { targets: t.map(q => q.id) } : null;
      }
      case "whiskey": {
        if (this.alive().length <= 2 || this.ev("prohibition")) return null;
        if (p.char === "lucia") { const t = this.alive().filter(q => q.hp < q.max); return t.length ? { targets: t.map(q => q.id) } : null; }
        return p.hp < p.max ? {} : null;
      }
      case "feast": case "parcel": case "obshak": case "loot": return {};
      case "raid": case "tommygun": return this.ev("curfew") ? null : {};
      case "robbery": { const t = others.filter(q => this.dist(p, q) <= 1 && ((q.hand.length && !this.has(q, "safe")) || q.inPlay.length)); return t.length ? { targets: t.map(q => q.id), pick: true } : null; }
      case "arson": { const t = others.filter(q => (q.hand.length && !this.has(q, "safe")) || q.inPlay.length); return t.length ? { targets: t.map(q => q.id), pick: true } : null; }
      case "showdown": return others.length ? { targets: others.map(q => q.id) } : null;
      case "vest": case "cadillac": case "scope": case "c4": case "ambush": case "knuckles": case "safe": return this.has(p, key) ? null : {};
      case "trunk": { const t = others.filter(q => q.role !== "godfather" && q.char !== "moisha" && !this.has(q, "trunk")); return t.length ? { targets: t.map(q => q.id) } : null; }
      case "interrogation": return p.role === "journalist" ? { targets: others.map(q => q.id) } : {};
      case "bribe": { if (this.ev("strike")) return null; const t = others.filter(q => this.weapon(q) != null); return t.length ? { targets: t.map(q => q.id) } : null; }
      case "lawyer": { const t = this.alive().filter(q => this.has(q, "trunk")); return t.length ? { targets: t.map(q => q.id) } : null; }
      case "kompromat": return others.length ? { targets: others.map(q => q.id) } : null;
      case "mole": { if (p.hand.length < 2) return null; const t = others.filter(q => q.hand.length && !this.has(q, "safe")); return t.length ? { targets: t.map(q => q.id), give: true } : null; }
      case "molotov": return this.ev("curfew") || !others.length ? null : { targets: others.map(q => q.id) };
      case "krysha": case "double-agent": return null;
      default: return CARDS[key] && CARDS[key].kind === "weapon" && !this.ev("strike") ? {} : null;
    }
  }
  playable(p) {
    const out = {};
    for (const id of p.hand) {
      const c = this.C(id), list = [];
      const add = (as, label) => { const o = this.optFor(p, as); if (o) list.push({ as, label, ...o }); };
      add(c.key, "Сыграть");
      if (p.char === "nitti" && !p.nittiUsed && c.key !== "arson") add("arson", "Как «Поджог»");
      if (p.char === "salvatore" && c.suit === "♥" && c.key !== "whiskey") add("whiskey", "Как «Виски»");
      out[id] = list;
    }
    return out;
  }
  validatePlay(p, a) {
    if (!p.hand.includes(a.card)) return "Этой карты нет в руке";
    const list = this.playable(p)[a.card] || [];
    const o = list.find(x => x.as === (a.as || this.C(a.card).key));
    if (!o) return "Эту карту сейчас нельзя сыграть";
    if (o.targets) {
      if (!o.targets.includes(a.target)) return "Выберите подходящую цель";
      const t = this.P(a.target);
      if (o.pick) {
        if (a.pick === "hand") { if (!t.hand.length || this.has(t, "safe")) return "Из руки этого игрока брать нельзя"; }
        else if (!t.inPlay.includes(a.pick)) return "Выберите карту";
      }
      if (o.give && (a.give === a.card || !p.hand.includes(a.give))) return "Выберите, какую карту отдать";
    }
    return null;
  }

  async playCard(p, a) {
    const c = this.C(a.card);
    const key = a.as || c.key;
    const t = a.target != null ? this.P(a.target) : null;
    this.takeFromHand(p, c.id);
    if (key === c.key && CARDS[key].kind !== "brown") {
      if (CARDS[key].kind === "weapon") {
        const w = this.weapon(p);
        if (w != null) this.dropInPlay(p, w);
        p.inPlay.push(c.id); this.log(`${p.name} берёт оружие: «${CARDS[key].n}».`);
      } else if (key === "trunk") {
        t.inPlay.push(c.id); this.log(`${p.name} закрывает ${t.name} в багажнике!`);
      } else {
        p.inPlay.push(c.id); this.log(`${p.name} выкладывает «${CARDS[key].n}».`);
      }
      return;
    }
    this.discard.push(c.id);
    const as = key !== c.key ? ` (${this.cardName(c.id)} как «${CARDS[key].n}»)` : "";
    if (key === "arson" && a.as === "arson") p.nittiUsed = true;
    switch (key) {
      case "zakaz": {
        p.zakazUsed++;
        this.log(`${p.name} делает «Заказ» на ${t.name}.`);
        const amb = this.inPlayOf(t, "ambush");
        if (amb != null) {
          this.dropInPlay(t, amb);
          this.log(`Засада! ${p.name} попадает под огонь людей ${t.name}.`);
          this.damage(p, 1, t);
        }
        let need = p.char === "luca" ? 2 : 1;
        if (this.has(p, "knuckles") && this.dist(p, t) <= 1) need = 2;
        await this.shot(p, t, { need, dmg: this.weaponKey(p) === "eagle" ? 2 : 1 });
        break;
      }
      case "whiskey": {
        const who = t || p;
        const h = this.whiskeyHeal(p);
        this.heal(who, h);
        this.log(`${p.name} пьёт «Виски»${who !== p ? ` с ${who.name}` : ""}${as}: +${h} ${lives(h)}${who !== p ? ` у ${who.name}` : ""}.`);
        break;
      }
      case "feast": for (const q of this.alive()) this.heal(q, 1); this.log(`${p.name} устраивает «Застолье»: все +1 жизнь.`); break;
      case "parcel": this.draw(p, 2); this.log(`${p.name} получает «Посылку»: +2 карты.`); break;
      case "obshak": this.draw(p, 3); this.log(`${p.name} открывает «Общак»: +3 карты.`); break;
      case "robbery": case "arson": {
        let got;
        if (a.pick === "hand") { got = t.hand.splice(Math.floor(this.rng() * t.hand.length), 1)[0]; }
        else { t.inPlay = t.inPlay.filter(x => x !== a.pick); got = a.pick; }
        const what = a.pick === "hand" ? "карту из руки" : this.cardName(got);
        if (key === "robbery") { p.hand.push(got); this.log(`${p.name} грабит ${t.name}: забирает ${what}.`); }
        else { this.discard.push(got); this.log(`${p.name} поджигает${as}: ${t.name} теряет ${what}.`); }
        break;
      }
      case "showdown": this.log(`${p.name} вызывает ${t.name} на разборку!`); await this.duel(p, t); break;
      case "raid":
        this.log(`${p.name} устраивает «Облаву»!`);
        for (const q of this.others(p)) if (q.alive) await this.raidOne(p, q);
        break;
      case "tommygun":
        this.log(`${p.name} поливает всех из «Томми-гана»!`);
        for (const q of this.others(p)) if (q.alive) await this.shot(p, q, { need: 1, dmg: 1 });
        break;
      case "loot": await this.doLoot(p); break;
      case "interrogation": {
        this.draw(p, 1);
        this.log(`${p.name} обменивает «Допрос» на карту из колоды.`);
        if (p.role === "journalist" && t) {
          if (!p.seen.includes(t.id)) p.seen.push(t.id);
          if (t.role !== "godfather" && !p.known.includes(t.id)) p.known.push(t.id);
        }
        break;
      }
      case "bribe": {
        const w = this.weapon(t);
        const mine = this.weapon(p);
        if (mine != null) this.dropInPlay(p, mine);
        t.inPlay = t.inPlay.filter(x => x !== w); p.inPlay.push(w);
        this.log(`${p.name} подкупает ${t.name} и забирает «${CARDS[this.C(w).key].n}».`);
        break;
      }
      case "lawyer": {
        const tr = this.inPlayOf(t, "trunk");
        if (tr != null) this.dropInPlay(t, tr);
        this.log(`${p.name} присылает «Адвоката»: ${t.name} выходит из багажника.`);
        break;
      }
      case "kompromat":
        t.noShoot = p.id;
        this.log(`${p.name} достаёт «Компромат» на ${t.name}: в свой ход он не сможет сделать «Заказ» на ${p.name}.`);
        break;
      case "mole": {
        this.takeFromHand(p, a.give); t.hand.push(a.give);
        const got = t.hand.splice(Math.floor(this.rng() * (t.hand.length - 1)), 1)[0];
        p.hand.push(got);
        this.log(`«Крот»: ${p.name} отдаёт ${t.name} ${this.cardName(a.give)} и забирает ${this.cardName(got)}.`);
        break;
      }
      case "molotov": {
        const victims = [t, ...this.neighbours(t)].filter(q => q !== p);
        this.log(`${p.name} бросает «Коктейль Молотова» в ${t.name}! Огонь задевает: ${victims.map(q => q.name).join(", ")}.`);
        for (const q of [...new Set(victims)]) if (q.alive) await this.shot(p, q, { need: 1, dmg: 1, fire: true });
        break;
      }
    }
  }

  async shot(from, to, { need, dmg, revenge, fire, redirected }) {
    if (!to.alive) return;
    let n = need;
    if (!fire && this.has(to, "vest")) {
      const c = this.check(to, "Бронежилет", c => c.suit === "♥");
      if (c.suit === "♥") { n--; this.log(`Бронежилет спас ${to.name}!`); }
    }
    if (n <= 0) return;
    const canKrysha = this.defs(to, "krysha").length >= n;
    const agents = !fire && !redirected ? this.defs(to, "double-agent") : [];
    const nbs = agents.length ? this.neighbours(to).map(q => q.id) : [];
    if (canKrysha || nbs.length) {
      const a = await this.ask(to.id, { kind: "dodge", from: from.id, need: n, dmg, fire: !!fire, agentTo: nbs });
      const d = this.defs(to, "krysha");
      if (a.agent && nbs.includes(a.agent) && this.defs(to, "double-agent").length) {
        const ag = this.defs(to, "double-agent")[0];
        this.takeFromHand(to, ag); this.discard.push(ag);
        const nb = this.P(a.agent);
        this.log(`«Двойной агент»! ${to.name} переводит удар на ${nb.name}.`);
        await this.shot(from, nb, { need, dmg, revenge: true, redirected: true });
        return;
      }
      if (a.dodge && d.length >= n) {
        for (const id of d.slice(0, n)) { this.takeFromHand(to, id); this.discard.push(id); }
        this.log(`${to.name} уходит под «Крышу».`);
        return;
      }
    }
    this.damage(to, dmg, from);
    if (!revenge && !fire && to.alive && to.char === "carlo" && from.alive && from !== to && from.id !== to.noShoot && this.defs(to, "zakaz").length) {
      const a = await this.ask(to.id, { kind: "revenge", vs: from.id });
      const z = this.defs(to, "zakaz")[0];
      if (a.yes && z != null && from.alive) {
        this.takeFromHand(to, z); this.discard.push(z);
        this.log(`${to.name} мстит ${from.name}!`);
        await this.shot(to, from, { need: 1, dmg: this.weaponKey(to) === "eagle" ? 2 : 1, revenge: true });
      }
    }
  }
  async raidOne(from, q) {
    if (this.defs(q, "zakaz").length) {
      const a = await this.ask(q.id, { kind: "raid", from: from.id });
      const z = this.defs(q, "zakaz")[0];
      if (a.dodge && z != null) { this.takeFromHand(q, z); this.discard.push(z); this.log(`${q.name} откупается «Заказом».`); return; }
    }
    this.damage(q, 1, from);
  }
  async duel(a, b) {
    let cur = b, other = a;
    for (;;) {
      if (this.defs(cur, "zakaz").length) {
        const ans = await this.ask(cur.id, { kind: "showdown", vs: other.id });
        const z = this.defs(cur, "zakaz")[0];
        if (ans.dodge && z != null) {
          this.takeFromHand(cur, z); this.discard.push(z);
          this.log(`${cur.name} отвечает «Заказом».`);
          [cur, other] = [other, cur];
          continue;
        }
      }
      this.log(`${cur.name} проигрывает разборку.`);
      this.damage(cur, 1, other);
      return;
    }
  }
  async doLoot(p) {
    const order = [p, ...this.others(p)];
    this.loot = [];
    for (let k = 0; k < order.length; k++) { const id = this.flip(); if (id != null) this.loot.push(id); }
    this.log(`${p.name} устраивает «Делёж добычи».`);
    for (const q of order) {
      if (!this.loot.length) break;
      if (!q.alive) continue;
      let id = this.loot[0];
      if (this.loot.length > 1) { const a = await this.ask(q.id, { kind: "loot" }); id = a.card; }
      this.loot = this.loot.filter(x => x !== id);
      q.hand.push(id);
      this.log(`${q.name} берёт ${this.cardName(id)}.`);
    }
    this.discard.push(...this.loot); this.loot = null;
  }

  /* ---------- действия от игроков ---------- */
  turnExtras(p) {
    return {
      zones: this.opt.zones && !this.zoneOf(p) && !p.zoneTaken && p.hand.length ? Object.keys(this.zones).filter(z => !this.zones[z]) : [],
      casino: this.owns(p, "casino") && !p.casinoUsed && p.hand.length > 0,
      loan: this.opt.debt && !p.debt,
      shodka: this.opt.shodka && !this.shodkaUsed && this.alive().length > 2,
    };
  }
  act(pid, a) {
    const p = this.P(pid);
    if (!p) throw new Error("Вы не участвуете в этой партии");
    if (this.phase === "chars") {
      if (a.type !== "pickChar") throw new Error("Сначала выберите персонажа");
      if (p.char) throw new Error("Персонаж уже выбран");
      this.pickChar(p, a.i === 1 ? 1 : 0);
      return;
    }
    if (this.phase !== "play") throw new Error("Игра окончена");
    if (!p.alive) throw new Error("Вы выбыли из игры");
    if (a.type === "spy") {
      if (p.char !== "santino" || p.spied) throw new Error("Способность уже использована");
      const t = this.P(a.target);
      if (!t || t === p) throw new Error("Выберите игрока");
      p.spied = t.id; if (!p.seen.includes(t.id)) p.seen.push(t.id);
      this.log(`${p.name} навёл справки о ком-то…`); this.onChange();
      return;
    }
    if (a.type === "vote") return this.castVote(p, a.target);
    const pr = this.prompt;
    if (!pr || pr.pid !== pid) throw new Error(this.vote ? "Идёт сходка" : "Сейчас не ваш ход");
    if (a.seq != null && a.seq !== pr.seq) throw new Error("Это нажатие устарело — посмотрите на экран ещё раз");
    switch (pr.kind) {
      case "turn": {
        const ex = this.turnExtras(p);
        if (a.type === "end") {
          const extra = p.hand.length - this.limit(p);
          const d = Array.isArray(a.discard) ? [...new Set(a.discard)] : [];
          if (extra > 0 && (d.length !== extra || !d.every(id => p.hand.includes(id)))) throw new Error(`Нужно сбросить ${extra} ${cardsWord(extra)}`);
          return this.answer({ type: "end", discard: extra > 0 ? d : [] });
        }
        if (a.type === "swap") {
          if (p.char !== "fredo" || p.swaps >= 2) throw new Error("Больше менять нельзя");
          if (!p.hand.includes(a.card)) throw new Error("Этой карты нет в руке");
          return this.answer({ type: "swap", card: a.card });
        }
        if (a.type === "casino") {
          if (!ex.casino) throw new Error("Казино сейчас недоступно");
          if (!p.hand.includes(a.card)) throw new Error("Этой карты нет в руке");
          return this.answer({ type: "casino", card: a.card });
        }
        if (a.type === "zone") {
          if (!ex.zones.includes(a.zone)) throw new Error("Этот район занять нельзя");
          if (!p.hand.includes(a.card)) throw new Error("Выберите карту для сброса");
          return this.answer({ type: "zone", zone: a.zone, card: a.card });
        }
        if (a.type === "loan") { if (!ex.loan) throw new Error("У вас уже есть долг"); return this.answer({ type: "loan" }); }
        if (a.type === "shodka") { if (!ex.shodka) throw new Error("Сходку уже созывали"); return this.answer({ type: "shodka" }); }
        if (a.type === "play") {
          const err = this.validatePlay(p, a);
          if (err) throw new Error(err);
          return this.answer({ type: "play", card: a.card, as: a.as, target: a.target, pick: a.pick, give: a.give });
        }
        throw new Error("Неизвестное действие");
      }
      case "dodge": {
        if (a.agent != null) { if (!(pr.agentTo || []).includes(a.agent)) throw new Error("Выберите соседа"); return this.answer({ agent: a.agent }); }
        return this.answer({ dodge: !!a.dodge });
      }
      case "raid": case "showdown": return this.answer({ dodge: !!a.dodge });
      case "revenge": case "lawyer": return this.answer({ yes: !!a.yes });
      case "debt": {
        if (a.pay) {
          const d = Array.isArray(a.cards) ? [...new Set(a.cards)] : [];
          if (d.length !== 3 || !d.every(id => p.hand.includes(id))) throw new Error("Выберите 3 карты");
          return this.answer({ pay: true, cards: d });
        }
        return this.answer({ pay: false });
      }
      case "tino": {
        const to = this.P(a.to);
        if (!pr.cards.includes(a.card) || !p.hand.includes(a.card)) throw new Error("Выберите одну из новых карт");
        if (!to || !to.alive || to === p) throw new Error("Выберите, кому отдать");
        return this.answer({ card: a.card, to: a.to });
      }
      case "loot": {
        if (!this.loot || !this.loot.includes(a.card)) throw new Error("Выберите карту из добычи");
        return this.answer({ card: a.card });
      }
    }
    throw new Error("Неизвестное действие");
  }

  pickChar(p, i) {
    p.char = p.offer[i];
    p.max = CHARS[p.char].hp + (p.role === "godfather" ? 1 + ((this.players.some(q => q.role === "journalist") ? 0 : ((this.opt.gfBonus || GF_BONUS)[this.players.length] || 0))) : 0);
    p.hp = p.max;
    this.draw(p, p.max);
    this.log(`${p.name} — ${CHARS[p.char].n}.`);
    if (this.players.every(q => q.char)) {
      this.phase = "play";
      this.log("Все готовы. Игра началась!");
      this.run();
    }
    this.onChange();
  }

  defaultAnswer() {
    const pr = this.prompt, p = this.P(pr.pid);
    switch (pr.kind) {
      case "turn": { const extra = p.hand.length - this.limit(p); return { type: "end", discard: extra > 0 ? p.hand.slice(-extra) : [] }; }
      case "dodge": return { dodge: this.defs(p, "krysha").length >= pr.need };
      case "raid": case "showdown": return { dodge: true };
      case "revenge": case "lawyer": return { yes: true };
      case "debt": return p.hand.length >= 3 ? { pay: true, cards: p.hand.slice(0, 3) } : { pay: false };
      case "tino": return { card: pr.cards.find(id => p.hand.includes(id)), to: this.others(p)[0].id };
      case "loot": return { card: this.loot[0] };
    }
    return {};
  }
  force() {
    if (this.phase === "chars") { for (const p of this.players) if (!p.char) this.pickChar(p, 0); return; }
    if (this.phase !== "play") return;
    if (this.vote) {
      const miss = this.vote.voters.filter(id => !(id in this.vote.votes));
      this.log(`Ведущий закрыл голосование (воздержались: ${miss.map(id => this.P(id).name).join(", ")}).`);
      for (const id of miss) this.vote.votes[id] = null;
      this.vote.res();
      return;
    }
    if (this.prompt) {
      const p = this.P(this.prompt.pid);
      this.log(`Ведущий ответил за ${p.name}.`);
      this.answer(this.defaultAnswer());
    }
  }

  /* ---------- что видит каждый ---------- */
  cv(id) { const c = this.C(id), d = CARDS[c.key]; return { id, key: c.key, n: d.n, d: d.d, kind: d.kind, suit: c.suit, rank: c.rank, range: d.range || 0 }; }
  charView(key) { return key ? { key, ...CHARS[key] } : null; }
  promptText(pr) {
    const n = id => (this.P(id) || {}).name || "";
    const me = this.P(pr.pid).name;
    switch (pr.kind) {
      case "turn": return `Ходит ${me}`;
      case "dodge": return pr.fire ? `Огонь подбирается к ${me}…` : `${n(pr.from)} делает «Заказ» на ${me}. Ждём ответа…`;
      case "raid": return `«Облава»: ${me} решает, сбросить ли «Заказ»`;
      case "showdown": return `Разборка: ${me} против ${n(pr.vs)}`;
      case "revenge": return `${me} думает, мстить ли ${n(pr.vs)}…`;
      case "lawyer": return `${me} в багажнике…`;
      case "debt": return `Ростовщик пришёл за долгом к ${me}`;
      case "tino": return `${me} решает, кому отдать карту`;
      case "loot": return `${me} выбирает карту из добычи`;
    }
    return "";
  }
  view(pid) {
    const me = this.P(pid);
    const over = this.phase === "over";
    const vote = this.vote;
    const v = {
      phase: this.phase,
      turn: this.turn,
      deck: this.deck.length,
      options: this.opt,
      discardTop: this.discard.length ? this.cv(this.discard[this.discard.length - 1]) : null,
      loot: this.loot ? this.loot.map(id => this.cv(id)) : null,
      lastCheck: this.lastCheck,
      log: this.logs.slice(-60).map(l => l.t),
      winner: this.winner,
      crashed: !!this.crashed,
      event: this.opt.events && this.event ? { key: this.event, ...EVENTS[this.event], at: this.eventAt } : null,
      zones: this.opt.zones ? Object.keys(ZONES).map(z => ({ key: z, ...ZONES[z], owner: this.zones[z] })) : null,
      shodka: this.opt.shodka ? { used: this.shodkaUsed } : null,
      vote: vote ? { by: vote.by, voted: Object.keys(vote.votes).length, total: vote.voters.length, done: Object.keys(vote.votes) } : null,
      waiting: this.prompt ? { pid: this.prompt.pid, kind: this.prompt.kind, text: this.promptText(this.prompt) }
        : vote ? { pid: null, kind: "vote", text: `🗳 Сходка: проголосовали ${Object.keys(vote.votes).length} из ${vote.voters.length}` } : null,
      players: this.players.map((p, seat) => ({
        id: p.id, name: p.name, seat, alive: p.alive, hp: p.hp, max: p.max,
        char: this.charView(p.char), picked: !!p.char,
        role: p.revealed || p === me || over || (me && me.seen.includes(p.id)) ? p.role : null,
        hand: p.hand.length, inPlay: p.inPlay.map(id => this.cv(id)),
        range: this.range(p) + (p.char === "vincenzo" ? 1 : 0),
        dist: me && me.alive && p !== me && p.alive && this.phase === "play" ? this.dist(me, p) : null,
        zone: this.opt.zones ? this.zoneOf(p) : null,
        debt: p.debt ? p.debt.left : null,
        noShoot: p.noShoot,
      })),
    };
    if (me) {
      const pr = this.prompt && this.prompt.pid === me.id ? this.prompt : null;
      v.me = {
        id: me.id, role: me.role, alive: me.alive,
        offer: this.phase === "chars" && !me.char ? me.offer.map(k => this.charView(k)) : null,
        hand: me.hand.map(id => this.cv(id)),
        limit: this.limit(me),
        spied: me.spied, seen: me.seen, known: me.role === "journalist" ? me.known : null,
        canSpy: me.char === "santino" && !me.spied && me.alive && this.phase === "play",
        swapsLeft: me.char === "fredo" ? 2 - me.swaps : 0,
        nittiUsed: me.nittiUsed,
        mustVote: !!(vote && vote.voters.includes(me.id) && !(me.id in vote.votes) && me.alive),
        voteTargets: vote ? this.shodkaTargets() : null,
        extras: pr && pr.kind === "turn" ? this.turnExtras(me) : null,
        prompt: pr ? {
          seq: pr.seq, kind: pr.kind, from: pr.from || null, vs: pr.vs || null, need: pr.need || 0, dmg: pr.dmg || 1, fire: !!pr.fire,
          agentTo: pr.agentTo || [],
          cards: pr.cards ? pr.cards.map(id => this.cv(id)) : null,
          canDodge: pr.kind === "dodge" ? this.defs(me, "krysha").length >= pr.need
            : (pr.kind === "raid" || pr.kind === "showdown" || pr.kind === "revenge") ? this.defs(me, "zakaz").length > 0
            : pr.kind === "debt" ? me.hand.length >= 3 : false,
        } : null,
        playable: pr && pr.kind === "turn" ? this.playable(me) : null,
      };
    }
    return v;
  }
}

module.exports = { Game, CARDS, CHARS, ROLES, ROLESETS, EVENTS, ZONES, DEFAULT_OPTIONS };
