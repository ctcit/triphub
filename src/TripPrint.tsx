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
      id?: string,
      isSaveOp?: boolean,
      isWaitlistOp?: boolean,
    }> {

    public render() {
        const trip = this.props.trip.state.trip
        const info = this.props.trip.getParticipantsInfo()
        const participants = info.current
        const leaders = participants.filter(p => p.is_leader)
        const blanks = []

        for (let i = participants.length; i < Math.min(info.max_participants, this.props.app.state.config.print_lines); i++) {
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
                            <td>{GetFullDate(trip.trip_date)}</td>
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
                                <td><span hidden={!p.is_vehicle_provider} className='fa fa-check'/></td>
                                <td><span hidden={!p.is_plb_provider} className='fa fa-check'/></td>
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
                                {participants.filter(p => (p.logistic_info || '') !== '').map(p =>
                                    <div key={p.id}>{p.name}: {p.logistic_info}</div>
                                )}
                            </td>
                            <td>
                                {participants.filter(p => p.is_vehicle_provider).map(p =>
                                    <div key={p.id}>{p.name}: {p.vehicle_rego}</div>
                                )}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>            
        )
    }
}

