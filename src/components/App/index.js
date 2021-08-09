import React, { Component } from "react";
import "./App.scss";
import {
  HashRouter,
  Route
} from 'react-router-dom';

import Home from '../Home';
import Nav from '../Nav';
import ValidatorInfo from '../ValidatorInfo';
import Account from '../Account';
import Contact from '../Contact';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
    };
    this.loading= true;
    this.tick = this.tick.bind(this);
    this.intervalHandle = null;

  }

  async tick() {
  }

  async componentWillUnmount(){
    //console.log("unmounted");
    //clearInterval(this.intervalHandle);
  }

  async componentDidMount() {
    //this.intervalHandle = setInterval(this.tick, 200);
  }

  render() {
    return (
        <div>
          <Nav />
          <HashRouter>
              <div>
                <Route path="/" exact component={Home} />
                <Route path="/home" component={Home} />
                <Route path="/validator/:id" component={ValidatorInfo} />
                <Route path="/account/:id" component={Account} />
                <Route path="/contact" component={Contact} />
              </div>
          </HashRouter >
        </div>
      );
  }
}

export default App;
