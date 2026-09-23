// TRMNL Serverless - Node 20
// National League suisse : classement, dernier resultat, prochain match.
// Langues : francais, allemand, italien, anglais.

const LANGS = ["fr", "de", "it", "en"];
const FALLBACK_LANG = "fr";
const FALLBACK_TZ = "Europe/Zurich";

// Noms de club par langue. Le code court de la ligue est la cle stable.
const TEAMS = {
  EHCB: { fr: "HC Bienne", de: "EHC Biel", it: "EHC Bienne", en: "EHC Biel" },
  EHCK: { fr: "EHC Kloten", de: "EHC Kloten", it: "EHC Kloten", en: "EHC Kloten" },
  EVZ: { fr: "EV Zoug", de: "EV Zug", it: "EV Zugo", en: "EV Zug" },
  FRI: { fr: "Fribourg-Gottéron", de: "Freiburg-Gottéron", it: "Friburgo-Gottéron", en: "Fribourg-Gottéron" },
  GSHC: { fr: "Genève-Servette", de: "Genf-Servette", it: "Ginevra-Servette", en: "Genève-Servette" },
  HCA: { fr: "HC Ajoie", de: "HC Ajoie", it: "HC Ajoie", en: "HC Ajoie" },
  HCAP: { fr: "HC Ambrì-Piotta", de: "HC Ambrì-Piotta", it: "HC Ambrì-Piotta", en: "HC Ambrì-Piotta" },
  HCD: { fr: "HC Davos", de: "HC Davos", it: "HC Davos", en: "HC Davos" },
  HCL: { fr: "HC Lugano", de: "HC Lugano", it: "HC Lugano", en: "HC Lugano" },
  LHC: { fr: "Lausanne HC", de: "Lausanne HC", it: "Lausanne HC", en: "Lausanne HC" },
  SCB: { fr: "CP Berne", de: "SC Bern", it: "SC Berna", en: "SC Bern" },
  SCL: { fr: "SCL Tigers", de: "SCL Tigers", it: "SCL Tigers", en: "SCL Tigers" },
  SCRJ: { fr: "Rapperswil-Jona", de: "Rapperswil-Jona", it: "Rapperswil-Jona", en: "Rapperswil-Jona" },
  ZSC: { fr: "ZSC Lions", de: "ZSC Lions", it: "ZSC Lions", en: "ZSC Lions" },
};

const STRINGS = {
  fr: {
    league: "National League", standings: "Classement", rank: "Rang",
    points: "Points", matches: "Matchs", wins: "Gagnés", losses: "Perdus",
    diff: "Différence", last_match: "Dernier match", next_match: "Prochain match",
    no_last: "Aucun match joué", no_next: "Pas de match agendé",
    of: "sur", team_col: "Équipe", gp_col: "MJ", pts_col: "Pts",
    won: "victoire", lost: "défaite",
    home_long: "contre", away_long: "à", home_short: "c.", away_short: "à",
    ot: "ap", so: "tab", at: "à",
  },
  de: {
    league: "National League", standings: "Tabelle", rank: "Rang",
    points: "Punkte", matches: "Spiele", wins: "Siege", losses: "Niederlagen",
    diff: "Differenz", last_match: "Letztes Spiel", next_match: "Nächstes Spiel",
    no_last: "Noch kein Spiel", no_next: "Kein Spiel angesetzt",
    of: "von", team_col: "Team", gp_col: "Sp", pts_col: "Pkt",
    won: "Sieg", lost: "Niederlage",
    home_long: "gegen", away_long: "bei", home_short: "geg.", away_short: "bei",
    ot: "n.V.", so: "n.P.", at: "um",
  },
  it: {
    league: "National League", standings: "Classifica", rank: "Posizione",
    points: "Punti", matches: "Partite", wins: "Vinte", losses: "Perse",
    diff: "Differenza", last_match: "Ultima partita", next_match: "Prossima partita",
    no_last: "Nessuna partita giocata", no_next: "Nessuna partita in programma",
    of: "su", team_col: "Squadra", gp_col: "PG", pts_col: "Pti",
    won: "vittoria", lost: "sconfitta",
    home_long: "contro", away_long: "a", home_short: "c.", away_short: "a",
    ot: "dts", so: "drig", at: "alle",
  },
  en: {
    league: "National League", standings: "Standings", rank: "Rank",
    points: "Points", matches: "Games", wins: "Wins", losses: "Losses",
    diff: "Difference", last_match: "Last game", next_match: "Next game",
    no_last: "No game played", no_next: "No game scheduled",
    of: "of", team_col: "Team", gp_col: "GP", pts_col: "Pts",
    won: "win", lost: "loss",
    home_long: "vs", away_long: "at", home_short: "vs", away_short: "@",
    ot: "OT", so: "SO", at: "at",
  },
};

// Le VM de TRMNL tourne en small-icu : Intl ne connait que l'anglais. On ne
// lui demande donc que la conversion de fuseau, et on nomme les jours nous-memes.
const WEEKDAYS = {
  fr: ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"],
  de: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
  it: ["dom", "lun", "mar", "mer", "gio", "ven", "sab"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

const DATE_SEP = { fr: ".", de: ".", it: ".", en: "/" };


// --- utilitaires ------------------------------------------------------------

// TRMNL recupere l'URL de polling AVANT d'executer cette fonction et passe le
// resultat en entree. On retrouve le tableau de matchs quel que soit le nom que
// TRMNL lui donne (data pour une racine tableau, IDX_0 pour plusieurs URLs).
function resolveGames(input) {
  const looksRight = (v) =>
    Array.isArray(v) && v.length > 0 && v[0] && typeof v[0] === "object" &&
    Object.prototype.hasOwnProperty.call(v[0], "homeTeamShortName");

  const visit = (node, depth) => {
    if (!node || depth > 3) return null;
    if (looksRight(node)) return node;
    if (Array.isArray(node) || typeof node !== "object") return null;
    for (const key of Object.keys(node)) {
      if (key === "trmnl") continue;
      const found = visit(node[key], depth + 1);
      if (found) return found;
    }
    return null;
  };

  return visit(input, 0) || [];
}

function settings(input) {
  const s = (input && input.trmnl && input.trmnl.plugin_settings) || {};
  return s.custom_fields_values || {};
}

function userInfo(input) {
  return (input && input.trmnl && input.trmnl.user) || {};
}

function pickLang(fields, user) {
  const choice = String(fields.language || "auto").toLowerCase();
  if (LANGS.indexOf(choice) !== -1) return choice;
  const locale = String(user.locale || "").slice(0, 2).toLowerCase();
  return LANGS.indexOf(locale) !== -1 ? locale : FALLBACK_LANG;
}

function ordinal(n, lang) {
  if (lang === "de") return n + ".";
  if (lang === "it") return n + "\u00B0";
  if (lang === "fr") return n === 1 ? "1er" : n + "e";
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return n + "th";
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
  return n + suffix;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(String(value).endsWith("Z") ? value : value + "Z");
  return isNaN(d.getTime()) ? new Date(value) : d;
}

function seasonStart(now) {
  const y = now.getUTCFullYear();
  return new Date(Date.UTC(now.getUTCMonth() >= 6 ? y : y - 1, 6, 1));
}

function isFinished(game) {
  return String(game.status || game.baseStatus || "").toLowerCase() === "finished";
}

function isCanceled(game) {
  const s = String(game.status || game.baseStatus || "").toLowerCase();
  return s === "canceled" || s === "cancelled";
}

function logoFrom(game, side) {
  const prefix = side.toLowerCase();
  for (const key of Object.keys(game)) {
    const k = key.toLowerCase();
    if (k.startsWith(prefix) && k.includes("logo")) {
      const v = game[key];
      if (typeof v === "string" && v.indexOf("http") === 0) return v;
    }
  }
  return null;
}

function pad2(n) {
  return n < 10 ? "0" + n : String(n);
}

// Renvoie les composantes de la date telles que vues dans le fuseau demande.
function zonedParts(date, tz) {
  const opts = {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  };
  let parts;
  try {
    parts = new Intl.DateTimeFormat("en-US", Object.assign({ timeZone: tz }, opts)).formatToParts(date);
  } catch (e) {
    parts = new Intl.DateTimeFormat("en-US", Object.assign({ timeZone: "UTC" }, opts)).formatToParts(date);
  }
  const o = {};
  for (const part of parts) o[part.type] = part.value;
  const year = Number(o.year);
  const month = Number(o.month);
  const day = Number(o.day);
  let hour = Number(o.hour);
  if (hour === 24) hour = 0; // certaines versions de Node rendent minuit en "24"
  return {
    year: year, month: month, day: day,
    hour: hour, minute: Number(o.minute),
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
  };
}

function makeFormatters(lang, tz) {
  const names = WEEKDAYS[lang] || WEEKDAYS.fr;
  const sep = DATE_SEP[lang] || ".";
  return {
    date: (d) => {
      const p = zonedParts(d, tz);
      const tail = lang === "de" ? "." : "";
      return names[p.weekday] + " " + pad2(p.day) + sep + pad2(p.month) + tail;
    },
    time: (d) => {
      const p = zonedParts(d, tz);
      return pad2(p.hour) + ":" + pad2(p.minute);
    },
  };
}

// Victoire 3, victoire en prolongation ou aux tirs au but 2,
// defaite en prolongation ou aux tirs au but 1, defaite 0.
function awardPoints(game) {
  const home = Number(game.homeTeamResult);
  const away = Number(game.awayTeamResult);
  const extra = Boolean(game.isOvertime || game.isShootout);
  if (home > away) return extra ? [2, 1] : [3, 0];
  if (away > home) return extra ? [1, 2] : [0, 3];
  return [1, 1];
}

// --- fonction principale ----------------------------------------------------

function run(input) {
  const fields = settings(input);
  const user = userInfo(input);
  const lang = pickLang(fields, user);
  const t = STRINGS[lang];
  const tz = user.time_zone_iana || FALLBACK_TZ;
  const fmt = makeFormatters(lang, tz);
  const name = (c) => (TEAMS[c] ? TEAMS[c][lang] : c);

  const code = String(fields.team || "LHC").toUpperCase();
  const now = new Date();
  const start = seasonStart(now);

  const all = resolveGames(input);
  if (all.length === 0) {
    throw new Error(
      "Aucun match dans le payload. Verifiez que l'URL de polling pointe sur " +
      "https://www.nationalleague.ch/api/games"
    );
  }

  const games = [];
  for (const g of all) {
    const date = parseDate(g.date);
    if (!date || date < start) continue;
    if (g.isExhibition) continue;
    if (!TEAMS[g.homeTeamShortName] || !TEAMS[g.awayTeamShortName]) continue;
    games.push({ g: g, date: date, home: g.homeTeamShortName, away: g.awayTeamShortName });
  }
  games.sort((x, y) => x.date - y.date);

  // Classement
  const table = {};
  for (const key of Object.keys(TEAMS)) {
    table[key] = { code: key, gp: 0, pts: 0, win: 0, loss: 0, gf: 0, ga: 0 };
  }

  for (const item of games) {
    if (!isFinished(item.g) || isCanceled(item.g)) continue;
    const hs = Number(item.g.homeTeamResult);
    const as = Number(item.g.awayTeamResult);
    if (!Number.isFinite(hs) || !Number.isFinite(as)) continue;

    const pts = awardPoints(item.g);
    const H = table[item.home];
    const A = table[item.away];
    H.gp++; A.gp++;
    H.pts += pts[0]; A.pts += pts[1];
    H.gf += hs; H.ga += as;
    A.gf += as; A.ga += hs;
    if (hs > as) { H.win++; A.loss++; } else { A.win++; H.loss++; }
  }

  const rows = Object.keys(table).map((k) => {
    const x = table[k];
    x.diff = x.gf - x.ga;
    x.ppg = x.gp ? x.pts / x.gp : 0;
    return x;
  });

  // Ordre officiel NL : points, puis (a egalite) moins de matchs joues,
  // puis difference de buts, puis buts marques.
  rows.sort((x, y) => y.pts - x.pts || x.gp - y.gp || y.diff - x.diff || y.gf - x.gf);
  rows.forEach((x, i) => { x.rank = i + 1; });

  const me = rows.find((x) => x.code === code) || rows[0];

  function describe(item, atHome) {
    const oppCode = atHome ? item.away : item.home;
    return {
      opponent: name(oppCode),
      opponent_code: oppCode,
      opponent_logo: logoFrom(item.g, atHome ? "away" : "home"),
      at_home: atHome,
      versus_long: (atHome ? t.home_long : t.away_long) + " " + name(oppCode),
      versus_short: (atHome ? t.home_short : t.away_short) + " " + name(oppCode),
      date: fmt.date(item.date),
      time: fmt.time(item.date),
      arena: item.g.arena || "",
    };
  }

  // Dernier match joue
  let last = null;
  for (let i = games.length - 1; i >= 0; i--) {
    const item = games[i];
    if (item.home !== code && item.away !== code) continue;
    if (!isFinished(item.g)) continue;
    const atHome = item.home === code;
    const us = Number(atHome ? item.g.homeTeamResult : item.g.awayTeamResult);
    const them = Number(atHome ? item.g.awayTeamResult : item.g.homeTeamResult);
    last = describe(item, atHome);
    last.us = us;
    last.them = them;
    last.score = us + " - " + them;
    last.won = us > them;
    last.suffix = item.g.isShootout ? t.so : (item.g.isOvertime ? t.ot : "");
    last.result_label = us > them ? t.won : t.lost;
    break;
  }

  // Prochain match
  let next = null;
  const cutoff = new Date(now.getTime() - 3 * 3600 * 1000);
  for (const item of games) {
    if (item.home !== code && item.away !== code) continue;
    if (isFinished(item.g) || isCanceled(item.g)) continue;
    if (item.date < cutoff) continue;
    next = describe(item, item.home === code);
    next.iso = item.date.toISOString();
    break;
  }

  // Logo : champ du formulaire, sinon celui fourni par la ligue.
  let logo = fields.logo_url || null;
  if (!logo) {
    for (const item of games) {
      if (item.home === code) logo = logoFrom(item.g, "home");
      else if (item.away === code) logo = logoFrom(item.g, "away");
      if (logo) break;
    }
  }

  return {
    lang: lang,
    t: t,
    code: me.code,
    team_name: name(me.code),
    logo: logo,
    rank: me.rank,
    rank_label: ordinal(me.rank, lang),
    points: me.pts,
    games_played: me.gp,
    wins: me.win,
    losses: me.loss,
    goals_for: me.gf,
    goals_against: me.ga,
    diff: me.diff,
    diff_label: (me.diff > 0 ? "+" : "") + me.diff,
    ppg: me.ppg.toFixed(2),
    teams_count: rows.length,
    last: last,
    next: next,
    standings: rows.map((x) => ({
      rank: x.rank, code: x.code, name: name(x.code),
      gp: x.gp, pts: x.pts, diff: x.diff, me: x.code === code,
    })),
    updated_at: fmt.date(now) + " " + fmt.time(now),
  };
}
