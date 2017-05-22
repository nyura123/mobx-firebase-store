
import React, { Component, PropTypes } from 'react';

import css from './cal.css';

const styles = {
  eventGrid: {
    display: 'grid',
    gridAutoColumns: 'minmax(100px, auto)',
    border: '1px solid blue',
    gridAutoRows: '100px'
  },
  event: {
    border: '1px solid darkgreen'
  },
  hourLabelCell: {
    height: '100px',
    display: 'flex',
    alignItems: 'center',
    border: '1px solid red',
    boxSizing: 'border-box',
    backgroundColor: 'rgba(0,0,255,.4)'
  },
  container: {
    display:'grid',
    gridTemplateColumns:'50px 1fr'
  },
}

export default class Cal extends Component {
  render() {
    return (
      <div className="my-calendar-container">
        <div>
          <div className="hour-label">1pm</div>
          <div className="hour-label">2pm</div>
          <div className="hour-label">3pm</div>
          <div className="hour-label">4pm</div>
          <div className="hour-label">5pm</div>
          <div className="hour-label">6pm</div>
          <div className="hour-label">7pm</div>
          <div className="hour-label">8pm</div>
          <div className="hour-label">9pm</div>
          <div className="hour-label">10pm</div>
        </div>

        <div className="event-grid">
          <div className="event start1 end3">1pm-3pm</div>
          <div className="event start2 end5">2pm-5pm</div>
          <div className="event start1 end3">1pm-3pm</div>
          <div className="event start4 end5">4pm-5pm</div>
          <div className="event start4 end6">4pm-6pm</div>
        </div>

      </div>
    )
  }
}

