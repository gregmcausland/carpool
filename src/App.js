import React, { Component } from 'react';
import { Firebase } from './components/Firebase';
import './App.css';

const stv = {lat: 55.856850, lng: -4.285454};
const google = window.google;

const user = Number(window.location.href.split('?')[1]);

class App extends Component {
  constructor() {
    super();
    this.state = { 
      people: [],
      totalDistanceInMetres: 0,
      totalTimeInSeconds: 0,
    };
  }

  liveMarkers = [];
  loggedInId = user || 1;

  updateRoute({ people }) {
    console.log('CALLED');
    const activeUser = people[this.personLookup(this.loggedInId)];

    if ( activeUser ) {
      const pool = activeUser.pool || [];
      this.setRoute({ 
        origin: { lat: activeUser.latitude, lng: activeUser.longitude },
        waypoints: pool
          .map(({ id }) => people[this.personLookup(id)])
          .map(person => ({ 
            location: { lat: person.latitude, lng: person.longitude } 
          })),
      });
    }
  }

  componentDidMount() {
    this.initMap();
    const { updateUser } = Firebase({ 
      onChange: res => {
        if (res.res) this.setState({ people: res.res });
        this.updateRoute({ people: res.res });
      },
      onLoad: res => this.addAvailablePeople({ people: res.res }),
    });

    this.updateUser = updateUser.bind(this);
  }

  render() {
    const pane = {
    }

    const theList = {
      background: '#fff',
      padding: '8px',
    }

    const detailsSection = {
      padding: '8px',
    }

    const listItem = {
      display: 'flex',
      padding: '8px',
      transition: '1s ease all'
    }

    const heading = {
      margin: 0,
    }

    const image = {
      width: '80px',
      height: '80px',
    }

    const journeyStats = {
      position: 'absolute',
      bottom: '16px',
      right: '16px',
      padding: '10px',
      background: 'rgba(0,0,0,.7)',
      zIndex: '99999999',
      color: '#fff',
    }

    const activeUser = this.state.people[this.personLookup(this.loggedInId)] || {};

    const personTest = activeUser.driver
      ? person => !person.driver
      : person => person.driver && person.pool && 
        personInPool({ pool: person.pool, personId: activeUser._id });

    const people = this.state.people
      .filter(person => Number(person._id) !== this.loggedInId)
      .filter(personTest) 
      .map(person => {
        const pool = activeUser.pool || [];

        const inPool = personInPool({ pool, personId: person._id });
        const optionalStyles = inPool
            ? inPool.accepted 
              ? { background: 'lime' }
              : { background: 'grey' } 
            : {};
        
        const inviteButton = 
            <button onClick={() => this.invitePerson(person._id)}>
              {inPool 
                ? inPool.accepted
                  ? 'Remove Passenger'
                  : 'Cancel Invite' 
                : 'Invite Passenger' }
            </button>;

        const acceptButton = <button onClick={() => this.acceptInvite(person._id)}>
              Accept invitation.
            </button>

        return <li key={person._id} style={{ ...listItem, ...optionalStyles}}>
          <div>
            <img src={person.picture} alt={person.name} style={image} />
          </div>
          <div style={detailsSection}>
            <h3 style={heading}>{person.name}</h3>
            <ul>
              <li>p:{person.phone}</li> 
            </ul>
          </div>
          <div>
            {activeUser.driver ? inviteButton : acceptButton}
          </div>
        </li>
      });

    return <div style={pane}>
      <ul style={theList}>{people}</ul>
      <div style={journeyStats}>
        Estimated cost: <strong>&pound;{Math.ceil(this.state.totalDistanceInMetres / 1000 * .15) }</strong>, 
        Distance: <strong>{Math.ceil(this.state.totalDistanceInMetres / 1000)}km</strong>, 
        Journey time: <strong>{Math.ceil(this.state.totalTimeInSeconds/60)}min</strong>
      </div>
    </div>;
  }

  personLookup(id) {
    return this.state.people
      .findIndex(person => Number(person._id) === Number(id));
  }

  acceptInvite(id) {
    const userIndex = this.personLookup(id);
    const driverData = this.state.people[userIndex];

    this.updateUser({
      userIndex,
      payload: {
        ...driverData,
        pool: driverData.pool.map(entry => {
          return (Number(entry.id) === this.loggedInId)
            ? { ...entry, accepted: true }
            : entry;
        })
      }
    })
  }

  invitePerson(id) {
    const userIndex = this.personLookup(this.loggedInId);
    const driverData = this.state.people[userIndex];
    const passengerId = Number(id);

    const newPassengerObj = { id: passengerId, accepted: false };

    const pool = driverData.pool
      ? personInPool({ pool: driverData.pool, personId: passengerId })
        ? driverData.pool.filter(pass => pass.id !== passengerId)
        : [ ...driverData.pool, newPassengerObj ]
      : [ newPassengerObj ];
      
    this.updateUser({
      userIndex,
      payload: { 
        ...driverData,
        pool
      }
    })
  }

  initMap() {
    this.directionsDisplay = new google.maps.DirectionsRenderer({ suppressMarkers: true });
    this.directionsService = new google.maps.DirectionsService();

    this.map = new google.maps.Map(document.getElementById('map'));

    const imageURL = 'http://i.imgur.com/BO2hPYN.png';
    new google.maps.Marker( {
      position: stv,
      map: this.map,
      icon: imageURL
    });

    this.directionsDisplay.setMap(this.map);
  }

  addAvailablePeople({ people = [] }) {
    // This would do smart lookups on map and route data
    // faking for now. 
    people
    .forEach(person => {
      let infoWindow = new google.maps.InfoWindow({
        content: `${person.name}, ${person._id}`,
      });

      let marker = new google.maps.Marker({
        position: { lat: Number(person.latitude), lng: Number(person.longitude) },
        map: this.map,
        title: person.name,
      });

      marker.addListener('mouseover', 
        evt => infoWindow.open(this.map, marker));

      marker.addListener('mouseout',
        evt => infoWindow.close());

      this.liveMarkers.push(marker);
    })
  }

  setRoute({ waypoints, origin }) {
    const request = {
      waypoints,
      origin: `${origin.lat},${origin.lng}`,
      destination: stv,
      travelMode: 'DRIVING',
      optimizeWaypoints: true,
    };

    this.directionsService.route(request, (result, status) => {
      if (status === 'OK') {
        this.directionsDisplay.setDirections(result);

        const legs = result.routes[0].legs;

        this.setState({ 
          totalDistanceInMetres: legs
            .reduce((total, nextLeg) => total + nextLeg.distance.value, 0),
          totalTimeInSeconds: legs
            .reduce((total, nextLeg) => total + nextLeg.duration.value, 0),
        });
      } else {
        console.log(status)
      }
    });
  }

}

export default App;


function personInPool({ pool, personId }) {
  return pool.find(person => Number(person.id) === Number(personId));
}