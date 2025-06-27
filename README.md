# scoreboard_vgbootcampy

## How to change the rotation interval (time it takes to show the next info)

Edit the ROTATION_INTERVAL. If you want to change it to 5000 milliseconds (5 seconds), do this:

```js
const ROTATION_INTERVAL = 5000;
```

## How to add new mode to the tournament container on the top left:

1. Add a new mode to infoModes. We will add a mode called "startgg" as an example:

```js
infoModes: ["startgg", "phase"];
```

2. Add what that mode will show in the getInfoModesFieldMap function right below.

```js
function getInfoModesFieldMap(score) {
  return {
    "startgg": "START.GG/LINK",
    "phase": score.phase,
    "match": score.match,
    "best_of_text": score.best_of_text,
    "tournament_name": overlayState.data.tournamentInfo.tournamentName,
  };
}
```

## How to add new mode to the Twitter/pronoun container of the players:

1. Add a new mode to playerModes. We will add a mode called "seed" as an example:

```js
playerModes: ["seed", "twitter", "pronoun"];
```

2. Add what the mode will show in getPlayerFieldMap right below.

```js
function getPlayerFieldMap(player) {
  return {
    "seed": player.seed
      ? `SEED ${player.seed}`
      : "",
    "twitter": player.twitter
      ? `<span class="twitter_logo"></span>@${player.twitter}`
      : "",
    "pronoun": player.pronoun ? player.pronoun.toUpperCase() : "",
  };
}
```
