// How long it takes to update the information, in milliseconds. 10000 milliseconds = 10 seconds.
const ROTATION_INTERVAL = 10000;

const overlayState = {
  infoModesIndex: 0, // At what index of infoModes list we are at
  playerModesIndex: 0, // At what index of playerModes list we are at
  firstTime: true, // Whether we are updating for the first time
  intervalID: "", // Interval ID for the interval used to go to the next info/player mode after every few seconds
  savedInfoHash: "",
  validInfoModes: [], // Info modes that have content to display

  infoModes: ["phase"],
  playerModes: ["twitter", "pronoun"]
}

function getInfoModesFieldMap(score) {
  return {
    "phase": score.phase,
    "match": score.match,
    "best_of_text": score.best_of_text,
    "tournament_name": overlayState.data.tournamentInfo.tournamentName,
  };
}

function getPlayerFieldMap(player) {
  return {
    "seed": player.seed
      ? `SEED ${player.seed}`
      : "",
    "twitter": player.twitter
      ? `<span class="twitter_logo"></span>@${player.twitter}`
      : "",
    "pronoun": player.pronoun
      ? player.pronoun
      : "",
  };
}

LoadEverything().then(() => {
  Update = async (event) => {
    const { data: newData } = event;
    overlayState.data = newData;
  
    const score = overlayState.data.score[window.scoreboardNumber];
    SetInnerHtml($(".best_of"), score.best_of_text);
    SetInnerHtml($(".match"), score.match);

    const team1 = score.team["1"];
    const team2 = score.team["2"];
    overlayState.team1Losers = team1.losers;
    overlayState.team2Losers = team2.losers;
    overlayState.bothLosers = overlayState.team1Losers && overlayState.team2Losers;
    overlayState.neitherLoser = !overlayState.team1Losers && !overlayState.team2Losers;
  
    // === Store winners ===
    if (!overlayState.bothLosers && !overlayState.neitherLoser) {
      if (Object.keys(team1.player).length === 1) {
        const winnerPlayer = !overlayState.team1Losers ? team1.player["1"] : team2.player["1"];
        if (winnerPlayer?.name) {
          localStorage.setItem("playerInWinners", JSON.stringify({ name: winnerPlayer.name }));
        }
      } else {
        const winnerTeamObj = !overlayState.team1Losers ? team1 : team2;
        const playerNames = Object.values(winnerTeamObj.player).map(p => p.name).filter(Boolean);
        const fallbackName = winnerTeamObj.teamName || playerNames.join(" / ");
        if (fallbackName) {
          localStorage.setItem("teamNameInWinners", fallbackName);
        }
      }
    }
  
    // === Update UI elements: name, score, flag, color ===
    forEachTeamPlayer(newData, async (team, t, player) => {
      const playerCount = Object.keys(team.player).length;
  
      if (playerCount === 1) {
        await DisplayEntityName(t, player);
      } else {
        const names = await Promise.all(Object.values(team.player).map(p => Transcript(p.name)));
        const teamName = team.teamName || names.join(" / ");
        await DisplayEntityName(t, teamName, true);
      }
  
      SetInnerHtml($(`.p${t + 1} .score`), String(team.score ?? 0));
  
      if (team.color) {
        document.documentElement.style.setProperty(`--p${t + 1}-score-bg-color`, team.color);
        UpdateColor(t);
      }
  
      const flagContainer = $(`.p${t + 1}.container .flagcountry`);
      const showFlag = player.country && player.country.asset && playerCount === 1;
      const flagHtml = showFlag
        ? `<div class='flag' style="background-image: url('https://gepi.global-e.com/content/images/flags/${player.country.code.toLowerCase()}.png')"></div>`
        : "";
      SetInnerHtml(flagContainer, flagHtml);

      if (showFlag) {
        changeStylesheetRule(`.p${t + 1} .name_container`, "padding", "0 8px");
      } else {
        changeStylesheetRule(`.p${t + 1} .name_container`, "padding", "0 10px");
      }
    });
  
    // === Twitter display hash tracking ===
    const team1Player = team1.player["1"] || {};
    const team2Player = team2.player["1"] || {};
    const player1Fields = getPlayerFieldMap(team1Player);
    const player2Fields = getPlayerFieldMap(team2Player);
  
    const allTwitterHashes = overlayState.playerModes.map(mode =>
      [player1Fields[mode], player2Fields[mode]].join("||")
    ).join("###");
  
    const previousAllTwitter = overlayState.lastTotalTwitterHash ?? "";
    const anyTwitterChanged = allTwitterHashes !== previousAllTwitter;
  
    overlayState.lastTotalTwitterHash = allTwitterHashes;
  
    // === Info display rotation tracking ===
    const infoMap = getInfoModesFieldMap(score);
    const newValidInfoModes = overlayState.infoModes.filter(mode => infoMap[mode]);
  
    const currentDisplayedMode = overlayState.validInfoModes?.[overlayState.infoModesIndex % overlayState.validInfoModes.length] ?? null;
    if (!newValidInfoModes.includes(currentDisplayedMode)) {
      const currentIndexInAll = overlayState.infoModes.indexOf(currentDisplayedMode ?? "");
      const fallbackMode = newValidInfoModes.find(mode =>
        overlayState.infoModes.indexOf(mode) > currentIndexInAll
      ) || newValidInfoModes[0];
  
      overlayState.infoModesIndex = newValidInfoModes.indexOf(fallbackMode);
    } else {
      overlayState.infoModesIndex = newValidInfoModes.indexOf(currentDisplayedMode);
    }
  
    overlayState.validInfoModes = newValidInfoModes;

    // === Immediate visual updates ===
    await window.UpdateTwitter(); // solo/team visibility + twitter/pronoun text
    await window.UpdateInfo();   // info mode visibility + text
  
    const { content: currentInfoValue } = getInfoContent(score);
    const allInfoValuesHash = newValidInfoModes.map(mode => infoMap[mode] ?? "").join("||");
  
    const previousInfoHash = overlayState.savedInfoHash ?? "";
    const anyInfoChanged = allInfoValuesHash !== previousInfoHash;
  
    overlayState.lastDisplayedInfoValue = currentInfoValue;
    overlayState.savedInfoHash = allInfoValuesHash;
  
    const anyChange = anyTwitterChanged || anyInfoChanged;
  
    if (anyChange) {
      window.resetIntervals();
    }
  
    // === Initial animation ===
    if (overlayState.firstTime) {
      const team1PlayerCount = Object.keys(team1.player).length;
      const team2PlayerCount = Object.keys(team2.player).length;
      const isTeam1Solo = team1PlayerCount === 1;
      const isTeam2Solo = team2PlayerCount === 1;
  
      const hasPlayer1Info = overlayState.playerModes.some(mode => player1Fields[mode]);
      const hasPlayer2Info = overlayState.playerModes.some(mode => player2Fields[mode]);
  
      const p1Container = document.querySelector(".p1.twitter_container");
      const p2Container = document.querySelector(".p2.twitter_container");
  
      p1Container.style.opacity = (hasPlayer1Info && isTeam1Solo) ? "1" : "0";
      p2Container.style.opacity = (hasPlayer2Info && isTeam2Solo) ? "1" : "0";
  
      const startingAnimation = gsap.timeline({ paused: false })
        .from([".logo"], { duration: 0.5, autoAlpha: 0, ease: "power2.inOut" })
        .from([".anim_container_outer"], { duration: 1, width: "338px", ease: "power2.inOut" });
  
      if (hasPlayer1Info && isTeam1Solo) {
        startingAnimation.from([".p1.twitter_container"], {
          duration: 1,
          opacity: 0,
          x: "-373px",
          ease: "power2.inOut"
        }, "<");
      }
  
      if (hasPlayer2Info && isTeam2Solo) {
        startingAnimation.from([".p2.twitter_container"], {
          duration: 1,
          opacity: 0,
          x: "373px",
          ease: "power2.inOut"
        }, "<");
      }
  
      if (newValidInfoModes.length > 0) {
        startingAnimation.from(".tournament_container", {
          opacity: 0,
          duration: 0.5,
          ease: "power4.Out"
        });
      }
  
      window.resetIntervals();
      overlayState.firstTime = false;
    }
  };   
});

function getInfoContent(score) {
  const infoMap = getInfoModesFieldMap(score);
  const validInfoModes = overlayState.validInfoModes || [];

  if (validInfoModes.length === 0) return { content: "", modeUsed: null };

  const safeIndex = overlayState.infoModesIndex % validInfoModes.length;
  const selectedMode = validInfoModes[safeIndex];
  const selectedContent = infoMap[selectedMode];

  return { content: selectedContent, modeUsed: selectedMode };
}

const setName = async (selector, team, name) => {
  SetInnerHtml($(selector), `
    <span>
      <span class="sponsor">${team ? team.replace(/\s*[\|\/\\]\s*/g, ' ') : ""}</span>
      ${name ? await Transcript(name) : ""}
    </span>
  `);
};

function forEachTeamPlayer(data, callback) {
  ["1", "2"].forEach((num, t) => {
    const team = data.score[window.scoreboardNumber].team[num];
    Object.values(team.player).forEach((player, p) => {
      if (player) callback(team, t, player, p);
    });
  });
}

const toggleVisibility = (el, visible) => {
  if (!el) return;

  if (overlayState.firstTime) {
    if (!visible) el.style.opacity = "0";
    return;
  }

  gsap.to(el, {
    duration: 0.5,
    opacity: visible ? 1 : 0,
    ease: "power2.out"
  });
};

const formatPlayerOverlayContent = (player) => {
  const player1 = overlayState.data.score[window.scoreboardNumber].team["1"].player["1"];
  const player2 = overlayState.data.score[window.scoreboardNumber].team["2"].player["1"];
  const allModes = overlayState.playerModes;

  const validModes = allModes.filter(mode => {
    const f1 = getPlayerFieldMap(player1)[mode];
    const f2 = getPlayerFieldMap(player2)[mode];
    return !!f1 || !!f2;
  });

  if (validModes.length === 0) return { content: "", modeUsed: null };

  const playerFields = getPlayerFieldMap(player);
  const modeIndex = overlayState.playerModesIndex % validModes.length;

  // ⬅️ Loop backward from current modeIndex to 0
  for (let i = modeIndex; i >= 0; i--) {
    const mode = validModes[i];
    if (playerFields[mode]) {
      return { content: playerFields[mode], modeUsed: mode };
    }
  }

  // 🔁 If nothing was found, try looping from end back to modeIndex+1
  for (let i = validModes.length - 1; i > modeIndex; i--) {
    const mode = validModes[i];
    if (playerFields[mode]) {
      return { content: playerFields[mode], modeUsed: mode };
    }
  }

  return { content: "", modeUsed: null };
};

const compareObjects = (obj1, obj2) => {
  const keys = Object.keys(obj1).sort();
  for (const key of keys) {
    if (["character", "mains", "id", "mergedName", "mergedOnlyName", "seed", ""].includes(key)) continue;
    if (!(key in obj2)) return false;
    const val1 = obj1[key], val2 = obj2[key];
    if (typeof val1 === 'object' && val1 && val2) {
      if (!compareObjects(val1, val2)) return false;
    } else if (val1 !== val2) return false;
  }
  return true;
};

Start = async () => {
  console.log("window.Start() was called");
  startingAnimation.restart();
  window.resetIntervals();
};

function getAvailableDisplayModes(player1, player2, allModes) {
  return allModes.filter(mode => {
    const f1 = getPlayerFieldMap(player1)[mode];
    const f2 = getPlayerFieldMap(player2)[mode];
    return f1 || f2;
  });
}

window.UpdateInfo = async () => {
  const score = overlayState.data.score[window.scoreboardNumber];
  const infoMap = getInfoModesFieldMap(score);

  const container = document.querySelector(".tournament_container");

  // Check: is there content in *any* of the display modes?
  const hasAnyInfoContent = overlayState.infoModes.some(
    mode => !!infoMap[mode]
  );

  // Get the currently selected content for display
  const { content: infoText } = getInfoContent(score);

  // Set text (can be blank)
  SetInnerHtml($(".info"), infoText);

  // ✅ Fade in/out based on whether *any* info is present
  toggleVisibility(container, hasAnyInfoContent);
};

const lastPlayerContent = {};

window.UpdateTwitter = async () => {
  forEachTeamPlayer(overlayState.data, (team, t, player) => {
    const twitterContainer = document.querySelector(`.p${t + 1}.twitter_container`);
    const contentEl = $(`.p${t + 1} .twitter`);
    const isSolo = Object.keys(team.player).length === 1;
    const playerFields = getPlayerFieldMap(player);
    const hasAnyDisplayInfo = overlayState.playerModes.some(mode => !!playerFields[mode]);
    const visible = isSolo && hasAnyDisplayInfo;

    const { content } = formatPlayerOverlayContent(player);
    const playerKey = player.name ?? `team${t}_player`;

    if (content) {
      lastPlayerContent[playerKey] = content;
      SetInnerHtml(contentEl, content);
    } else {
      SetInnerHtml(contentEl, "");
    }

    // ✅ Fade in if solo w/ info, fade out otherwise
    toggleVisibility(twitterContainer, visible);
  });
};

window.resetIntervals = () => {
  clearInterval(overlayState.intervalID);

  const rotate = () => {
    const score = overlayState.data.score[window.scoreboardNumber];

    const player1 = score.team["1"].player["1"];
    const player2 = score.team["2"].player["1"];

    // Rotate player modes
    const validPlayerModes = overlayState.playerModes.filter(mode => {
      const p1Field = getPlayerFieldMap(player1)[mode];
      const p2Field = getPlayerFieldMap(player2)[mode];
      return !!p1Field || !!p2Field;
    });

    if (validPlayerModes.length > 1) {
      overlayState.playerModesIndex = (overlayState.playerModesIndex + 1) % validPlayerModes.length;
    }

    // Rotate info modes (only if >1 valid)
    if (overlayState.validInfoModes.length > 1) {
      overlayState.infoModesIndex = (overlayState.infoModesIndex + 1) % overlayState.validInfoModes.length;
    }

    window.UpdateTwitter();
    window.UpdateInfo();
  };

  overlayState.intervalID = setInterval(rotate, ROTATION_INTERVAL);
};

const DisplayEntityName = async (t, nameOrPlayer, isTeam = false) => {
  const selector = `.p${t + 1}.container .name`;
  const bothLosers = overlayState.bothLosers;
  const neitherLoser = overlayState.neitherLoser;

  if (isTeam) {
    const teamName = nameOrPlayer;
  
    const normalizeTeamName = (name) =>
      name?.toLowerCase().replace(/\s*[\|\/\\]\s*/g, ' ').trim();
  
    const storedRaw = localStorage.getItem("teamNameInWinners") || "";
    const teamNameInWinners = normalizeTeamName(storedRaw);
    const normalizedCurrentName = normalizeTeamName(teamName);
  
    console.log("Comparing team names:", {
      storedRaw,
      displayedRaw: teamName,
      storedNormalized: teamNameInWinners,
      displayedNormalized: normalizedCurrentName,
    });
  
    const getSuffix = (normalizedCurrent, losers) => {
      if (bothLosers) {
        return teamNameInWinners === normalizedCurrent ? "WL" : "L";
      } else if (neitherLoser) {
        return "";
      } else {
        return losers ? "L" : "W";
      }
    };
    const suffix = getSuffix(normalizedCurrentName, t === 0 ? overlayState.team1Losers : overlayState.team2Losers);
    SetInnerHtml($(selector), `<span>${teamName}</span>`);
    SetInnerHtml($(`.p${t + 1} .losers`), suffix);
  } else {
    const player = nameOrPlayer;
    const playerInWinners = JSON.parse(localStorage.getItem("playerInWinners") || "{}");

    const getSuffix = (p, losers) => {
      if (bothLosers) {
        return playerInWinners.name?.toLowerCase() === p.name?.toLowerCase() ? "WL" : "L";
      } else if (neitherLoser) {
        return "";
      } else {
        return losers ? "L" : "W";
      }
    };

    await setName(selector, player.team, player.name);

    SetInnerHtml($(`.p${t + 1} .losers`), getSuffix(player, t === 0 ? overlayState.team1Losers : overlayState.team2Losers));
  }
};

function changeStylesheetRule(selector, property, value) {
  let stylesheet = document.styleSheets[1];
  // Make the strings lowercase
  selector = selector.toLowerCase();
  property = property.toLowerCase();
  value = value.toLowerCase();

  // Change it if it exists
  for (var i = 0; i < stylesheet.cssRules.length; i++) {
    var rule = stylesheet.cssRules[i];
    if (rule.selectorText === selector) {
      rule.style[property] = value;
      return;
    }
  }

  // Add it if it does not
  stylesheet.insertRule(selector + " { " + property + ": " + value + "; }", 0);
}

async function UpdateColor(t) {

  var divs = document.getElementsByClassName(`p${t + 1} container`);
  var div = divs[0];

  var score_container_element = div.querySelector(".score_container");
  var score_element = score_container_element.querySelector(".score");

  // Get the background color of the div
  var color = window
    .getComputedStyle(score_container_element, null)
    .getPropertyValue("background-color");

  var components = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);

  if (components) {
    // Extract the individual RGB components
    var red = parseInt(components[1]);
    var green = parseInt(components[2]);
    var blue = parseInt(components[3]);

    // Display the color
    console.log("The background color of the div is: " + color);
    console.log("Red: " + red);
    console.log("Green: " + green);
    console.log("Blue: " + blue);

    var intensity = red * 0.299 + green * 0.587 + blue * 0.114;
    console.log("The intensity is: " + intensity);

    if (intensity > 142) {
      console.log("Word should be black");

      changeStylesheetRule(
        `.p${t + 1} .score`,
        "color",
        "var(--bg-color)"
      );

      changeStylesheetRule(
        `.p${t + 1} .twitter`,
        "color",
        "var(--bg-color)"
      );

      changeStylesheetRule(
        `.p${t + 1} .twitter_logo`,
        "background",
        "var(--bg-color)"
      );

    } else {

      changeStylesheetRule(
        `.p${t + 1} .score`,
        "color",
        "var(--text-color)"
      );

      changeStylesheetRule(
        `.p${t + 1} .twitter`,
        "color",
        "var(--text-color)"
      );

      changeStylesheetRule(
        `.p${t + 1} .twitter_logo`,
        "background",
        "var(--text-color)"
      );

    } 
  }
}