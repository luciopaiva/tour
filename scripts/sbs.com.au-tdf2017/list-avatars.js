
const
    fs = require("fs");

const stages = JSON.parse(fs.readFileSync("tdf2017.json", "utf-8"));
const avatarSrcByRiderNumber = new Map();

for (const stage of stages) {
    for (const rider of stage.riders) {
        const src = rider.avatar;
        const number = parseInt(src.match(/_TDF_2017_RIDER_(\d+)\.jpg/)[1], 10);
        avatarSrcByRiderNumber.set(number, src);
    }
}

const sortedAvatars = Array.from(avatarSrcByRiderNumber.entries()).sort((a, b) => {
    return a[0] - b[0];
});



for (const rider of sortedAvatars) {
    console.info(rider[1]);
}

console.info("\nTotal: " + avatarSrcByRiderNumber.size);

fs.writeFileSync("avatars.json", JSON.stringify(sortedAvatars, null, "  "), "utf-8");
