
import React, { Component } from "react";
export default class Contact extends Component {
  constructor(props) {
    super(props);
    this.state = {
    }
  }

  async componentWillUnmount(){
  }

  async componentDidMount() {
  }

  render() {
    return (
      <div>
      <section className="site-section bg-light" id="contact-section">
        <div className="container" style={{marginTop:"50px"}}>
          <div className="row mb-3">
            <div className="col-12 text-center">
              <h3 className="section-sub-title">CONTACT US</h3>
            </div>
          </div>
          <div className="row mb-5">
            <div className="col-md-12 mb-1">
              <form action="#" className="p-3 bg-white">
              <p>If you have any feedback or want to add your validator information to the list, please send me an email <strong>nad128668 [at] gmail.com</strong> or contact me on Discord <strong>@NAD010286#6785</strong></p>
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
};
