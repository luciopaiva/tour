
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
        this.AVATAR_SIZE_IN_PIXELS = this.ORIGINAL_AVATAR_SIZE_IN_PIXELS * this.AVATAR_SCALE_FACTOR;
        this.SECONDS_PER_STAGE = 4;
        this.SCROLL_INCREMENT = 1 / (60 * this.SECONDS_PER_STAGE);
        this.VIEW_IN_MINUTES = 10;

        this.chart = Tour.bind(".chart");
        this.stageHeaderContainer = Tour.bind(".stage-header-container");
        this.stageHeaderMask = Tour.bind(".stage-header-mask");
        this.stageHeaderTemplate = Tour.bind(".stage-header.template");
        this.cardTemplate = Tour.bind(".rider.template");

        this.stages = stages;
        this.currentStageIndex = 0;
        this.processStages();

        this.imageX = [0, 1];
        this.imageY = [0, 1];
        this.domainX = [0, 1];
        this.domainY = [0, 1];

        this.firstTime = Tour.bind("#first-time");
        this.lastTime = Tour.bind("#last-time");

        document.addEventListener("keydown", this.onKeyDown.bind(this));
        window.addEventListener("resize", this.onWindowResize.bind(this));

        requestAnimationFrame(this.update.bind(this));
    }

    onWindowResize() {
        this.recomputeHeaderPositions();
        this.update();
    }

    update() {
        this.currentStageIndex = (this.currentStageIndex + this.SCROLL_INCREMENT) % this.stages.length;
        this.updateStage();
        requestAnimationFrame(this.update.bind(this));
    }

    updateStage() {
        // pick the two stages that are going to be interpolated

        const leftStageIndex = Math.trunc(this.currentStageIndex);
        const ratio = this.currentStageIndex - leftStageIndex;
        const rightStageIndex = (leftStageIndex === this.stages.length - 1) ? leftStageIndex : leftStageIndex + 1;

        const leftStage = this.stages[leftStageIndex];
        const rightStage = this.stages[rightStageIndex];

        // define screen bounds
        this.adjustScale(leftStage, rightStage, ratio);

        // update screen labels
        this.stageHeaderContainer.style.left =
            Math.round(-this.stageHeaderMask.clientWidth * this.currentStageIndex).toFixed(0) + "px";
        Tour.setText(this.firstTime, Tour.humanizeDurationInSeconds(this.domainX[0]));
        Tour.setText(this.lastTime, "+" + Tour.humanizeDurationInSeconds(this.domainX[1] - this.domainX[0]));

        // update players' cards

        // start by hiding all cards to show only the ones whose riders figure among the current stage's competitors
        this.chart.querySelectorAll(".rider").forEach(rider => rider.classList.add("hidden"));

        // compile list of riders appearing in both stages
        // left stage's set of riders is guaranteed to contain right stage's riders, so let's just use the left set
        const reversedRiders = Array.from(leftStage.riderByName.keys())
            .map(riderName => {
                const leftState = leftStage.riderByName.get(riderName);
                const rightState = rightStage.riderByName.get(riderName);
                const rightTime = rightState ? rightState.accumulatedTimeInSeconds :
                    // rider abandoned the competition - interpolate it to be after the last rider that finished
                    rightStage.riders[rightStage.riders.length - 1].accumulatedTimeInSeconds + this.VIEW_IN_MINUTES * .1;

                // clone from left state
                const result = /** @type {Rider} */ Object.assign({}, leftState);
                // interpolate time
                result.accumulatedTimeInSeconds = lerp(leftState.accumulatedTimeInSeconds, rightTime, ratio);
                return result;
            })
            // order from last to first so appends favor those at the top of the rank
            .sort((leftRider, rightRider) => rightRider.accumulatedTimeInSeconds - leftRider.accumulatedTimeInSeconds);

        reversedRiders.forEach((rider) => {
            const left = this.scaleX(rider.accumulatedTimeInSeconds);
            const top = this.scaleY(this.avatarTopByRiderName.get(rider.name));
            this.showRiderCard(rider, left, top);
        });
    }

    scaleX(value) {
        const ratio = (this.domainX[1] - value) / (this.domainX[1] - this.domainX[0]);
        return Math.round(this.imageX[0] + ratio * (this.imageX[1] - this.imageX[0]));
    }

    scaleY(value) {
        const ratio = (this.domainY[1] - value) / (this.domainY[1] - this.domainY[0]);
        return Math.round(this.imageY[0] + ratio * (this.imageY[1] - this.imageY[0]));
    }

    /**
     * @param {Stage} leftStage
     * @param {Stage} rightStage
     * @param {Number} ratio
     */
    adjustScale(leftStage, rightStage, ratio) {
        this.imageY[0] = 0;
        this.imageY[1] = Math.round(this.chart.clientHeight - this.AVATAR_SIZE_IN_PIXELS);

        const horizontalMargin = 50;
        this.imageX[0] = horizontalMargin;
        this.imageX[1] = Math.round(this.chart.clientWidth - this.AVATAR_SIZE_IN_PIXELS) - horizontalMargin;

        const leftFirstFieldTime = leftStage.riders[0].accumulatedTimeInSeconds;
        const rightFirstFieldTime = rightStage.riders[0].accumulatedTimeInSeconds;

        const firstFieldTime = lerp(leftFirstFieldTime, rightFirstFieldTime, ratio);
        const lastFieldTime = firstFieldTime + 60 * this.VIEW_IN_MINUTES;

        this.domainX[0] = firstFieldTime;
        this.domainX[1] = lastFieldTime;
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
        const riderIndex = this.riderIndexByName.get(rider.name);

        let cardId = "rider-" + riderIndex;
        let card = document.getElementById(cardId);
        if (!card) {
            card = this.cardTemplate.cloneNode(true);
            card.setAttribute("id", cardId);
            card.classList.remove("template");

            const avatar = card.querySelector(".avatar");

            avatar.setAttribute("title", rider.name);

            avatar.style.backgroundSize = this.avatarTileSheetSizeCss;
            const backgroundLeft = Math.round(this.AVATAR_SIZE_IN_PIXELS * riderIndex);
            avatar.style.backgroundPosition = `-${backgroundLeft}px 0`;
        }

        card.classList.remove("hidden");
        card.style.left = left + "px";
        card.style.top = top + "px";

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
        /** @type {Map<String, Number>} */
        this.avatarTopByRiderName = new Map();
        /** @type {Map<String, Number>} */
        this.riderIndexByName = new Map();
        /** @type {Map<String, Number>} */
        const accumulatedTimeByRiderName = new Map();

        let greatestRiderIndex = 0;

        let stageIndex = 0;
        for (const stage of this.stages) {
            // create and position stage header
            const header = this.stageHeaderTemplate.cloneNode(true);
            header.classList.remove("template");
            Tour.setText(header.querySelector(".stage-title"), `${stage.index}: ${stage.description}`);
            Tour.setText(header.querySelector(".stage-date"), stage.date);
            this.recomputeHeaderPosition(header, stageIndex++);

            for (const rider of stage.riders) {
                if (!this.avatarTopByRiderName.has(rider.name)) {
                    this.avatarTopByRiderName.set(rider.name, Math.random());
                }
                if (!this.riderIndexByName.has(rider.name)) {
                    const riderIndex = parseInt(rider.avatar.match(/_TDF_2017_RIDER_(\d+).jpg/)[1], 10) - 1;
                    this.riderIndexByName.set(rider.name, riderIndex);

                    if (riderIndex > greatestRiderIndex) {
                        greatestRiderIndex = riderIndex;
                    }
                }

                const timeBonus = stage.type === "TT" ? 0 : (  // time trials don't have time bonuses
                    rider.position === "1" ? 10 : (
                        rider.position === "2" ? 6 : (
                            rider.position === "3" ? 4 : 0)));
                const timeInThisStage = Tour.fieldTimeToSeconds(rider.fieldTime) - timeBonus;

                const previousAccumulatedTime = accumulatedTimeByRiderName.get(rider.name) || 0;
                rider.accumulatedTimeInSeconds = previousAccumulatedTime + timeInThisStage;
                accumulatedTimeByRiderName.set(rider.name, rider.accumulatedTimeInSeconds);
            }

            // now reorder riders by total time so that we don't have to do it every time we update the screen
            stage.riders = stage.riders
                .sort((left, right) => left.accumulatedTimeInSeconds - right.accumulatedTimeInSeconds);

            // compile map of riders by name
            stage.riderByName = new Map();
            stage.riders.forEach(rider => stage.riderByName.set(rider.name, rider));
        }

        const avatarTileSheetWidth = Math.round(greatestRiderIndex * this.AVATAR_SIZE_IN_PIXELS);
        const avatarTileSheetHeight = Math.round(this.AVATAR_SIZE_IN_PIXELS);
        this.avatarTileSheetSizeCss = `${avatarTileSheetWidth}px ${avatarTileSheetHeight}px`;
    }

    recomputeHeaderPositions() {
        const headers = this.stageHeaderContainer.querySelectorAll(".stage-header");
        for (let i = 0; i < this.stages.length; i++) {
            this.recomputeHeaderPosition(headers[i], i);
        }
    }

    recomputeHeaderPosition(header, stageIndex) {
        const containerWidth = this.stageHeaderMask.clientWidth;
        const containerHeight = this.stageHeaderMask.clientHeight;
        this.stageHeaderContainer.appendChild(header);
        const shift = stageIndex * containerWidth;
        header.style.left = Math.round(shift + (containerWidth - header.clientWidth) / 2).toFixed(0) + "px";
        header.style.top = Math.round((containerHeight - header.clientHeight) / 2).toFixed(0) + "px";
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

    static downloadImage(src) {
        const img = new Image();
        img.setAttribute("src", src);
        return new Promise(resolve => img.addEventListener("load", resolve));
    }

    static async start() {
        const stages = JSON.parse(await Tour.getFile("tdf2017.json"));
        // just make sure avatars are loaded before starting animation
        await Tour.downloadImage("assets/avatars.jpeg");
        new Tour(stages);
    }
}

window.addEventListener("load", () => Tour.start());
