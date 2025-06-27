# scoreboard_vgbootcampy
A VGBC-style scoreboard overlay built for TournamentStreamHelper for educational purposes. Made as a practice to learn how to use JavaScript, HTML, and CSS.

![Preview Image](/index_preview.png)

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

## How to set up the player cams in OBS
1. Create a new scene.
2. In this new scene, add CameraBorders.png as an Image. We will use this as a guide to adjust the size the player cams.
3. Add Video Capture Device for a player.
4. Adjust the size of the Video Capture Device so it covers the area within one of the borders.
5. Repeat steps 3-4 for the other player.
6. Right click on the scene and select Filters.
7. Click on + and then select Image Mask/Blend.
8. For the Path, click on Browse and select CameraMask.png.
9. Click Close. The CameraMask.png should now be applied to the scene.
10. Go to the scene where you have the scoreboard overlay. Create one if you do not have one.
11. In this scene where you have the scoreboard overlay, add CameraBorders.png as an Image.
12. Add the scene where you set up the player cams to this scene where you have the scoreboard overlay and move it behind the CameraBorders.png. You should now have the player cams within the borders!

## Recommendation
It might be good to change line 286 in the FitText method in /layout/include/global.js from this:
```js
textElement.css("transform", "scaleX(" + scaleX + ")");
```
to this:
```js
textElement.css("transform", "scale(" + scaleX + ")");
```
so that the texts do not appear to be squished horizontally when they are really long.
