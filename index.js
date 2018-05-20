
class Tour {

    /**
     * @param {Stage[]} stages
     */
    constructor (stages) {
        this.ORIGINAL_AVATAR_SIZE_IN_PIXELS = parseInt(getComputedStyle(document.body).getPropertyValue("--avatar-size"), 10);
        this.AVATAR_SCALE_FACTOR = parseFloat(getComputedStyle(document.body).getPropertyValue("--avatar-scale"));
        this.VISIBLE_RIDERS = parseInt(getComputedStyle(document.body).getPropertyValue("--visible-riders"), 10);

        this.stages = stages;
        this.currentStageIndex = 0;
        this.processStages();

        this.chart = Tour.bind(".chart");
        this.chartWidth = this.chart.clientWidth;
        this.chartHeight = this.chart.clientHeight;
        this.stageTitle = Tour.bind(".stage-title");
        this.stageDate = Tour.bind(".stage-date");
        this.cardTemplate = Tour.bind(".rider.template");

        this.updateStage();

        document.addEventListener("keydown", this.onKeyDown.bind(this));
    }

    updateStage() {
        this.chart.innerHTML = "";

        const stage = this.stages[this.currentStageIndex];
        const selectedRiders = stage.riders.slice(0, this.VISIBLE_RIDERS);
        Tour.setText(this.stageTitle, `${stage.index}: ${stage.description}`);
        Tour.setText(this.stageDate, stage.date);

        const minTop = 0;
        const maxTop = Math.round(this.chartHeight - this.ORIGINAL_AVATAR_SIZE_IN_PIXELS * this.AVATAR_SCALE_FACTOR);
        const horizontalSlack = 50;
        const minLeft = horizontalSlack;
        const maxLeft = Math.round(this.chartWidth - this.ORIGINAL_AVATAR_SIZE_IN_PIXELS * this.AVATAR_SCALE_FACTOR) - horizontalSlack;

        const firstFieldTime = selectedRiders[0].accumulatedTimeInSeconds;
        const lastFieldTime = selectedRiders[selectedRiders.length - 1].accumulatedTimeInSeconds;

        selectedRiders.reverse().forEach((rider) => {
            const time = rider.accumulatedTimeInSeconds;
            const screenPositionRatio = (lastFieldTime - time) / (lastFieldTime - firstFieldTime);
            const left = Math.round(minLeft + screenPositionRatio * (maxLeft - minLeft));
            const top = Math.round((maxTop - minTop) / 2);
            this.showRiderCard(rider, left, top);
        });
    }

    static fieldTimeToSeconds(fieldTime) {
        const [, hours, minutes, seconds] = fieldTime.match(/(\d\d):(\d\d):(\d\d)/);
        return parseInt(seconds, 10) + parseInt(minutes, 10) * 60 + parseInt(hours, 10) * 3600;
    }

    /**
     * @param {Rider} rider
     * @param {Number} left
     * @param {Number} top
     */
    showRiderCard(rider, left, top) {
        const card = this.cardTemplate.cloneNode(true);
        card.classList.remove("template");
        card.style.left = left + "px";
        card.style.top = top + "px";

        const avatar = card.querySelector(".avatar");

        avatar.setAttribute("title", rider.name);

        const riderSummary = this.riderByName.get(rider.name);

        const tileCount = this.greatestRiderIndex;
        const tileSize = this.ORIGINAL_AVATAR_SIZE_IN_PIXELS * this.AVATAR_SCALE_FACTOR;
        const imageWidth = Math.round(tileCount * tileSize);
        const imageHeight = Math.round(tileSize);
        avatar.style.backgroundSize = `${imageWidth}px ${imageHeight}px`;
        const backgroundLeft = Math.round(tileSize * riderSummary.index);
        avatar.style.backgroundPosition = `-${backgroundLeft}px 0`;

        rider.jerseys.forEach((jersey, index) => {
            const jerseyIndex = index + 1;
            const jerseyType = jersey.description.replace(/\s+.*$/, "").toLowerCase();

            const jerseyElement = document.createElement("div");
            jerseyElement.classList.add("jersey", jerseyType + "-jersey", "jersey-" + jerseyIndex);
            card.appendChild(jerseyElement);
        });

        this.chart.appendChild(card);
    }

    onKeyDown(event) {
        switch (event.key) {
            case "ArrowRight":
                this.currentStageIndex = Math.min(this.currentStageIndex + 1, this.stages.length - 1);
                this.updateStage();
                break;
            case "ArrowLeft":
                this.currentStageIndex = Math.max(this.currentStageIndex - 1, 0);
                this.updateStage();
                break;
        }
    }

    processStages() {
        /** @type {Map<String, RiderSummary>} */
        this.riderByName = new Map();
        /** @type {Number} */
        this.greatestRiderIndex = 0;

        for (const stage of this.stages) {
            for (const rider of stage.riders) {
                if (!this.riderByName.has(rider.name)) {
                    const riderIndex = parseInt(rider.avatar.match(/_TDF_2017_RIDER_(\d+).jpg/)[1], 10) - 1;

                    this.riderByName.set(rider.name, /** @type {RiderSummary} */ {
                        name: rider.name,
                        team: rider.team,
                        index: riderIndex,
                        flag: rider.flag,
                        country: rider.country,
                        accumulatedTimeInSeconds: 0
                    });

                    if (riderIndex > this.greatestRiderIndex) {
                        this.greatestRiderIndex = riderIndex;
                    }
                }

                const timeBonus = stage.type === "TT" ? 0 : (  // time trials don't have time bonuses
                    rider.position === "1" ? 10 : (
                        rider.position === "2" ? 6 : (
                            rider.position === "3" ? 4 : 0)));
                const timeInThisStage = Tour.fieldTimeToSeconds(rider.fieldTime) - timeBonus;
                const riderSummary = this.riderByName.get(rider.name);
                rider.accumulatedTimeInSeconds = riderSummary.accumulatedTimeInSeconds + timeInThisStage;
                riderSummary.accumulatedTimeInSeconds = rider.accumulatedTimeInSeconds;
            }

            // now reorder riders by total time so that we don't have to do it every time we update the screen
            stage.riders = stage.riders.sort((left, right) => left.accumulatedTimeInSeconds - right.accumulatedTimeInSeconds);
        }
    }

    static bind(query) {
        return document.querySelector(query);
    }

    static setText(element, text) {
        element.innerText = text;
    }

    static async getFile(url) {
        return new Promise((resolve, reject) => {
            const request = new XMLHttpRequest();
            request.addEventListener("load", function () {
                try {
                    resolve(this.responseText);
                } catch (error) {
                    reject(error);
                }
            });
            request.open("GET", url);
            request.send();
            request.addEventListener("error", reject)
        });
    }

    static async start() {
        const stages = JSON.parse(await Tour.getFile("tdf2017.json"));
        new Tour(stages);
    }
}

window.addEventListener("load", () => Tour.start());
