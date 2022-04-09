import React, { Component } from 'react';
import DVideo from '../abis/DVideo.json';
import Navbar from './Navbar';
import Main from './Main';
import Web3 from 'web3';
import './App.css';

const ipfsClient = require('ipfs-http-client');
const ipfs = ipfsClient({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });

class App extends Component {

  async componentWillMount() {
    await this.loadWeb3()
    await this.loadBlockchainData()
  }

  async loadWeb3() {
    if (window.ethereum) {
      window.ethereum.request({ method: "eth_requestAccounts" });
      window.web3 = new Web3(window.ethereum);
    } else {
      window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
    }
  }

  async loadBlockchainData() {
    
    const web3 = window.web3
    
    const accounts = await web3.eth.getAccounts();
    this.setState({ account: accounts[0] });

    const networkId = await web3.eth.net.getId();
    const networkData = DVideo.networks[networkId];
    
    if (networkData) {
      
      const dvideo = new web3.eth.Contract(DVideo.abi, networkData.address);
      const videoCount = await dvideo.methods.videoCount().call();
      this.setState({ dvideo, videoCount });

      for (let i = videoCount; i >= 1; i--) {
        const video = await dvideo.methods.videos(i).call();
        if (video.hash !== "") {
          this.setState({ videos: [...this.state.videos, video] });
        }
      }

      const latest = await dvideo.methods.videos(videoCount).call();;

      this.setState({
        currentVideo: latest
      });

      this.setState({ loading: false });

    } else {
      window.alert("DVideo contract is not deployed to the detected network.")
    }
  }

  
  captureFile = (event) => {

    event.preventDefault();

    const file = event.target.files[0];

    const reader = new window.FileReader();
    
    reader.readAsArrayBuffer(file);

    reader.onloadend = () => {
      this.setState({ buffer: Buffer(reader.result) });
    }
  }
  
  uploadVideo = (title) => {

    ipfs.add(this.state.buffer, (error, result) => { 
      
      if (error) {
        console.log(error);
        return;
      }

      this.setState({ loading: true });

      this.state.dvideo.methods.uploadVideo(result[0].hash, title)
        .send({ from: this.state.account })
        .on("transactionHash", (hash) => {
          setTimeout(() => {
            window.location.reload(false);
            this.setState({ loading: false });            
          }, 1000);
        });
    });
  }

  changeVideo = (video) => {
    this.setState({
      currentVideo: video
    });
  }

  deleteVideo = (id) => {

    this.setState({ loading: true });

    this.state.dvideo.methods.deleteVideo(id)
        .send({ from: this.state.account })
        .on("transactionHash", (hash) => {
          setTimeout(() => {
            window.location.reload(false);
            this.setState({ loading: false });            
          }, 1000);
        });
  }

  constructor(props) {
    super(props)
    this.state = {
      buffer: null,
      account: "",
      dvideo: null,
      videos: [],
      loading: true,
      currentVideo: null
    }
  }

  render() {
    return (
      <div>
        <Navbar 
          account = {this.state.account}
        />
        { this.state.loading
          ? <div id="loader" className="text-center mt-5"><p>Loading...</p></div>
          : <Main
              account = {this.state.account}
              videos = {this.state.videos}
              captureFile = {this.captureFile}
              uploadVideo = {this.uploadVideo}
              changeVideo = {this.changeVideo}
              currentVideo = {this.state.currentVideo}
              deleteVideo = {this.deleteVideo}
            />
        }
      </div>
    );
  }
}

export default App;