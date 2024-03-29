import * as React from 'react'
import { Component } from 'react'
import { App } from './App'
import { Trip } from './Trip'
import { GetFullDate, GetLength } from './Utilities'
import './index.css'
import { ConfigService } from './Services/ConfigService'
import { IParticipantsInfo, ITrip } from './Interfaces'

export class TripPrint extends Component<{
    trip: ITrip
    participantsInfo: IParticipantsInfo
    canWaitList?: boolean
    canUnwaitList?: boolean
}, {
    id?: string
}> {

    public render() {
        const trip = this.props.trip
        const participantsInfo = this.props.participantsInfo
        const blanks = []
        const header = (text: string, len: number) => <th>{text + '\u00A0'.repeat(len - text.length)}</th>
        const logistics = participantsInfo.current.filter(p => (p.logisticInfo || '') !== '')
        const vehicles = participantsInfo.current.filter(p => p.isVehicleProvider)
        const footer = Math.max(logistics.length, vehicles.length)
        const printLines = ConfigService.Config.printLines

        for (let i = participantsInfo.current.length; i < Math.min(participantsInfo.maxParticipants, printLines - footer); i++) {
            blanks.push('blank' + i)
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
                                {participantsInfo.leaders.map(l => <div key={l.id}>{l.name}</div>)}
                            </td>
                            <th>Date:</th>
                            <td>{GetFullDate(trip.tripDate)}</td>
                            <th>Length:</th>
                            <td>{GetLength(trip.length, new Date(trip.tripDate))}</td>
                        </tr>
                    </tbody>
                </table>
                <h2>Participants</h2>
                <table className='participants'>
                    <thead>
                        <tr>
                            {header('Name', 40)}
                            {header('Email', 60)}
                            {header('Phone', 20)}
                            {header('Car?', 5)}
                            {header('PLB?', 5)}
                        </tr>
                    </thead>
                    <tbody>
                        {(participantsInfo.current).map(p =>
                            <tr key={p.id}>
                                <td>{p.name}</td>
                                <td>{p.email}</td>
                                <td>{p.phone}</td>
                                <td><span hidden={!p.isVehicleProvider} className='fa fa-check' /></td>
                                <td><span hidden={!p.isPlbProvider} className='fa fa-check' /></td>
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
                            {header('Notes', 90)}
                            {header('Number plates', 40)}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                {logistics.map(p => <div key={p.id}>{p.name}: {p.logisticInfo}</div>)}
                            </td>
                            <td>
                                {vehicles.map(p => <div key={p.id}>{p.name}: {p.vehicleRego}</div>)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        )
    }
}

