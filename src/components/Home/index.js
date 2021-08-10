///////////////////////////////////////////////////////////////
import React, { Component } from "react";
import "./Home.scss";
import utils from "../../utils";
import $ from 'jquery';
import Swal from "sweetalert2";
import SweetAlert from "react-bootstrap-sweetalert";
import {
  BalanceServiceByJsonRPC,
  CasperServiceByJsonRPC,
} from 'casper-client-sdk';
import axios from 'axios';
import { Table, Thead, Tbody, Tr, Th, Td } from 'react-super-responsive-table';
import 'react-super-responsive-table/dist/SuperResponsiveTableStyle.css';
export default class Home extends Component {
  constructor(props) {
    super(props);
    this.state = {
      validatorsInfo:null,
      status:null,
      valid_validators:0,
      validators_data_temp:[],
      total_staked:0,
      totalSupply:0,
      circulating:0,
      price:0,
      validators_data:[],
      user_staked_amount:1000,
      sort_type0:-1,
      sort_type1:-1,
      sort_type2:-1,
      sort_type3:-1,
      sort_type4:-1,
      sort_type5:-1,
      search:""
    };
    this.tick = this.tick.bind(this);
    this.intervalHandle = null;

    this.loaded_validators = false;

  }
  async getRewardRatio(delegator,staked_amount){
    //https://event-store-api-clarity-mainnet.make.services/delegators/01043ec376572690a6cc367aed30009121e8079053b3d7c07294bee428bd107921/rewards?with_amounts_in_currency_id=1&page=1&limit=10
    //console.log('https://event-store-api-clarity-mainnet.make.services/delegators/'+delegator+'/rewards?with_amounts_in_currency_id=1&page=1&limit=10');
    var rewards = null;
    await axios.get('https://event-store-api-clarity-mainnet.make.services/delegators/'+delegator+'/rewards?with_amounts_in_currency_id=1&page=1&limit=10').then(resp => {
        //console.log(delegator,resp.data);
        rewards = resp.data.data;
    }).catch(function (error) {
      if (error.response) {
        // Request made and server responded
        //console.log(error.response.data);
        //console.log(error.response.status);
        //console.log(error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        //console.log(error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        //console.log('Error', error.message);
      }
      return 0;

    });
    if (rewards){
      var reward_length = rewards.length;
      if (reward_length === 0) return 0;
      var total_ratio = 0;
      for (var k=0;k<reward_length;k++){
        total_ratio += (rewards[k].amount / staked_amount);
      }
      //console.log(total_ratio/reward_length);
      return total_ratio/reward_length; //get average
    }
    return 0;
  }
  async tick() {
    let status = null;
    let validatorsInfo = null;
    let circulating = 0;
    let totalSupply = 0;

    const requestOne = axios.post('https://api.blockshark.net:3399/getValidatorsInfo');
    const requestTwo = axios.post('https://api.blockshark.net:3399/getStatus');

    await axios.all([requestOne, requestTwo]).then(axios.spread((...responses) => {
      validatorsInfo = responses[0].data;
      status = responses[1].data;
      // use/access the results
    })).catch(errors => {
      // react on errors.
    });

    if (validatorsInfo != null){
        var valid_validators = 0;
        var total_staked = 0;
        var bids_length = validatorsInfo.auction_state.bids.length;
        for (var i=0;i<bids_length;i++){
          var delegator_length = validatorsInfo.auction_state.bids[i].bid.delegators.length;
          if (!validatorsInfo.auction_state.bids[i].bid.inactive){
            valid_validators++;
            total_staked += parseFloat(validatorsInfo.auction_state.bids[i].bid.staked_amount / 1000000000);
            for (var j=0;j<delegator_length;j++){
              var staked_amount = parseFloat(validatorsInfo.auction_state.bids[i].bid.delegators[j].staked_amount / 1000000000);
              total_staked += staked_amount;
            }
          }
        }
        if (!this.loaded_validators){
          this.loaded_validators = true;
          let validators_data = [];
          await axios.post('https://api.blockshark.net:3399/getValidators',{}).then(resp => {
              console.log(resp);
              validators_data = resp.data.validators;
          });
          this.setState({
            validators_data:validators_data,
            validators_data_temp:validators_data
          });
        }
        this.setState({
          valid_validators:valid_validators,
          total_staked:total_staked
        });
    }

    await axios.get('https://api.cspr.live/supply').then(resp => {
        circulating = resp.data.data.circulating;
        totalSupply = resp.data.data.total;
    });
    let price = 0;
    await axios.get('https://api.huobi.pro/market/detail/merged?symbol=csprusdt').then(resp => {
        price = resp.data.tick.close;
    });
    this.setState({
      validatorsInfo:validatorsInfo,
      status:status,
      circulating:circulating,
      totalSupply:totalSupply,
      price:price
    });

  }
  calculateTotalStake(selfStaked,delegators){
    if (!delegators) return utils.numberWithCommasKMB(parseFloat(selfStaked/1e9).toFixed(3));
    let delegator_count = delegators.length;
    let total_staked =0;
    for (let j=0;j<delegator_count;j++){
      total_staked += delegators[j].staked_amount/1e9;
    }
    return utils.numberWithCommasKMB(parseFloat(total_staked+selfStaked/1e9).toFixed(3));
  }

  async componentWillUnmount(){
    clearInterval(this.intervalHandle);
  }

  async componentDidMount() {
    this.tick();

  }
  selectValidator(public_key){
    window.localStorage.setItem("public_key",public_key);
    window.location.href = "#/validator/"+public_key;
  }

  async changeStakedAmount(e){
    this.setState({
      user_staked_amount:e.target.value
    });

  }

  async changeSearch(e){
    this.setState({
      search:e.target.value
    });
    if (e.target.value === "") {
      this.setState({
        validators_data_temp:this.state.validators_data
      });
      return;
    }
    let validators_data = this.state.validators_data;
    validators_data = validators_data.filter(validator => (validator.name.toLowerCase().includes(e.target.value.toLowerCase()) || validator.public_key.toLowerCase().includes(e.target.value.toLowerCase())));
    this.setState({
      validators_data_temp:validators_data
    });
  }

  async sort(type,sort){
    let validators = this.state.validators_data;
    if (type === 1){
      if (sort === 0){
        validators.sort(function (a, b) {
          return b.currentRewardRatio - a.currentRewardRatio;
        });
        this.setState({
          sort_type1:1,
          sort_type5:-1,
          sort_type0:-1,
          sort_type2:-1,
          sort_type3:-1,
          sort_type4:-1,
        });
      }
      else {
        validators.sort(function (a, b) {
          return a.currentRewardRatio - b.currentRewardRatio;
        });
        this.setState({sort_type1:0,
          sort_type0:-1,
          sort_type5:-1,
          sort_type2:-1,
          sort_type3:-1,
          sort_type4:-1,});
      }
    }
    else if (type === 0){
      if (sort === 0){
        validators.sort(function (a, b) {
          return b.delegation_rate - a.delegation_rate;
        });
        this.setState({sort_type0:1,
          sort_type1:-1,
          sort_type5:-1,
          sort_type2:-1,
          sort_type3:-1,
          sort_type4:-1,});
      }
      else {
        validators.sort(function (a, b) {
          return a.delegation_rate - b.delegation_rate;
        });
        this.setState({sort_type0:0,
          sort_type1:-1,
          sort_type5:-1,
          sort_type2:-1,
          sort_type3:-1,
          sort_type4:-1,});
      }
    }
    else if (type === 2){
      if (sort === 0){
        validators.sort(function (a, b) {
          return b.delegators.length - a.delegators.length;
        });
        this.setState({sort_type2:1,
          sort_type0:-1,
          sort_type5:-1,
          sort_type1:-1,
          sort_type3:-1,
          sort_type4:-1,});
      }
      else {
        validators.sort(function (a, b) {
          return a.delegators.length - b.delegators.length;
        });
        this.setState({sort_type2:0,
          sort_type0:-1,
          sort_type5:-1,
          sort_type1:-1,
          sort_type3:-1,
          sort_type4:-1,});
      }
    }
    else if (type === 5){
      if (sort === 0){
        validators.sort(function (a, b) {
          return b.uptime - a.uptime;
        });
        this.setState({sort_type5:1,
          sort_type0:-1,
          sort_type1:-1,
          sort_type2:-1,
          sort_type3:-1,
          sort_type4:-1,});
      }
      else {
        validators.sort(function (a, b) {
          return a.uptime - b.uptime;
        });
        this.setState({sort_type5:0,
          sort_type0:-1,
          sort_type1:-1,
          sort_type2:-1,
          sort_type3:-1,
          sort_type4:-1,});
      }
    }
    else if (type === 3){
      if (sort === 0){
        validators.sort(function (a, b) {
          return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
        });
        this.setState({sort_type3:1,
          sort_type0:-1,
          sort_type5:-1,
          sort_type2:-1,
          sort_type1:-1,
          sort_type4:-1,});
      }
      else {
        validators.sort(function (a, b) {
          return b.name.localeCompare(a.name, 'en', { sensitivity: 'base' });
        });
        this.setState({sort_type3:0,
          sort_type0:-1,
          sort_type5:-1,
          sort_type2:-1,
          sort_type1:-1,
          sort_type4:-1,});
      }
    }
    else if (type === 4){
      if (sort === 0){
        validators.sort(function (a, b) {
          return a.public_key.localeCompare(b.public_key, 'en', { sensitivity: 'base' });
        });
        this.setState({sort_type4:1,
          sort_type0:-1,
          sort_type5:-1,
          sort_type2:-1,
          sort_type3:-1,
          sort_type1:-1,});
      }
      else {
        validators.sort(function (a, b) {
          return b.public_key.localeCompare(a.public_key, 'en', { sensitivity: 'base' });
        });
        this.setState({sort_type4:0,
          sort_type0:-1,
          sort_type5:-1,
          sort_type2:-1,
          sort_type3:-1,
          sort_type1:-1,});
      }
    }
    this.setState({validators_data:validators});
  }

  render() {
    return (
      <div>
          <section className="site-section bg-light" id="contact-section">
            <div className="container" style={{marginTop:"50px"}}>
              <div className="row mb-3">
                <div className="col-12 text-center">
                  <h3 className="section-sub-title">CASPER NETWORK STATISTICS</h3>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-3">
                  <form action="#" className="p-3 bg-white text-center">
                    <h3 className="section-sub-title">BLOCK HEIGHT</h3>
                    <h3 className="section-title"><strong>{this.state.status ? utils.numberWithCommas(this.state.status.last_added_block_info.height) : '...' }</strong></h3>
                  </form>
                </div>
                <div className="col-md-2">
                  <form action="#" className="p-3 bg-white text-center">
                    <h3 className="section-sub-title">ERA</h3>
                    <h3 className="section-title"><strong>{this.state.status ? utils.numberWithCommas(this.state.status.last_added_block_info.era_id) : '...' }</strong></h3>
                  </form>
                </div>
                <div className="col-md-3">
                  <form action="#" className="p-3 bg-white text-center">
                    <h3 className="section-sub-title">CSPR PRICE</h3>
                    <h3 className="section-title">{this.state.price !== 0 ? this.state.price : "..."} <span className="section-sub-title">$</span></h3>
                  </form>
                </div>
                <div className="col-md-2">
                  <form action="#" className="p-3 bg-white text-center">
                    <h3 className="section-sub-title">VALIDATORS</h3>
                    <h3 className="section-title"><strong>{this.state.validatorsInfo ? this.state.valid_validators : '...'}</strong></h3>
                  </form>
                </div>
                <div className="col-md-2">
                  <form action="#" className="p-3 bg-white text-center">
                    <h3 className="section-sub-title">NODES</h3>
                    <h3 className="section-title"><strong>{this.state.status ? this.state.status.peers.length : '...' }</strong></h3>
                  </form>
                </div>
              </div>
              <div className="row mb-5">
                <div className="col-md-4">
                  <form action="#" className="p-3 bg-white text-center">
                    <h3 className="section-sub-title">TOTAL STAKED</h3>
                    <h3 className="section-title"><strong>{this.state.validatorsInfo ? utils.numberWithCommas(parseInt(this.state.total_staked)) : '...' }</strong></h3>
                  </form>
                </div>
                <div className="col-md-4">
                  <form action="#" className="p-3 bg-white text-center">
                    <h3 className="section-sub-title">TOTAL CIRCULATING</h3>
                    <h3 className="section-title"><strong>{this.state.status ? utils.numberWithCommas(this.state.circulating) : '...' }</strong></h3>
                  </form>
                </div>
                <div className="col-md-4">
                  <form action="#" className="p-3 bg-white text-center">
                    <h3 className="section-sub-title">TOTAL CSPR</h3>
                    <h3 className="section-title"><strong>{this.state.status ? utils.numberWithCommas(this.state.totalSupply) : '...' }</strong></h3>
                  </form>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-12 text-center">
                <h3 className="section-sub-title">CASPER PROFIT CALCULATOR FROM YOUR STAKE BONDED CSPR</h3>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6 mb-1">
                  <form action="#" className="p-5 bg-white">
                    <div className="row form-group">
                      <div className="col-md-12 text-center" >

                          <h3 className="section-sub-title">SUPPORT US</h3>
                          <p>Validator Node Name: <a href='https://blockshark.net'>BLOCKSHARK.NET</a></p>
                          <p>Commission: <a href='https://blockshark.net'>1%</a></p>
                          <p>Address: <a href='https://cspr.live/validator/01791a70eece8f8e0e3d28d3f1b3abd5f86ce7732445501ed70c54759947d21153' target="_blank">{utils.truncateStr("01791a70eece8f8e0e3d28d3f1b3abd5f86ce7732445501ed70c54759947d21153",9)}</a></p>
                          <a href='https://cspr.live/delegate-stake?validatorPublicKey=01791a70eece8f8e0e3d28d3f1b3abd5f86ce7732445501ed70c54759947d21153' className="btn btn-primary" target="_blank">STAKE NOW</a>
                      </div>
                    </div>
                  </form>
                </div>
                <div className="col-md-6 mb-2">
                  <form action="#" className="p-5 bg-white">
                    <div className="row form-group">
                      <div className="col-md-12">
                          <h3 className="section-sub-title">NOTES:</h3>
                          <p>1. Staking (bond) requires 1 ERA (2 hours) to take affect</p>
                          <p>2. Unstaking (unbond) requires 7 ERA (14 hours) to take affect</p>
                          <p>3. Rewards are distributed at the end of each era and automatically staked give CSPR stakers COMPOUNDING POWER</p>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
              <div className="row mb-5">
                <div className="col-md-6 text-center">
                  <form action="#" className="p-3 bg-white">
                    <div className="row form-group">
                      <div className="col-md-12">
                        <p><strong>Enter Your Staked Amount in CSPR</strong></p>
                        <input type="number" name="staked_amount" value={this.state.user_staked_amount} className="form-control" onChange={(e)=>this.changeStakedAmount(e)} />
                        <p style={{color:"red"}}>* Check <strong>Daily Reward</strong> column in the validator list for estimated earnings</p>
                      </div>
                    </div>
                  </form>
                </div>
                <div className="col-md-6 text-center">
                  <form action="#" className="p-3 bg-white">
                    <div className="row form-group">
                      <div className="col-md-12">
                        <p><strong>Search Validator by Name/Address</strong></p>
                        <input type="text" name="search" placeholder="Blockshark" value={this.state.search} className="form-control" onChange={(e)=>this.changeSearch(e)} />
                      </div>
                    </div>
                  </form>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-12 text-center">
                  <h3 className="section-sub-title">Validator List</h3>
                  <a href={void(0)} className="btn btn-primary" onClick={()=>this.sort(3,this.state.sort_type3)}>Sort by Name</a>
                  <a href={void(0)} className="btn btn-primary" onClick={()=>this.sort(4,this.state.sort_type4)}>Sort by Address</a>
                  <a href={void(0)} className="btn btn-primary" onClick={()=>this.sort(2,this.state.sort_type2)}>Sort by Stakers</a>
                  <a href={void(0)} className="btn btn-primary" onClick={()=>this.sort(0,this.state.sort_type0)}>Sort by Comm</a>
                  <a href={void(0)} className="btn btn-primary" onClick={()=>this.sort(1,this.state.sort_type1)}>Sort by Reward</a>
                  <a href={void(0)} className="btn btn-primary" onClick={()=>this.sort(5,this.state.sort_type5)}>Sort by Uptime</a>
                  <br/>
                </div>
              </div>
              <div className="row mb-5">
                  <div className="col-md-12 mb-1 text-center">
                    <form action="#" className="p-3 bg-white">
                      <Table style={{width: "100%"}}>
                          <Thead>
                              <Tr>
                                  <Th>Trusted?</Th>
                                  <Th onClick={()=>this.sort(3,this.state.sort_type3)}>Name {this.state.sort_type3 === 0 ? "▼" : this.state.sort_type3 === 1 ? "▲" : null}</Th>
                                  <Th onClick={()=>this.sort(4,this.state.sort_type4)}>Address {this.state.sort_type4 === 0 ? "▼" : this.state.sort_type4 === 1 ? "▲" : null}</Th>
                                  <Th>Status</Th>
                                  <Th onClick={()=>this.sort(5,this.state.sort_type5)}>Uptime {this.state.sort_type5 === 0 ? "▼" : this.state.sort_type5 === 1 ? "▲" : null}</Th>
                                  <Th onClick={()=>this.sort(2,this.state.sort_type2)}>Stakers {this.state.sort_type2 === 0 ? "▼" : this.state.sort_type2 === 1 ? "▲" : null}</Th>
                                  <Th>Total Staked</Th>
                                  <Th onClick={()=>this.sort(0,this.state.sort_type0)}>Comm {this.state.sort_type0 === 0 ? "▼" : this.state.sort_type0 === 1 ? "▲" : null}</Th>
                                  <Th onClick={()=>this.sort(1,this.state.sort_type1)}>Daily Reward {this.state.sort_type1 === 0 ? "▼" : this.state.sort_type1 === 1 ? "▲" : null}</Th>
                                  <Th>APY</Th>
                                  <Th></Th>
                              </Tr>
                          </Thead>
                          <Tbody>
                            {!this.state.validatorsInfo ? "..." : ''}
                            {this.state.validatorsInfo ?
                              this.state.validators_data_temp.map((validator, index) => (
                                  <Tr key={index+1}>
                                    <Td>{validator.isTrusted ? "✅" : "👽"}</Td>
                                    <Td>
                                      {validator.website !== "" ?
                                        <a href = {validator.website} target='_blank'  >{validator.name !== "" ? validator.name : "Not Set" }</a>
                                      :
                                        validator.name !== "" ? validator.name : "Not Set"
                                      }
                                    </Td>
                                    <Td><a href = {'https://cspr.live/validator/'+validator.public_key} target='_blank'  >{utils.truncateStr(validator.public_key,5)}</a></Td>
                                    <Td><span style={{color: validator.isActive? "red" : "green"}} >{!validator.isActive ? "ACTIVE" : "INACTIVE"}</span></Td>
                                    <Td><span style={{color:validator.uptime <=0.8 ? "red" : validator.uptime <=0.9 ?"orange" :"green"}}>{parseInt(validator.uptime * 100)} %</span></Td>
                                    <Td>{validator.delegators.length}</Td>
                                    <Td>{this.calculateTotalStake(validator.staked_amount,validator.delegators)}</Td>
                                    <Td><span style={{color:validator.delegation_rate >=30 ? "red" : validator.delegation_rate >=15 ?"orange" :"green"}}>{validator.delegation_rate} %</span></Td>
                                    <Td>{validator.delegation_rate === 100 ? 0 : parseFloat(validator.currentRewardRatio*this.state.user_staked_amount * 12).toFixed(5)} CSPR</Td>
                                    <Td>{validator.delegation_rate === 100 ? 0 : parseFloat(validator.currentRewardRatio * 12 * 365 * 100).toFixed(5)} %</Td>
                                    <Td><a href={void(0)} className="btn btn-primary" onClick={()=>this.selectValidator(validator.public_key)}>More Info</a></Td>
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
                <h3 className="section-sub-title">Created by <strong><a href="https://blockshark.net" target="_blank">Blockshark.net</a></strong> team to support Casper Network. 2021</h3>
              </div>
            </div>
          </section>
      </div>
    );
  }
}
