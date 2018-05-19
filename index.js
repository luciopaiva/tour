
class Tour {

    /**
     * @param {Stage[]} stages
     */
    constructor (stages) {
        this.ORIGINAL_AVATAR_SIZE_IN_PIXELS = 135;
        this.AVATAR_SCALE_FACTOR = 0.6;

        this.stages = stages;
        this.currentStageIndex = 0;
        this.processRiders();

        this.chart = Tour.bind(".chart");
        this.chartWidth = this.chart.clientWidth;
        this.chartHeight = this.chart.clientHeight;
        this.stageTitle = Tour.bind(".stage-title");
        this.stageLocation = Tour.bind(".stage-location");
        this.stageDate = Tour.bind(".stage-date");
        this.cardTemplate = Tour.bind(".rider.template");

        this.updateStage();

        document.addEventListener("keydown", this.onKeyDown.bind(this));
    }

    updateStage() {
        this.chart.innerHTML = "";

        const stage = this.stages[this.currentStageIndex];
        // ToDo remove slice!
        const selectedRiders = stage.riders.slice(0, 20);
        Tour.setText(this.stageTitle, `${stage.index}: ${stage.description}`);
        Tour.setText(this.stageDate, stage.date);

        const minTop = 0;
        const maxTop = Math.round(this.chartHeight - this.ORIGINAL_AVATAR_SIZE_IN_PIXELS * this.AVATAR_SCALE_FACTOR);
        const horizontalSlack = 50;
        const minLeft = horizontalSlack;
        const maxLeft = Math.round(this.chartWidth - this.ORIGINAL_AVATAR_SIZE_IN_PIXELS * this.AVATAR_SCALE_FACTOR) - horizontalSlack;

        const firstFieldTime = Tour.fieldTimeToSeconds(selectedRiders[0].fieldTime);
        const lastFieldTime = Tour.fieldTimeToSeconds(selectedRiders[selectedRiders.length - 1].fieldTime);
        const timeRange = lastFieldTime - firstFieldTime;

        selectedRiders.reverse().forEach((rider) => {
            const time = Tour.fieldTimeToSeconds(rider.fieldTime);
            const screenPositionRatio = (lastFieldTime - time) / (lastFieldTime - firstFieldTime);
            const left = Math.round(minLeft + screenPositionRatio * (maxLeft - minLeft));
            const position = parseInt(rider.position, 10) || selectedRiders.length;
            const top = Math.round((maxTop - minTop) * ((position - 1) / selectedRiders.length));
            this.showRiderCard(this.riderByName.get(rider.name), left, top);
        });
    }

    static fieldTimeToSeconds(fieldTime) {
        const [, hours, minutes, seconds] = fieldTime.match(/(\d\d):(\d\d):(\d\d)/);
        return parseInt(seconds, 10) + parseInt(minutes, 10) * 60 + parseInt(hours, 10) * 3600;
    }

    /**
     * @param {RiderSummary} rider
     * @param {Number} left
     * @param {Number} top
     */
    showRiderCard(rider, left, top) {
        const card = this.cardTemplate.cloneNode(true);
        card.classList.remove("template");

        const avatar = card.querySelector(".avatar");

        avatar.setAttribute("title", rider.name);
        avatar.style.left = left + "px";
        avatar.style.top = top + "px";

        const tileCount = this.greatestRiderIndex;
        const tileSize = this.ORIGINAL_AVATAR_SIZE_IN_PIXELS * this.AVATAR_SCALE_FACTOR;
        const imageWidth = Math.round(tileCount * tileSize);
        const imageHeight = Math.round(tileSize);
        avatar.style.backgroundSize = `${imageWidth}px ${imageHeight}px`;
        const backgroundLeft = Math.round(tileSize * rider.index);
        avatar.style.backgroundPosition = `-${backgroundLeft}px 0`;

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

    processRiders() {
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
                        country: rider.country
                    });

                    if (riderIndex > this.greatestRiderIndex) {
                        this.greatestRiderIndex = riderIndex;
                    }
                }
            }
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
