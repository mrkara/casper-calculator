import React, {Component} from "react";
import axios from 'axios';
import {Line, Bar} from 'react-chartjs-2';
import utils from "../../utils";
import {Table, Thead, Tbody, Tr, Th, Td} from 'react-super-responsive-table';
import 'react-super-responsive-table/dist/SuperResponsiveTableStyle.css';
import Modal from 'react-modal';

const customStyles = {
    content: {
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        marginRight: '-50%',
        transform: 'translate(-50%, -50%)',
    },
};

Modal.setAppElement('#root');

export default class ValidatorInfo extends Component {
    constructor(props) {
        super(props);
        this.state = {
            public_key: "",
            data: {},
            delegators_data: [],
            validator_name: "",
            validator_website: "",
            validator_rate: "",
            validator_delegators_count: "",
            validator_uptime: "",
            validator_staked_amount: 0,
            total_delegator_staked: 0,
            total_staked: 0,
            APY: 0,
            delegator_chart_data: [],
            selected_delegator: "",
            modalIsOpen: false,
        };
        this.loading = false;
        this.tick = this.tick.bind(this);
        this.intervalHandle = null;
        this.options = {
            plugins: {
                legend: {
                    display: false
                }
            }
        };
    }

    async openModal(delegator_address) {
        let rewards = [];
        let delegator_chart_data = {};
        await axios.get('https://event-store-api-clarity-mainnet.make.services/delegators/' + delegator_address + '/rewards?with_amounts_in_currency_id=1&page=1&limit=20').then(resp => {
            rewards = resp.data.data;
        });

        let eras = [];
        let earnings = [];
        let length = rewards.length;

        rewards.sort(function (a, b) {
            let keyA = parseInt(a.eraId);
            let keyB = parseInt(b.eraId);
            // Compare the 2 keys
            if (keyA < keyB) return -1;
            if (keyA > keyB) return 1;
            return 0;
        });
        for (let k = 0; k < length; k++) {
            eras.push(rewards[k].eraId);
            earnings.push(parseFloat(rewards[k].amount / 1e9).toFixed(3));
        }
        delegator_chart_data = {
            labels: eras,
            datasets: [{
                label: 'Staking Rewards by Era',
                data: earnings,
                borderWidth: 1,
                borderColor: 'rgb(75, 192, 192)',
            }]
        };
        this.setState({
            modalIsOpen: true,
            delegator_chart_data: delegator_chart_data,
            selected_delegator: delegator_address
        });
    }

    afterOpenModal() {
        // references are now sync'd and can be accessed.
    }

    closeModal() {
        this.setState({modalIsOpen: false});
    }

    async tick() {
        if (this.state.public_key !== "") return;
        this.loading = true;
        let public_key = this.props.match.params.id;
        if (public_key)
            this.setState(
                {
                    public_key: public_key
                }
            );
        let rewards = [];
        await axios.post('https://api.blockshark.net:3399/getValidatorsRewards', {public_key: public_key}).then(resp => {
            rewards = resp.data.rewards;
        });
        let eras = [];
        let earnings = [];
        let length = rewards.length;
        rewards.sort(function (a, b) {
            let keyA = parseInt(a.eraId);
            let keyB = parseInt(b.eraId);
            // Compare the 2 keys
            if (keyA < keyB) return -1;
            if (keyA > keyB) return 1;
            return 0;
        });
        for (let i = 0; i < length; i++) {
            eras.push(rewards[i].eraId);
            earnings.push(parseFloat(rewards[i].amount / 1e9).toFixed(3));
        }
        this.setState({
            data: {
                labels: eras,
                datasets: [{
                    label: 'Validator Earnings by Era',
                    data: earnings,
                    borderWidth: 1,
                    borderColor: 'rgb(75, 192, 192)',
                }]
            }
        });

        let commissions = [];
        await axios.post('https://api.blockshark.net:3399/getValidatorsCommissions', {public_key: public_key}).then(resp => {
            commissions = resp.data.commissions;
        });
        let CommEras = [];
        let comms = [];
        let Commlength = commissions.length;

        commissions.sort(function (a, b) {
            let keyA = parseInt(a.eraId);
            let keyB = parseInt(b.eraId);
            // Compare the 2 keys
            if (keyA < keyB) return -1;
            if (keyA > keyB) return 1;
            return 0;
        });
        for (let i = 0; i < Commlength; i++) {
            CommEras.push(commissions[i].eraId);
            comms.push(commissions[i].commission);
        }
        this.setState({
            CommissionData: {
                labels: CommEras,
                datasets: [{
                    label: 'Commission (%) Changes by Era',
                    data: comms,
                    borderWidth: 1,
                    borderColor: 'rgb(75, 192, 192)',
                }]
            }
        });

        let validator_data = null;
        await axios.post('https://api.blockshark.net:3399/getValidators', {public_key: public_key}).then(resp => {
            validator_data = resp.data.validators[0];
        });
        console.log(validator_data);
        this.setState({
            validator_name: validator_data.name,
            validator_website: validator_data.website,
            validator_rate: validator_data.delegation_rate,
            validator_delegators_count: validator_data.delegators.length,
            validator_uptime: validator_data.uptime * 100,
            validator_staked_amount: validator_data.staked_amount / 1e9,
        });
        let delegator_count = validator_data.delegators.length;
        let total_staked = 0;
        let delegator_pk = [];
        let delegator_staked = [];
        let delegators_data = [];
        console.log(validator_data.delegators);

        for (let j = 0; j < delegator_count; j++) {
            total_staked += validator_data.delegators[j].staked_amount / 1e9;
            delegators_data.push({
                address: validator_data.delegators[j].public_key,
                staked_amount: validator_data.delegators[j].staked_amount / 1e9
            });

        }
        this.setState({
            total_delegator_staked: total_staked,
            delegators_data: delegators_data,
            total_staked: total_staked + validator_data.staked_amount / 1e9
        });
        console.log('validator_data', validator_data);
        let APY = validator_data.delegation_rate === 100 ? 0
            :
            parseFloat(validator_data.currentRewardRatio * 12 * 365 * 100).toFixed(5);
        this.setState({
            APY: APY
        });
        this.loading = false;
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
                <Modal
                    isOpen={this.state.modalIsOpen}
                    onAfterOpen={this.afterOpenModal}
                    onRequestClose={this.closeModal}
                    style={customStyles}
                    contentLabel="Earnings"
                >
                    <p>Earnings of {utils.truncateStr(this.state.selected_delegator, 7)}</p>
                    <Line data={this.state.delegator_chart_data} options={this.options}/>
                    <a href={void (0)} className="btn btn-primary" onClick={() => this.closeModal()}>Close</a>
                </Modal>
                <section className="site-section bg-light bg-gradient" id="contact-section">
                    <div className="container" style={{marginTop: "50px"}}>
                        <div className="row mb-3">
                            <div className="col-12 text-center">
                                <h3 className="section-sub-title">VALIDATOR INFORMATION</h3>

                            </div>
                        </div>
                        <div className="row mb-5">
                            <div className="col-md-6 mb-1">
                                <form action="#" className="p-3 bg-white">
                                    <p> Name</p>
                                    <h3 className="section-sub-title">{this.state.validator_name !== "" ? this.state.validator_name : "Unknown"}</h3>
                                    <p> Website</p>
                                    <h3 className="section-sub-title">
                                        {this.state.validator_website !== "" && this.state.validator_website ?
                                            <a href={this.state.validator_website}
                                               target='_blank'>{this.state.validator_website}</a>
                                            :
                                            "-"
                                        }</h3>
                                    <p> Commission Rate</p>
                                    <h3 className="section-sub-title">{this.state.validator_rate} %</h3>
                                    <div className="row">
                                        <div className="col-md-6">
                                            <p> Uptime</p>
                                            <h3 className="section-sub-title">{this.state.validator_uptime} %</h3>
                                        </div>
                                        <div className="col-md-6">
                                            <p> APY</p>
                                            <h3 className="section-sub-title">{this.state.APY} %</h3>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div className="col-md-6 mb-1">
                                <form action="#" className="p-3 bg-white">
                                    <p> Number of Delegators</p>
                                    <h3 className="section-sub-title">{this.state.validator_delegators_count}</h3>
                                    <p> Total staked</p>
                                    <h3 className="section-sub-title">{this.state.total_staked} CSPR</h3>
                                    <p> Total staked by Delegators</p>
                                    <h3 className="section-sub-title">{this.state.total_delegator_staked} CSPR</h3>
                                    <p> Self Staked</p>
                                    <h3 className="section-sub-title">{this.state.validator_staked_amount} CSPR</h3>
                                </form>
                            </div>
                        </div>
                        <div className="row mb-5">
                            <div className="col-md-12 mb-1 text-center">
                                <form action="#" className="p-3 bg-white">
                                    <a href={'https://cspr.live/delegate-stake?validatorPublicKey=' + this.state.public_key}
                                       className="btn btn-primary" target="_blank">DELEGATE CSPR TO THIS VALIDATOR</a>
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
                                    <Line data={this.state.CommissionData}/>
                                </form>
                            </div>
                        </div>
                        <div className="row mb-5">
                            <div className="col-md-7 mb-1 text-center">
                                <form action="#" className="p-3 bg-white">
                                    <Table style={{width: "100%"}}>
                                        <Thead>
                                            <Tr>
                                                <Th>Delegator</Th>
                                                <Th>Staked Amount</Th>
                                                <Th>Earnings by Eras</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {!this.state.delegators_data ? "Loading..." : ''}
                                            {this.state.delegators_data ?
                                                this.state.delegators_data.map((delegator, index) => (
                                                    <Tr key={index + 1}>
                                                        <Td><a
                                                            href={"#/account/" + delegator.address}>{utils.truncateStr(delegator.address, 5)}</a></Td>
                                                        <Td>{utils.numberWithCommas(parseFloat(delegator.staked_amount).toFixed(3))}</Td>
                                                        <Td><a href={void (0)} className="btn btn-primary"
                                                               onClick={() => this.openModal(delegator.address)}>View
                                                            Earnings</a></Td>
                                                    </Tr>
                                                ))
                                                :
                                                null
                                            }
                                        </Tbody>
                                        {/*<Line  data={this.state.delegator_chart_data[index]} options={this.options}/>*/}
                                    </Table>
                                </form>
                            </div>
                            <div className="col-md-6 mb-1 text-center">
                            </div>
                        </div>
                    </div>
                    <div className="row mb-3">
                        <div className="col-12 text-center">
                            <h3 className="section-sub-title">Created by <strong><a href="https://blockshark.net"
                                                                                    target="_blank">Blockshark.net</a></strong> team
                                to support Casper Network. 2021</h3>
                        </div>
                    </div>
                </section>
            </div>
        );
    }
};
