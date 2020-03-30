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
        const participants = info.current
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
                            <th className='bordercell namecol'>Name</th>
                            <th className='bordercell emailcol'>Email</th>
                            <th className='bordercell phonecol'>Phone</th>
                            <th className='bordercell carcol'>Car?</th>
                            <th className='bordercell plbcol'>PLB?</th>
                        </tr>
                    </thead>
                    <tbody>
                        {participants.map(p =>
                            <tr key={p.id}>
                                <td className='bordercell'>{p.name}</td>
                                <td className='bordercell'>{p.email}</td>
                                <td className='bordercell'>{p.phone}</td>
                                <td className='bordercell'><span hidden={!p.isVehicleProvider} className='fa fa-check'/></td>
                                <td className='bordercell'><span hidden={!p.isPlbProvider} className='fa fa-check'/></td>
                            </tr>
                        )}
                        {blanks.map(b =>
                            <tr key={b}>
                                <td className='bordercell'>&nbsp;</td>
                                <td className='bordercell'>&nbsp;</td>
                                <td className='bordercell'>&nbsp;</td>
                                <td className='bordercell'>&nbsp;</td>
                                <td className='bordercell'>&nbsp;</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <div>&nbsp;</div>
                <table className='footertable'>
                    <thead>
                        <tr>
                            <th className='logisticinfo'>Notes</th>
                            <th className='vehiclerego'>Number plates</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className='logisticinfo'>
                                <div key={0}>{trip.logisticInfo}</div>
                                {participants.filter(p => (p.logisticInfo || '') !== '').map(p =>
                                    <div key={p.id}>{p.name}: {p.logisticInfo}</div>
                                )}
                            </td>
                            <td className='vehiclerego'>
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

