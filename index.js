
class Tour {

    /**
     * @param {Stage[]} stages
     */
    constructor (stages) {
        this.ORIGINAL_AVATAR_SIZE_IN_PIXELS = parseInt(getComputedStyle(document.body).getPropertyValue("--avatar-size"), 10);
        this.AVATAR_SCALE_FACTOR = parseFloat(getComputedStyle(document.body).getPropertyValue("--avatar-scale"));
        this.VISIBLE_RIDERS = parseInt(getComputedStyle(document.body).getPropertyValue("--visible-riders"), 10);
        this.SCROLL_INCREMENT = 1;  // 0.1;

        this.stages = stages;
        this.currentStageIndex = 0;
        this.processStages();

        this.chart = Tour.bind(".chart");
        this.chartWidth = this.chart.clientWidth;
        this.chartHeight = this.chart.clientHeight;
        this.stageTitle = Tour.bind(".stage-title");
        this.stageDate = Tour.bind(".stage-date");
        this.cardTemplate = Tour.bind(".rider.template");

        this.firstTime = Tour.bind("#first-time");
        this.lastTime = Tour.bind("#last-time");

        this.updateStage();

        document.addEventListener("keydown", this.onKeyDown.bind(this));
    }

    updateStage() {
        // start by hiding all cards to show only the ones whose riders figure among the current stage's competitors
        this.chart.querySelectorAll(".rider").forEach(rider => rider.classList.add("hidden"));

        const stage = this.stages[this.currentStageIndex];
        Tour.setText(this.stageTitle, `${stage.index}: ${stage.description}`);
        Tour.setText(this.stageDate, stage.date);

        const minTop = 0;
        const maxTop = Math.round(this.chartHeight - this.ORIGINAL_AVATAR_SIZE_IN_PIXELS * this.AVATAR_SCALE_FACTOR);
        const horizontalSlack = 50;
        const minLeft = horizontalSlack;
        const maxLeft = Math.round(this.chartWidth - this.ORIGINAL_AVATAR_SIZE_IN_PIXELS * this.AVATAR_SCALE_FACTOR) - horizontalSlack;

        // ToDo must lerp
        const firstFieldTime = stage.riders[0].accumulatedTimeInSeconds;
        const lastFieldTime = firstFieldTime + 60 * 5;  // 5 min window  --- stage.riders[stage.riders.length - 1].accumulatedTimeInSeconds;

        this.firstTime.style.left = maxLeft + "px";
        this.firstTime.style.top = maxTop + "px";
        this.firstTime.innerText = Tour.humanizeDurationInSeconds(firstFieldTime);
        this.lastTime.style.left = minLeft + "px";
        this.lastTime.style.top = maxTop + "px";
        this.lastTime.innerText = "+" + Tour.humanizeDurationInSeconds(lastFieldTime - firstFieldTime);

        Array.from(stage.riders).reverse().forEach((rider) => {
            // ToDo must lerp
            const time = rider.accumulatedTimeInSeconds;
            const screenPositionRatio = (lastFieldTime - time) / (lastFieldTime - firstFieldTime);
            const left = Math.round(minLeft + screenPositionRatio * (maxLeft - minLeft));
            const top = Math.round((maxTop - minTop) / 2);
            this.showRiderCard(rider, left, top);
        });
    }

    static humanizeDurationInSeconds(duration) {
        let hours = 0;
        let minutes = 0;
        if (duration > 3600) {
            hours = Math.trunc(duration / 3600);
        }
        duration -= hours * 3600;
        if (duration > 60) {
            minutes = Math.trunc(duration / 60);
        }
        duration -= minutes * 60;
        let seconds = duration;
        minutes = minutes > 9 ? minutes : "0" + minutes;
        seconds = seconds > 9 ? seconds : "0" + seconds;
        return `${hours}:${minutes}:${seconds}`;
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
        const riderSummary = this.riderByName.get(rider.name);

        let cardId = "rider-" + riderSummary.index;
        let card = document.getElementById(cardId);
        if (!card) {
            card = this.cardTemplate.cloneNode(true);
            card.setAttribute("id", cardId);
            card.classList.remove("template");
        }

        card.classList.remove("hidden");
        card.style.left = left + "px";
        card.style.top = top + "px";

        const avatar = card.querySelector(".avatar");

        avatar.setAttribute("title", rider.name);

        const tileCount = this.greatestRiderIndex;
        const tileSize = this.ORIGINAL_AVATAR_SIZE_IN_PIXELS * this.AVATAR_SCALE_FACTOR;
        const imageWidth = Math.round(tileCount * tileSize);
        const imageHeight = Math.round(tileSize);
        avatar.style.backgroundSize = `${imageWidth}px ${imageHeight}px`;
        const backgroundLeft = Math.round(tileSize * riderSummary.index);
        avatar.style.backgroundPosition = `-${backgroundLeft}px 0`;

        // clear all previous jerseys
        card.querySelectorAll(".jersey").forEach(jersey => jersey.remove());

        rider.jerseys.forEach((jersey, index) => {
            const jerseyIndex = index + 1;
            const jerseyType = jersey.description.replace(/\s+.*$/, "").toLowerCase();

            // and then add current ones
            const jerseyElement = document.createElement("div");
            jerseyElement.classList.add("jersey", jerseyType + "-jersey", "jersey-" + jerseyIndex);
            card.appendChild(jerseyElement);
        });

        this.chart.appendChild(card);
    }

    onKeyDown(event) {
        switch (event.key) {
            case "ArrowRight":
                this.currentStageIndex = Math.min(this.currentStageIndex + this.SCROLL_INCREMENT, this.stages.length - 1);
                this.updateStage();
                break;
            case "ArrowLeft":
                this.currentStageIndex = Math.max(this.currentStageIndex - this.SCROLL_INCREMENT, 0);
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
