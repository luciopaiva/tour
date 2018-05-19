/**
 * Witchcraft script to collect data about TdF 2017's stage results.
 * Witchcraft: https://github.com/luciopaiva/witchcraft
 *
 * To download, load each page and wait for the save file dialog to appear. Pages:
 *
 * https://www.sbs.com.au/cyclingcentral/tdf2017/stage/1/standings
 * https://www.sbs.com.au/cyclingcentral/tdf2017/stage/2/standings
 * https://www.sbs.com.au/cyclingcentral/tdf2017/stage/3/standings
 * ...
 * https://www.sbs.com.au/cyclingcentral/tdf2017/stage/21/standings
 *
 */
window.addEventListener("DOMContentLoaded", () => {

    function getText(base, query) {
        const elem = base.querySelector(query);
        if (elem) {
            const text = elem.innerText;
            if (text) {
                return text.trim();
            }
        }
        return "";
    }

    function getAttr(base, query, attrName) {
        const elem = base.querySelector(query);
        if (elem) {
            return elem.getAttribute(attrName);
        }
        return "";
    }

    function getMultipleAttrFromMultipleElements(base, query, ...attrNames) {
        const elems = Array.from(base.querySelectorAll(query));
        if (elems && elems.length > 0) {
            return elems.map(imgElement => {
                return attrNames.map(attrName => imgElement.getAttribute(attrName));
            });
        }
        return [];
    }

    const stage = {
        index: getText(document, '#stageSelect *[selected="selected"]'),
        description: getText(document, ".stage_navigation_name"),
        type: getText(document, ".stage_type_pln"),
        date: getText(document, ".stage_date"),
        riders: []
    };

    if (!stage.index || stage.index.length === 0) {
        return;
    }

    let trs = document.querySelectorAll(".views-table tr");
    trs = Array.from(trs).slice(1);  // skip header

    if (trs.length === 0) {
        return;
    }

    for (const tr of trs) {
        const position = getText(tr, ".views-field-position");
        const name = getText(tr, ".rider_name");
        const team = getText(tr, ".rider_team");
        const avatar = getAttr(tr, ".rider_image img", "src");
        const flag = getAttr(tr, ".views-field-rider-nationality img", "src");
        const country = getText(tr, ".views-field-rider-nationality");
        const fieldTime = getText(tr, ".views-field-time");
        const fieldGap = getText(tr, ".views-field-gap");
        const jerseys = getMultipleAttrFromMultipleElements(tr, ".views-holding-jersey img", "src", "alt")
            .map(result => { return { imgSrc: result[0], description: result[1] }});

        const rider = {
            position,
            name,
            team,
            avatar,
            flag,
            country,
            fieldTime,
            fieldGap,
            jerseys
        };

        stage.riders.push(rider);
    }

    // generate link and click it to open save file dialog
    const blob = new Blob([JSON.stringify(stage, null, "  ")], { type: "text/plain"});
    const anchor = document.createElement("a");
    const stageNumber = parseInt(stage.index.replace(/\D+/, ""));
    anchor.download = `stage-${stageNumber}.json`;
    anchor.href = window.URL.createObjectURL(blob);
    anchor.dataset.downloadurl = ["text/plain", anchor.download, anchor.href].join(":");
    anchor.click();
});
