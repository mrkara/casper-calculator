import axios from 'axios';

const utils = {
    address: '',
    nFormatter(num) {
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
        }
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        }
        return num;
    },
    shortenAddress(address) {
        return (address.length === 34) ? address.substr(0, 4) + '...' + address.substr(30, 33) : address;
    },
    convertTimeStamp(time) {
        if (time <= 0) return "";
        let d = new Date(time);
        return utils.twoDigit(d.getDate()) + '/' + utils.twoDigit(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + utils.twoDigit(d.getHours()) + ':' + utils.twoDigit(d.getMinutes()) + ':' + utils.twoDigit(d.getSeconds());
    },
    convertTimeStampNoTime(time) {
        if (time <= 0) return "";
        let d = new Date(time);
        return utils.twoDigit(d.getDate()) + '/' + utils.twoDigit(d.getMonth() + 1) + '/' + d.getFullYear();
    },
    twoDigit(myNumber) {
        return ("0" + myNumber).slice(-2);
    },
    /**
     * @return {string}
     */
    TwoDigitTime(time) {
        if (time < 10)
            return "0" + time;
        else return time + "";
    },
    truncateStr(str, n) {
        if (!str) return '';
        return (str.length > n) ? str.substr(0, n - 1) + '...' + str.substr(str.length - n, str.length - 1) : str;
    },
    numberWithCommasKMB(x) {
        x = this.nFormatter(x);
        return x.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },
    numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },
    delay(timeout) {
        return new Promise(resolve => {
            setTimeout(resolve, timeout);
        });
    },
    convertDuration(duration) {
        let n = parseInt(duration);
        let day = Math.floor(n / (24 * 3600));

        n = n % (24 * 3600);
        let hour = Math.floor(n / 3600);

        n %= 3600;
        let minutes = Math.floor(n / 60);

        n %= 60;
        let seconds = Math.floor(n);
        return utils.twoDigit(day) + ' days ' + utils.twoDigit(hour) + ' hours ' + utils.twoDigit(minutes) + ' minutes ' + utils.twoDigit(seconds) + ' seconds';
    },
    async getBTC_USDT_price() {
        let BTC_USDT = 0;
        await axios.get('https://api.binance.com/api/v3/avgPrice?symbol=BTCUSDT')
            .then(function (response) {
                BTC_USDT = parseFloat(response.data.price);
            })
            .catch(function (error) {
                // handle error
                console.log(error);
            });
        return BTC_USDT;
    },
    async getBTC_USDT_future_price() {
        let BTC_USDT = 0;
        await axios.get('https://fapi.binance.com/fapi/v1/ticker/price')
            .then(function (response) {
                if (response.data) {
                    let leng = response.data.length;
                    let obj = response.data.find(o => o.symbol === 'BTCUSDT');
                    BTC_USDT = obj.price;
                }
            })
            .catch(function (error) {
                console.log(error);
            });
        return BTC_USDT;
    },
    calculateYTM(spot, future, duration_in_days) {
        return 100 * (((future - spot) / spot) * duration_in_days) / 365;
    },
    calculateBondValue(fund, spot, future, duration_in_days, YTM) {
        return fund * ((1 + utils.calculateYTM(spot, future, duration_in_days)) ** (duration_in_days / 365));
    }
};

export default utils;
