// Copyright (c) 2018 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import { connect } from 'react-redux';
import KeplerGlSchema from 'kepler.gl/schemas';
import Processors from 'kepler.gl/processors';
import React, { Component } from 'react';
import styled from 'styled-components';
import { updateVisData, addDataToMap } from 'kepler.gl/actions';
import window from 'global/window';

import Button from './button';
import config from '../config';
import downloadJsonFile from "./file-download";
import { loadSampleConfigurations } from './actions';
import { replaceLoadDataModal } from './factories/load-data-modal';

const KeplerGl = require('kepler.gl/components').injectComponents([
  replaceLoadDataModal()
]);
const MAPBOX_TOKEN = process.env.MapboxAccessToken; // eslint-disable-line

const client_url = location.origin; // will be something like http://localhost:8080
const server_url = client_url.substr(0, client_url.length - 4) + config.server_port; // change that to http://localhost:5000

// Sample data
/* eslint-disable no-unused-vars */
import sampleGeojson from './data/sample-geojson.json';
import sampleH3Data from './data/sample-hex-id-csv';
import sampleIconCsv, { config as savedMapConfig } from './data/sample-icon-csv';
import sampleTripData from './data/sample-trip-data';
/* eslint-enable no-unused-vars */

const GlobalStyleDiv = styled.div`
  font-family: ff-clan-web-pro, 'Helvetica Neue', Helvetica, sans-serif;
  font-weight: 400;
  font-size: 0.875em;
  line-height: 1.71429;

  *,
  *:before,
  *:after {
    -webkit-box-sizing: border-box;
    -moz-box-sizing: border-box;
    box-sizing: border-box;
  }
`;

class App extends Component {
  state = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  componentWillMount() {
    // if we pass an id as part of the url
    // we try to fetch along map configurations
    const { params: { id: sampleMapId } = {} } = this.props;
    // const {user} = this.props;
    const user = config.user;
    const sampleMapsUrl = `${server_url}/api/${user}/samples`;
    this.props.dispatch(loadSampleConfigurations(sampleMapsUrl, sampleMapId));
    window.addEventListener('resize', this._onResize);
    this._onResize();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this._onResize);
  }

  _onResize = () => {
    this.setState({
      width: window.innerWidth,
      height: window.innerHeight
    });
  };

  _loadSampleData() {
    this.props.dispatch(
      updateVisData(
        // datasets
        {
          info: {
            label: 'Sample Taxi Trips in New York City',
            id: 'test_trip_data'
          },
          data: sampleTripData
        },
        // option
        {
          centerMap: true,
          readOnly: false
        },
        // config
        {
          filters: [
            {
              id: 'me',
              dataId: 'test_trip_data',
              name: 'tpep_pickup_datetime',
              type: 'timeRange',
              enlarged: true
            }
          ]
        }
      )
    );

    // load icon data and config and process csv file
    this.props.dispatch(
      addDataToMap({
        datasets: [
          {
            info: {
              label: 'Icon Data',
              id: 'test_icon_data'
            },
            data: Processors.processCsvData(sampleIconCsv)
          }
        ],
        options: {
          centerMap: false
        },
        config: savedMapConfig
      })
    );

    // load geojson
    this.props.dispatch(
      updateVisData({
        info: { label: 'SF Zip Geo' },
        data: Processors.processGeojson(sampleGeojson)
      })
    );

    // load h3 hexagon
    this.props.dispatch(
      addDataToMap({
        datasets: [
          {
            info: {
              label: 'H3 Hexagons V2',
              id: 'h3-hex-id'
            },
            data: Processors.processCsvData(sampleH3Data)
          }
        ]
      })
    );
  }

  getMapConfig() {
    // retrieve kepler.gl store
    const { keplerGl } = this.props.demo;
    // retrieve current kepler.gl instance store
    const { map } = keplerGl;
    // create the config object
    return {
      datasets: KeplerGlSchema.getDatasetToSave(map),
      config: KeplerGlSchema.getConfigToSave(map),
      info: { app: 'kepler.gl', created_at: new Date() }
    };
  }

  exportMapConfig = () => {
    // create the config object
    const mapConfig = this.getMapConfig();
    const url = server_url + '/api/save';
    // Sending and receiving data in JSON format using POST method
    fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mapConfig)
    })
      .then(response => response.json())
      .then(body => alert(body.message));
    // // save it as a json file
    // downloadJsonFile(mapConfig, 'kepler.gl.json');
  };

  render() {
    const { width, height } = this.state;
    return (
      <GlobalStyleDiv>
        <div
          style={{
            transition: 'margin 1s, height 1s',
            position: 'absolute',
            width: '100%',
            height: '100%',
            marginTop: 0
          }}
        >
          <div className='overlay-buttons'>
            <Button onClick={this.exportMapConfig}>Save Config</Button>
          </div>
          <KeplerGl
            mapboxApiAccessToken={MAPBOX_TOKEN}
            id="map"
            /*
             * Specify path to keplerGl state, because it is not mount at the root
             */
            getState={state => state.demo.keplerGl}
            width={width}
            height={height}
          />
        </div>
      </GlobalStyleDiv>
    );
  }
}

const mapStateToProps = state => state;
const dispatchToProps = dispatch => ({ dispatch });

export default connect(
  mapStateToProps,
  dispatchToProps
)(App);
