import React, {Component} from "react";
import Swal from "sweetalert2";
import axios from 'axios';
import {Line, Bar, Pie} from 'react-chartjs-2';
import utils from "../../utils";
import {Table, Thead, Tbody, Tr, Th, Td} from 'react-super-responsive-table';
import 'react-super-responsive-table/dist/SuperResponsiveTableStyle.css';
import {
    PublicKey,
    decodeBase16,
    encodeBase16,
    BalanceServiceByJsonRPC,
    CasperServiceByJsonRPC,
} from 'casper-client-sdk';
import {BigNumber, BigNumberish} from '@ethersproject/bignumber';
import {AccountModel} from '../../utils/Accounts';

export default class Account extends Component {
    constructor(props) {
        super(props);
        this.state = {
            public_key: "",
            balance: 0,
            total_reward: 0,
            data: {},
            transfers: [],
            validators_data: {}
        };
        this.tick = this.tick.bind(this);
        this.intervalHandle = null;
    }

    async tick() {
        if (this.state.public_key !== "") return;
        let public_key = this.props.match.params.id;//window.localStorage.getItem("public_key");
        if (public_key)
            this.setState(
                {
                    public_key: public_key
                }
            );
        const accountModel = AccountModel({publicKeyHex: public_key});

        let accountHash = accountModel.getAccountHash();

        await axios.post('https://api.blockshark.net:3399/getLatestBlockInfo', {}).then(latestBlockResponse => {
            // according to GetBlockResult type, block property could be null
            console.log(latestBlockResponse);
            if (!latestBlockResponse.data.block) {
                return Promise.resolve(null);
            }
            const stateRootHash = latestBlockResponse.data.block.header.state_root_hash;
            console.log({"stateRootHash": stateRootHash, "publicKey": public_key});
            axios.post('https://api.blockshark.net:3399/getAccountBalance', {
                "stateRootHash": stateRootHash,
                "publicKey": public_key
            }).then(res => {
                console.log('balance', res);
                this.setState({
                    balance: res.data.balance
                });
            });

        });

        let total_reward = 0;
        await axios.get('https://event-store-api-clarity-mainnet.make.services/delegators/' + public_key + '/total-rewards').then(resp => {
            //console.log(resp.data.data);
            total_reward = resp.data.data;
        });
        this.setState({
            total_reward: total_reward,

        });
        let rewards = [];
        await axios.get('https://event-store-api-clarity-mainnet.make.services/delegators/' + public_key + '/rewards?with_amounts_in_currency_id=1&page=1&limit=20').then(resp => {
            //console.log(resp.data.data);
            rewards = resp.data.data;
        });

        let eras = [];
        let earnings = [];
        let length = rewards.length;

        //console.log(rewards);
        rewards.sort(function (a, b) {
            var keyA = parseInt(a.eraId);
            var keyB = parseInt(b.eraId);
            // Compare the 2 keys
            if (keyA < keyB) return -1;
            if (keyA > keyB) return 1;
            return 0;
        });
        //console.log('sorted',rewards);
        for (var i = 0; i < length; i++) {
            eras.push(rewards[i].eraId);
            earnings.push(parseFloat(rewards[i].amount / 1e9).toFixed(3));
        }
        this.setState({
            data: {
                labels: eras,
                datasets: [{
                    label: 'Staking Rewards by Era',
                    data: earnings,
                    borderWidth: 1,
                    borderColor: 'rgb(75, 192, 192)',
                }]
            }
        });
        let transfers = [];
        console.log('https://event-store-api-clarity-mainnet.make.services/accounts/' + accountHash + '/transfers?page=1&limit=10');
        await axios.get('https://event-store-api-clarity-mainnet.make.services/accounts/' + accountHash + '/transfers?page=1&limit=10').then(resp => {
            //console.log(resp);
            transfers = resp.data.data;
        });
        transfers.sort(function (a, b) {
            return a.timestamp - b.timestamp;
        });
        this.setState({
            transfers: transfers
        });
        let validatorsInfo = null;
        await axios.post('https://api.blockshark.net:3399/getValidatorsInfo', {}).then(resp => {
            validatorsInfo = resp.data;
        });
        //console.log(validatorsInfo.auction_state.bids);
        let validators = validatorsInfo.auction_state.bids;
        validators = validators.filter((validator) => {
            return !!validator.bid.delegators.find(
                (delegator) => delegator.public_key === public_key
            );
        });
        var validator_length = validators.length;
        var validators_staked = [];
        var staked_amount = [];

        for (var i = 0; i < validator_length; i++) {
            var delegator_length = validators[i].bid.delegators.length;
            for (var j = 0; j < delegator_length; j++) {
                if (validators[i].bid.delegators[j].public_key === public_key) {
                    validators_staked.push(utils.truncateStr(validators[i].public_key, 5));
                    staked_amount.push(validators[i].bid.delegators[j].staked_amount / 1e9);
                }
            }
        }
        this.setState({
            validators_data: {
                labels: validators_staked,
                datasets: [{
                    label: 'Staked Amount per Validators',
                    data: staked_amount,
                    borderWidth: 1,
                    borderColor: 'rgb(75, 192, 192)',
                }]
            }
        });
        // console.log(validators);
    }

    async componentWillUnmount() {
        clearInterval(this.intervalHandle);
    }

    async componentDidMount() {
        this.tick();
        this.intervalHandle = setInterval(this.tick, 10000);
    }

    render() {
        return (
            <div>
                <section className="site-section bg-light" id="contact-section">
                    <div className="container" style={{marginTop: "50px"}}>
                        <div className="row mb-3">
                            <div className="col-12 text-center">
                                <h3 className="section-sub-title">ACCOUNT INFORMATION</h3>
                            </div>
                        </div>
                        <div className="row mb-5">
                            <div className="col-md-12 mb-1">
                                <form action="#" className="p-3 bg-white">
                                    <p> Public Key</p>
                                    <h3 className="section-sub-title">{this.state.public_key !== "" ? this.state.public_key : "-"}</h3>
                                    <p> Balance</p>
                                    <h3 className="section-sub-title">{this.state.balance} CSPR</h3>
                                    <p> Total Rewards</p>
                                    <h3 className="section-sub-title">{this.state.total_reward / 1e9} CSPR</h3>

                                </form>
                            </div>
                        </div>
                        <div className="row mb-5">
                            <div className="col-md-6 mb-1 text-center">
                                <form action="#" className="p-3 bg-white">
                                    <Line data={this.state.data}/>
                                </form>
                            </div>
                            <div className="col-md-6 mb-1 text-center">
                                <form action="#" className="p-3 bg-white">
                                    <Bar data={this.state.validators_data}/>
                                </form>
                            </div>
                        </div>
                        <div className="row mb-5">
                            <div className="col-md-12 mb-1 text-center">
                                <form action="#" className="p-3 bg-white">
                                    <Table style={{width: "100%"}}>
                                        <Thead>
                                            <Tr>
                                                <Th>From (Account Hash)</Th>
                                                <Th>To (Account Hash)</Th>
                                                <Th>Amount</Th>
                                                <Th>Deploy Hash</Th>
                                                <Th>Block Hash</Th>
                                                <Th>Timestamp</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {!this.state.transfers ? "Loading..." : ''}
                                            {this.state.transfers ?
                                                this.state.transfers.map((transfer, index) => (
                                                    <Tr key={index + 1}>
                                                        <Td>{transfer.fromAccount !== '' ? utils.truncateStr(transfer.fromAccount, 5) : "-"}</Td>
                                                        <Td>{transfer.toAccount !== '' ? utils.truncateStr(transfer.toAccount, 5) : "-"}</Td>
                                                        <Td>{utils.numberWithCommas(parseFloat(transfer.amount / 1e9).toFixed(3))}</Td>
                                                        <Td>{utils.truncateStr(transfer.deployHash, 5)}</Td>
                                                        <Td>{utils.truncateStr(transfer.blockHash, 5)}</Td>
                                                        <Td>{transfer.timestamp}</Td>
                                                    </Tr>
                                                ))
                                                :
                                                null
                                            }
                                        </Tbody>
                                    </Table>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div className="row mb-3">
                        <div className="col-12 text-center">
                            <h3 className="section-sub-title">
                                Created by <strong><a href="https://blockshark.net"
                                                      target="_blank">Blockshark.net</a></strong>
                                team to support Casper Network. 2021
                            </h3>
                        </div>
                    </div>
                </section>
            </div>
        );
    }
};
