
const
    fs = require("fs");

const stages = JSON.parse(fs.readFileSync("tdf2017.json", "utf-8"));
const riders = new Set();

for (const stage of stages) {
    for (const rider of stage.riders) {
        riders.add(rider.name);
    }
}

for (const rider of Array.from(riders).sort()) {
    console.info(rider);
}

console.info("\nTotal: " + riders.size);
