/**
 * Reads all stage info from `/stages` and merges it into a single file.
 * Information was retrieved from https://www.sbs.com.au/cyclingcentral/tdf2017
 */
const
    fs = require("fs");

const stages = [];

for (let i = 1; i <= 21; i++) {
    stages.push(JSON.parse(fs.readFileSync(`stages/stage-${i}.json`, "utf-8")));
}

fs.writeFileSync("tdf2017.json", JSON.stringify(stages, null, "  "), "utf-8");
