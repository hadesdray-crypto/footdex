import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { LuSearch } from "react-icons/lu";
import { type Album, type LigueMatch, type PaysMatch, loadLigues, loadPays, loadPaysMeta, loadWiki } from "../data";
import { Chips, Failure, Link, Loading, More, PageTitle, useLoad } from "../ui/bits";
import { cx, fmt, fold, shortDate } from "../util";

type Tab = "ligues" | "pays" | "effectifs";

function readTab(): Tab {
  try {
    return (sessionStorage.getItem("footdex.scores") as Tab) || "ligues";
  } catch {
    return "ligues";
  }
}

export function Scores({ album }: { album: Album }) {
  const [tab, setTab] = useState<Tab>(readTab);
  useEffect(() => {
    try {
      sessionStorage.setItem("footdex.scores", tab);
    } catch {
      /* ignore */
    }
  }, [tab]);
  return (
    <div>
      <PageTitle kicker="Les archives" title="Les scores">
        <p>
          {fmt(22842)} matchs de Ligue 1 (depuis 1993) et de Ligue 2 (depuis 1997), {fmt(49945)} matchs entre pays depuis le 30 novembre 1872, dont {fmt(1068)} de Coupe
          du monde. Rien n'a été retiré.
        </p>
      </PageTitle>
      <Chips
        label="Archive"
        value={tab}
        onChange={setTab}
        options={[
          ["ligues", "Ligue 1 et Ligue 2"],
          ["pays", "Matchs entre pays"],
          ["effectifs", "Effectifs Wikipédia"],
        ]}
      />
      {tab === "ligues" ? <Ligues album={album} /> : tab === "pays" ? <Pays /> : <Effectifs />}
    </div>
  );
}

type Line = { team: string; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number };

function table(rows: LigueMatch[]): Line[] {
  const map = new Map<string, Line>();
  const get = (team: string) => {
    let line = map.get(team);
    if (!line) {
      line = { team, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
      map.set(team, line);
    }
    return line;
  };
  for (const m of rows) {
    const h = get(m.home);
    const a = get(m.away);
    h.p++; a.p++;
    h.gf += m.hg; h.ga += m.ag; a.gf += m.ag; a.ga += m.hg;
    if (m.hg > m.ag) { h.w++; a.l++; h.pts += 3; }
    else if (m.hg < m.ag) { a.w++; h.l++; a.pts += 3; }
    else { h.d++; a.d++; h.pts++; a.pts++; }
  }
  return [...map.values()].sort((x, y) => y.pts - x.pts || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf || x.team.localeCompare(y.team, "fr"));
}

function Ligues({ album }: { album: Album }) {
  const { data, error, retry } = useLoad(() => loadLigues(), []);
  const [league, setLeague] = useState<"Ligue 1" | "Ligue 2">("Ligue 1");
  const [season, setSeason] = useState<string>("2026-2027");
  const [team, setTeam] = useState("");
  const [view, setView] = useState<"resultats" | "classement">("resultats");
  const [shown, setShown] = useState(60);
  const deferred = useDeferredValue(team);

  const seasons = useMemo(() => (data ? [...new Set(data.rows.filter((r) => r.league === league).map((r) => r.season))].sort().reverse() : []), [data, league]);
  useEffect(() => {
    if (seasons.length && !seasons.includes(season)) setSeason(seasons[0]);
  }, [seasons, season]);
  useEffect(() => setShown(60), [league, season, deferred, view]);

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = fold(deferred.trim());
    return data.rows
      .filter((r) => r.league === league && (season === "toutes" || r.season === season) && (!needle || r.key.includes(needle)))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }, [data, league, season, deferred]);
  const standings = useMemo(() => (data && season !== "toutes" ? table(data.rows.filter((r) => r.league === league && r.season === season)) : []), [data, league, season]);
  const extra = new Set(album.extraScores.map((e) => `${e.date}|${e.home}|${e.away}`));

  if (error) return <Failure text="Les scores n'ont pas pu être chargés." retry={retry} />;
  if (!data) return <Loading text="Chargement des 22 842 scores…" />;

  return (
    <div className="archive">
      <div className="finder">
        <div className="finder__row">
          <Chips label="Championnat" value={league} onChange={setLeague} options={[["Ligue 1", "Ligue 1"], ["Ligue 2", "Ligue 2"]]} />
          <label className="select">
            <span className="sr">Saison</span>
            <select id="saison" value={season} onChange={(e: Event) => setSeason((e.target as HTMLSelectElement).value)}>
              {seasons.map((s) => (
                <option key={s} value={s}>
                  Saison {s}
                </option>
              ))}
              <option value="toutes">Toutes les saisons</option>
            </select>
          </label>
        </div>
        <div className="finder__row">
          <div className="search search--small">
            <LuSearch aria-hidden="true" />
            <label htmlFor="equipe" className="sr">
              Équipe
            </label>
            <input id="equipe" value={team} onChange={(e: Event) => setTeam((e.target as HTMLInputElement).value)} placeholder="Une équipe : Nantes, Lens…" autoComplete="off" />
          </div>
          {season !== "toutes" ? (
            <Chips label="Affichage" value={view} onChange={setView} options={[["resultats", "Résultats"], ["classement", "Classement"]]} />
          ) : null}
        </div>
      </div>

      {view === "classement" && season !== "toutes" ? (
        <div className="tablewrap">
          <table className="standings">
            <caption>
              {league}, saison {season}. Classement recalculé à partir des {fmt(standings.reduce((n, l) => n + l.p, 0) / 2)} scores : 3 points la victoire, 1 le nul. Les
              pénalités éventuelles ne sont pas comptées.
            </caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Équipe</th>
                <th scope="col">J</th>
                <th scope="col">G</th>
                <th scope="col">N</th>
                <th scope="col">P</th>
                <th scope="col">Buts</th>
                <th scope="col">Diff.</th>
                <th scope="col">Pts</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((l, i) => (
                <tr key={l.team}>
                  <td>{i + 1}</td>
                  <th scope="row">{l.team}</th>
                  <td>{l.p}</td>
                  <td>{l.w}</td>
                  <td>{l.d}</td>
                  <td>{l.l}</td>
                  <td>
                    {l.gf}:{l.ga}
                  </td>
                  <td>{l.gf - l.ga > 0 ? `+${l.gf - l.ga}` : l.gf - l.ga}</td>
                  <td>
                    <strong>{l.pts}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <p className="count">
            {fmt(rows.length)} match{rows.length > 1 ? "s" : ""}
          </p>
          <ul className="results">
            {rows.slice(0, shown).map((m) => (
              <LigueRow key={m.id} m={m} recent={extra.has(`${m.date}|${m.home}|${m.away}`)} />
            ))}
          </ul>
          <More shown={shown} total={rows.length} step={60} onMore={() => setShown((n) => n + 60)} />
        </>
      )}
      <p className="note">Sources : football-data.co.uk jusqu'au 12 octobre 2026 ; football.fr, footballdatabase et mon-match pour les scores du 16 au 18 octobre 2026.</p>
    </div>
  );
}

function LigueRow({ m, recent }: { m: LigueMatch; recent: boolean }) {
  const [open, setOpen] = useState(false);
  const hasStats = m.hs != null || m.hc != null || m.hy != null;
  return (
    <li className={cx("result", open && "result--open")}>
      <button type="button" className="result__main" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="result__date">{shortDate(m.date)}</span>
        <span className="result__home">{m.home}</span>
        <span className="result__score">
          {m.hg}–{m.ag}
        </span>
        <span className="result__away">{m.away}</span>
      </button>
      {open ? (
        <div className="result__more">
          <p>
            {m.league}, saison {m.season}. {m.htg != null ? `Mi-temps : ${m.htg}–${m.atg}.` : "Score à la mi-temps non noté."}
            {recent ? " Score recoupé sur trois sites français." : ""}
          </p>
          {hasStats ? (
            <table className="mini">
              <thead>
                <tr>
                  <th scope="col" />
                  <th scope="col">{m.home}</th>
                  <th scope="col">{m.away}</th>
                </tr>
              </thead>
              <tbody>
                {m.hs != null ? (
                  <tr>
                    <th scope="row">Tirs</th>
                    <td>{m.hs}</td>
                    <td>{m.away_shots}</td>
                  </tr>
                ) : null}
                {m.hst != null ? (
                  <tr>
                    <th scope="row">Tirs cadrés</th>
                    <td>{m.hst}</td>
                    <td>{m.ast}</td>
                  </tr>
                ) : null}
                {m.hc != null ? (
                  <tr>
                    <th scope="row">Corners</th>
                    <td>{m.hc}</td>
                    <td>{m.ac}</td>
                  </tr>
                ) : null}
                {m.hy != null ? (
                  <tr>
                    <th scope="row">Cartons jaunes</th>
                    <td>{m.hy}</td>
                    <td>{m.ay}</td>
                  </tr>
                ) : null}
                {m.hr != null ? (
                  <tr>
                    <th scope="row">Cartons rouges</th>
                    <td>{m.hr}</td>
                    <td>{m.ar}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : (
            <p className="muted">Pas de statistiques de match dans le fichier pour cette rencontre.</p>
          )}
        </div>
      ) : null}
    </li>
  );
}

function Pays() {
  const { data: meta, error, retry } = useLoad(() => loadPaysMeta(), []);
  const [period, setPeriod] = useState(3);
  const { data: rows, error: rowsError } = useLoad(() => (meta ? loadPays(meta.periods[period].file) : Promise.resolve(null)), [meta, period]);
  const [team, setTeam] = useState("");
  const [onlyCup, setOnlyCup] = useState(false);
  const [shown, setShown] = useState(60);
  const deferred = useDeferredValue(team);
  useEffect(() => setShown(60), [period, deferred, onlyCup]);

  const list = useMemo(() => {
    if (!rows) return [];
    const words = fold(deferred.trim()).split(/\s+/).filter(Boolean);
    return rows
      .filter((m) => (!onlyCup || m.worldCup) && words.every((w) => m.key.includes(w) || fold(m.tournamentFr).includes(w)))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }, [rows, deferred, onlyCup]);

  if (error) return <Failure text="Les matchs entre pays n'ont pas pu être chargés." retry={retry} />;
  if (!meta) return <Loading />;
  return (
    <div className="archive">
      <div className="finder">
        <Chips
          label="Période"
          value={String(period)}
          onChange={(v) => setPeriod(Number(v))}
          options={meta.periods.map((p, i) => [String(i), `${p.from}–${p.to}`] as [string, string])}
        />
        <div className="finder__row">
          <div className="search search--small">
            <LuSearch aria-hidden="true" />
            <label htmlFor="pays" className="sr">
              Pays, compétition ou buteur
            </label>
            <input id="pays" value={team} onChange={(e: Event) => setTeam((e.target as HTMLInputElement).value)} placeholder="Pays, buteur ou compétition" autoComplete="off" />
          </div>
          <label className="toggle">
            <input id="coupe-du-monde" type="checkbox" checked={onlyCup} onChange={(e: Event) => setOnlyCup((e.target as HTMLInputElement).checked)} />
            <span>Coupe du monde seulement</span>
          </label>
        </div>
      </div>
      {rowsError ? <Failure text="Cette période n'a pas pu être chargée." /> : null}
      {!rows ? (
        <Loading text="Chargement de la période…" />
      ) : (
        <>
          <p className="count">
            {fmt(list.length)} match{list.length > 1 ? "s" : ""} sur {fmt(meta.periods[period].count)} pour {meta.periods[period].from}–{meta.periods[period].to}
          </p>
          <ul className="results">
            {list.slice(0, shown).map((m) => (
              <PaysRow key={m.id} m={m} />
            ))}
          </ul>
          <More shown={shown} total={list.length} step={60} onMore={() => setShown((n) => n + 60)} />
        </>
      )}
      <p className="note">Source : base publique de Mart Jürisoo (résultats internationaux), à jour au 6 octobre 2026. Les noms de pays sont en français, avec le nom anglais pour la recherche.</p>
    </div>
  );
}

function PaysRow({ m }: { m: PaysMatch }) {
  const [open, setOpen] = useState(false);
  return (
    <li className={cx("result", m.worldCup && "result--cup", open && "result--open")}>
      <button type="button" className="result__main" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="result__date">{shortDate(m.date)}</span>
        <span className="result__home">{m.home}</span>
        <span className="result__score">
          {m.hg}–{m.ag}
        </span>
        <span className="result__away">{m.away}</span>
      </button>
      {open ? (
        <div className="result__more">
          <p>
            <strong>{m.tournamentFr}</strong>
            {m.tournamentFr !== m.tournament ? <span className="muted"> ({m.tournament})</span> : null}
            {m.city ? ` · ${m.city}` : ""}
          </p>
          {m.shootout ? <p>Tirs au but : {m.shootout}.</p> : null}
          {m.scorers ? <p>Buteurs : {m.scorers}</p> : <p className="muted">Buteurs non notés dans le fichier.</p>}
        </div>
      ) : (
        <span className="result__tag">{m.worldCup ? "Coupe du monde" : m.tournamentFr}</span>
      )}
    </li>
  );
}

function Effectifs() {
  const { data, error, retry } = useLoad(() => loadWiki(), []);
  const [club, setClub] = useState<string>("");
  useEffect(() => {
    if (data && !club) setClub(data.squads[0]?.id ?? "");
  }, [data, club]);
  if (error) return <Failure text="Les effectifs n'ont pas pu être chargés." retry={retry} />;
  if (!data) return <Loading />;
  const squad = data.squads.find((s) => s.id === club);
  const base = squad ? data.players.filter((p) => fold(p.club) === fold(squad.name)) : [];
  return (
    <div className="archive">
      <p className="note">
        La première base de l'album : {fmt(data.players.length)} joueurs de Ligue 1 et de Ligue 2 relevés sur Wikipédia en septembre 2026, club par club, avec la date.
        Les effectifs du 19 octobre 2026 sont dans la page <Link to={{ page: "saison" }}>Saison</Link>.
      </p>
      <label className="select select--wide">
        <span className="sr">Club</span>
        <select id="club-wiki" value={club} onChange={(e: Event) => setClub((e.target as HTMLSelectElement).value)}>
          {data.squads.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.league})
            </option>
          ))}
        </select>
      </label>
      {squad ? (
        <div className="tablewrap">
          <table className="standings standings--squad">
            <caption>
              {squad.name}, {squad.league}. Effectif Wikipédia au {squad.asOf} (page {squad.wiki.replace(/_/g, " ")}).
            </caption>
            <thead>
              <tr>
                <th scope="col">N°</th>
                <th scope="col">Joueur</th>
                <th scope="col">Poste</th>
                <th scope="col">Pays</th>
              </tr>
            </thead>
            <tbody>
              {squad.players.map((p, i) => {
                const row = base.find((b) => b.name === p.name);
                return (
                  <tr key={`${p.name}-${i}`}>
                    <td>{p.number || "–"}</td>
                    <th scope="row">
                      {row?.portrait ? <img className="mini-portrait" src={`img${row.portrait}`} alt="" /> : null}
                      {p.name}
                    </th>
                    <td>{row?.pos ?? p.pos}</td>
                    <td>{p.code}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <WikiExtra rows={base.filter((b) => !squad.players.some((p) => p.name === b.name))} />
        </div>
      ) : null}
    </div>
  );
}

function WikiExtra({ rows }: { rows: { name: string; number: string | null; pos: string; code: string; as_of: string | null; source: string }[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="sheet">
      <p className="eyebrow">Aussi dans la base de l'album pour ce club</p>
      <ul className="list">
        {rows.map((r) => (
          <li key={r.name}>
            {r.name} · {r.pos} · {r.code}
            {r.number ? ` · n° ${r.number}` : ""} · {r.source}
            {r.as_of ? `, ${r.as_of}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
