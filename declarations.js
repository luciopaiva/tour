
/**
 * @typedef {Object} RiderSummary
 * @property {String} name
 * @property {String} team
 * @property {Number} index - index of their avatar in the avatar canvas (zero based)
 * @property {String} flag
 * @property {String} country
 * @property {Number} accumulatedTimeInSeconds
 */

/**
 * @typedef {Object} Jersey
 * @property {String} imgSrc
 * @property {String} description
 */

/**
 * @typedef {Object} Rider
 * @property {String} position
 * @property {String} name
 * @property {String} team
 * @property {String} avatar
 * @property {String} flag
 * @property {String} country
 * @property {String} fieldTime
 * @property {String} fieldGap
 * @property {Number} accumulatedTimeInSeconds
 * @property {Jersey[]} jerseys
 */

/**
 * @typedef {Object} Stage
 * @property {String} index
 * @property {String} description
 * @property {String} type
 * @property {String} date
 * @property {Rider[]} riders
 * @property {Map<String, Rider>} riderByName
 */
