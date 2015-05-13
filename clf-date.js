/**
 * Array of CLF month names.
 * @private
 */

var clfmonth = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];

/**
 * Format a Date in the common log format.
 *
 * @private
 * @param {Date} dateTime
 * @return {string}
 */
function clfdate(dateTime) {
    var date = dateTime.getUTCDate();
    var hour = dateTime.getUTCHours();
    var mins = dateTime.getUTCMinutes();
    var secs = dateTime.getUTCSeconds();
    var year = dateTime.getUTCFullYear();

    var month = clfmonth[dateTime.getUTCMonth()];

    return pad2(date) + '/' + month + '/' + year + ':' + pad2(hour) + ':' + pad2(mins) + ':' + pad2(secs) + ' +0000';
}

function pad2(num) {
    var str = String(num);
    return (str.length === 1 ? '0' : '') + str;
}

module.exports = clfdate;
