let BigNumber = require('bignumber.js');
let ContractsHelper = require('../Helpers/ContractsHelper');
let InsightApi = require('../Repositories/InsightApi');
let async = require('async');


class HistoryService {

    static formatHistory(history, next) {

        let items = [];

        if (!history) {
            return next(null, {
                totalItems: 0,
                items: []
            });
        }

        if (history && history.items && history.items.length) {

            async.each(history.items, (item, callback) => {

                HistoryService.formatHistoryItem(item, (err, result) => {

                    items.push(result);

                    return callback();
                });

            }, (err) => {
                return next(err, {
                    totalItems: history && history.totalItems ? history.totalItems : 0,
                    items: items
                });
            });
        }

    }

    static formatHistoryItem(item, cb) {
        let vout = [],
            vin = [],
            addressString;

        if (item.vin) {
            item.vin.forEach((vIn) => {

                if (vIn.addr) {

                    let num = new BigNumber(vIn.value);

                    vin.push({
                        value: num.toString(10),
                        address: vIn.addr
                    });

                }

            });
        }

        if (item.vout) {

            item.vout.forEach((vOut) => {

                if (vOut.scriptPubKey) {

                    try {
                        if (ContractsHelper.isContractVOutHex(vOut.scriptPubKey.hex)) {
                            addressString = ContractsHelper.getContractAddress(item.txid, vOut.n);
                        }
                    } catch (e) {
                    }

                    if (vOut.scriptPubKey.addresses && vOut.scriptPubKey.addresses.length && typeof vOut.value !== 'undefined') {

                        let num = new BigNumber(vOut.value);

                        vout.push({
                            value: num.toString(10),
                            address: vOut.scriptPubKey.addresses[0] ? vOut.scriptPubKey.addresses[0] : null
                        });

                    }

                }

            });

        }

        let result = {
            block_time: item.blocktime ? item.blocktime : null,
            block_height: item.blockheight ? item.blockheight : -1,
            block_hash: item.blockhash ? item.blockhash : null,
            tx_hash: item.txid,
            amount: item.valueIn,
            vout: vout,
            vin: vin
        };

        if (!addressString) {
            return cb(null, result);
        }

        InsightApi.getAccountInfo(addressString, (err, res) => {

            if (err) {
                return cb(err)
            }

            if (res) {
                result.contract_has_been_created = true;
            }

            return cb(null, result);

        });

    }
}

module.exports = HistoryService;