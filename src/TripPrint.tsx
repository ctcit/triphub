import * as React from 'react';
import { Component } from 'react';
import { App } from './App';
import { Trip } from './Trip';
import { GetFullDate, GetLength } from './Utilities';
import './index.css';
import './print.css';

export class TripPrint extends Component<{
        trip: Trip
        app: App
        canWaitList?: boolean
        canUnwaitList?: boolean
    },{
      id?: string
    }> {

    public render() {
        const trip = this.props.trip.state.trip
        const info = this.props.trip.getParticipantsInfo()
        const participants = info.early
        const leaders = participants.filter(p => p.isLeader)
        const blanks = []

        for (let i = participants.length; i < Math.min(info.maxParticipants, this.props.app.state.config.printLines); i++) {
            blanks.push('blank' + i);
        }

        return (
            <div className='printabletriplist print-only'>
                <h1>Christchurch Tramping Club Trip List</h1>
                <h2>{trip.title}</h2>
                <table className='triplistparams'>
                    <tbody>
                        <tr>
                            <th>Leader:</th>
                            <td>
                                {leaders.map(l=><div key={l.id}>{l.name}</div>)}
                            </td>
                            <th>Date:</th>
                            <td>{GetFullDate(trip.tripDate)}</td>
                            <th>Length:</th>
                            <td>{GetLength(trip.length)}</td>
                        </tr>
                    </tbody>
                </table>
                <h2>Participants</h2>
                <table className='participants'>
                    <thead>
                        <tr>
                            <th className='namecol'>Name</th>
                            <th className='emailcol'>Email</th>
                            <th className='phonecol'>Phone</th>
                            <th className='carcol'>Car?</th>
                            <th className='plbcol'>PLB?</th>
                        </tr>
                    </thead>
                    <tbody>
                        {participants.map(p =>
                            <tr key={p.id}>
                                <td>{p.name}</td>
                                <td>{p.email}</td>
                                <td>{p.phone}</td>
                                <td><span hidden={!p.isVehicleProvider} className='fa fa-check'/></td>
                                <td><span hidden={!p.isPlbProvider} className='fa fa-check'/></td>
                            </tr>
                        )}
                        {blanks.map(b =>
                            <tr key={b}>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <div>&nbsp;</div>
                <table className='footertable'>
                    <thead>
                        <tr>
                            <th className='notecolheader'>Notes</th>
                            <th className='numberplateheader'>Number plates</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                {participants.filter(p => (p.logisticInfo || '') !== '').map(p =>
                                    <div key={p.id}>{p.name}: {p.logisticInfo}</div>
                                )}
                            </td>
                            <td>
                                {participants.filter(p => p.isVehicleProvider).map(p =>
                                    <div key={p.id}>{p.name}: {p.vehicleRego}</div>
                                )}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>            
        )
    }
}

