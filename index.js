
function lerp(left, right, ratio) {
    return left * (1 - ratio) + right * ratio;
}

class Tour {

    /**
     * @param {Stage[]} stages
     */
    constructor (stages) {
        this.ORIGINAL_AVATAR_SIZE_IN_PIXELS = parseInt(getComputedStyle(document.body).getPropertyValue("--avatar-size"), 10);
        this.AVATAR_SCALE_FACTOR = parseFloat(getComputedStyle(document.body).getPropertyValue("--avatar-scale"));
        this.SECONDS_PER_STAGE = 2;
        this.SCROLL_INCREMENT = 1 / 60 / this.SECONDS_PER_STAGE;
        this.VIEW_IN_MINUTES = 5;

        this.stages = stages;
        this.currentStageIndex = 0;
        this.processStages();

        this.chart = Tour.bind(".chart");
        this.stageTitle = Tour.bind(".stage-title");
        this.stageDate = Tour.bind(".stage-date");
        this.cardTemplate = Tour.bind(".rider.template");

        this.firstTime = Tour.bind("#first-time");
        this.lastTime = Tour.bind("#last-time");

        document.addEventListener("keydown", this.onKeyDown.bind(this));
        window.addEventListener("resize", this.updateStage.bind(this));

        // make sure avatars are loaded before starting animation
        const avatars = new Image();
        avatars.setAttribute("src", "assets/avatars.jpeg");
        avatars.addEventListener("load", () => requestAnimationFrame(this.update.bind(this)));
    }

    update() {
        this.currentStageIndex = (this.currentStageIndex + this.SCROLL_INCREMENT) % this.stages.length;
        this.updateStage();
        requestAnimationFrame(this.update.bind(this));
    }

    updateStage() {
        const leftStageIndex = Math.trunc(this.currentStageIndex);
        const ratio = this.currentStageIndex - leftStageIndex;
        const rightStageIndex = (leftStageIndex === this.stages.length - 1) ? leftStageIndex : leftStageIndex + 1;

        // start by hiding all cards to show only the ones whose riders figure among the current stage's competitors
        this.chart.querySelectorAll(".rider").forEach(rider => rider.classList.add("hidden"));

        const leftStage = this.stages[leftStageIndex];
        const rightStage = this.stages[rightStageIndex];

        // ToDo make titles scroll left as stages pass
        Tour.setText(this.stageTitle, `${leftStage.index}: ${leftStage.description}`);
        Tour.setText(this.stageDate, leftStage.date);

        const minTop = 0;
        const maxTop = Math.round(this.chart.clientHeight - this.ORIGINAL_AVATAR_SIZE_IN_PIXELS * this.AVATAR_SCALE_FACTOR);
        const horizontalMargin = 50;
        const minLeft = horizontalMargin;
        const maxLeft = Math.round(this.chart.clientWidth - this.ORIGINAL_AVATAR_SIZE_IN_PIXELS * this.AVATAR_SCALE_FACTOR) - horizontalMargin;

        const leftFirstFieldTime = leftStage.riders[0].accumulatedTimeInSeconds;
        const rightFirstFieldTime = rightStage.riders[0].accumulatedTimeInSeconds;

        const firstFieldTime = lerp(leftFirstFieldTime, rightFirstFieldTime, ratio);
        // console.info(`${leftStage.index} first place: ${leftFirstFieldTime}, ${rightStage.index} first place: ${rightFirstFieldTime}, ratio: ${ratio}, interpolated: ${firstFieldTime}`);
        const lastFieldTime = firstFieldTime + 60 * this.VIEW_IN_MINUTES;

        this.firstTime.style.left = maxLeft + "px";
        this.firstTime.style.top = maxTop + "px";
        Tour.setText(this.firstTime, Tour.humanizeDurationInSeconds(firstFieldTime));
        this.lastTime.style.left = minLeft + "px";
        this.lastTime.style.top = maxTop + "px";
        Tour.setText(this.lastTime, "+" + Tour.humanizeDurationInSeconds(lastFieldTime - firstFieldTime));

        const uniqueRiderNames = new Set();
        for (const name of leftStage.riderByName.keys()) {
            uniqueRiderNames.add(name);
        }
        for (const name of rightStage.riderByName.keys()) {
            uniqueRiderNames.add(name);
        }
        const reversedRiders = Array.from(uniqueRiderNames)
            .map(riderName => {
                const leftState = leftStage.riderByName.get(riderName);
                const rightState = rightStage.riderByName.get(riderName);
                const rightTime = rightState ? rightState.accumulatedTimeInSeconds :
                    // rider abandoned the competition - interpolate it to be after the last rider that finished
                    rightStage.riders[rightStage.riders.length - 1].accumulatedTimeInSeconds + 60;
                const result = /** @type {Rider} */ Object.assign({}, leftState);
                result.accumulatedTimeInSeconds = lerp(leftState.accumulatedTimeInSeconds, rightTime, ratio);
                return result;
            })
            .sort((leftRider, rightRider) => rightRider.accumulatedTimeInSeconds - leftRider.accumulatedTimeInSeconds);

        reversedRiders.forEach((rider) => {
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
        minutes = minutes > 9 ? minutes.toFixed(0) : "0" + minutes.toFixed(0);
        seconds = seconds > 9 ? seconds.toFixed(0) : "0" + seconds.toFixed(0);
        return `${hours.toFixed(0)}:${minutes}:${seconds}`;
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
            case "Home":
                this.currentStageIndex = 0;
                this.updateStage();
                break;
            case "End":
                this.currentStageIndex = this.stages.length - 1;
                this.updateStage();
                break;
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
            stage.riders = stage.riders
                .sort((left, right) => left.accumulatedTimeInSeconds - right.accumulatedTimeInSeconds);

            // compile map of riders by name
            stage.riderByName = new Map();
            stage.riders.forEach(rider => stage.riderByName.set(rider.name, rider));
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
