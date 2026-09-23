# National League (Hockey) — TRMNL plugin

A TRMNL plugin for Swiss National League hockey. Pick one of the 14 clubs and
you get its logo, its position in the standings, the score of the last game, and
when and who it plays next.

I built this because I wanted my LHC scores on my TRMNL, and there was no plugin
for it. Works in French, German, Italian and English.

## Data

Everything comes from `https://www.nationalleague.ch/api/games`. It returns the
whole NL season as JSON.

There is no public endpoint for the standings, so I compute them from the
finished games.

## Files

| File | Where it goes |
| --- | --- |
| `trmnl-national-league.zip` | Import this in TRMNL (settings + the 4 layouts) |
| `serverless.js` | Serverless tab, language set to **Node** |
| `settings.yml` | Plugin settings, form fields included |
| `custom_fields.yml` | Just the Custom Fields block if you paste it by hand |
| `author_bio.yml` | Just the author_bio field |
| `*.liquid` | One file per layout tab |

The zip only contains what the TRMNL importer accepts. You paste
`serverless.js` separately.

## Setup

1. Plugins → Private Plugin → New, then import the zip.
2. Edit Markup → Serverless tab → set the language to **Node** → paste
   `serverless.js`.
3. Pick your team and your language in the form.
4. Force Refresh. Turn on Debug Logs while you set things up, it's the only
   place Node errors show up.

## Things that took me a while

**The polling URL is fetched before the serverless function runs.** I first
wrote the fetch inside `run()` and pointed the polling URL at a dummy endpoint,
because the games list is way over the 100 KB limit for external responses. That
was backwards. The serverless function exists exactly so you can handle a big
payload: TRMNL fetches the URL, then hands you the result. So `run()` does no
network call at all and the 5 second limit is never a problem.

**TRMNL's Node VM runs small-icu.** `Intl.DateTimeFormat("fr-CH")` silently
falls back to English. I got `Sat, 09/19` on a French display and spent a while
wondering why. Day and month names now come from my own tables, and `Intl` is
only used to convert to the right timezone, which does work.

**The standings sort.** I first sorted by points per game and my table didn't
match the official one. NL sorts by points first, and only uses games played to
break ties. I checked the comparator against the official table after round 3
and all 14 positions match now. I don't do head-to-head, so two teams that are
perfectly level can end up one rank apart from the official site.

**The logo field isn't documented.** `logoFrom()` just looks for any key
containing `logo` on the home/away side and takes the first URL it finds. Works
for every team I tested. There's also a Logo URL field in the form if you want
to override it, and if nothing is found the plugin shows the team code instead.

## Languages

All the strings are in `STRINGS` at the top of `serverless.js`, and the club
names in `TEAMS`. The Liquid files have no hardcoded text, so there's only one
file to edit if a translation is wrong.

The Language field has an Automatic option that follows `trmnl.user.locale` and
falls back to French. The timezone comes from the account too
(`trmnl.user.time_zone_iana`), so if you follow your club from abroad the puck
drop time is shown where you are, not in Zurich.

Club names follow the language: SC Bern / CP Berne, EHC Biel / HC Bienne,
EV Zug / EV Zoug / EV Zugo, Fribourg / Freiburg / Friburgo. Same for ranks
(`2e`, `2.`, `2°`, `2nd`) and overtime (`ap` / `n.V.` / `dts` / `OT`).

## Points

Win 3, overtime or shootout win 2, overtime or shootout loss 1, loss 0.
Friendlies and foreign opponents are filtered out, and the season starts on
July 1st.

## TRMNL X

X is 1040×780, and portrait swaps that. The half views end up with very
different proportions:

| View | OG landscape | X landscape | X portrait |
| --- | --- | --- | --- |
| half_horizontal | 760×210 | 992×354 | 732×484 |
| half_vertical | 370×440 | 484×732 | 354×992 |

In half_horizontal the standings column is `lg:flex lg:portrait:hidden`, so it
only shows in X landscape. In portrait four columns would be 183px each, which
is unreadable, so I use the extra height for a wins/losses/diff grid, the result
spelled out, and the arena instead.

In half_vertical the standings show on X in both orientations, with full club
names in landscape and team codes in portrait, where the games played column is
dropped.

## Notes

Every install hits nationalleague.ch once an hour for the full games list. If
this plugin gets popular I should put a small cache in front (Cloudflare Worker
or similar) — the polling URL would become something like
`https://my-worker.dev/?team={{ team }}` and the serverless function would have
almost nothing left to do.

Not affiliated with the National League or Swiss Ice Hockey.

If something is broken or a translation is off, open an issue.
