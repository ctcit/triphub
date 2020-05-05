import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import './index.css';
import { Component } from 'react';
import * as React from 'react';
import { App } from './App';
import { Button } from 'reactstrap';
import { BaseUrl } from '.';
import { ITrip, TripState } from './Interfaces';
import { GetDate, GetLength } from './Utilities';
import './index.css';
import { Expandable } from './Expandable';
import Table from 'reactstrap/lib/Table';
import { TriphubNavbar } from './TriphubNavBar';
import { ToolTipIcon } from './ToolTipIcon';
import { Spinner } from './Widgets';

class TripsLine extends Component<{
    owner: TripsGroup,
    trip: ITrip,
    },{}> {
    constructor(props: any){
        super(props)
        this.onClick = this.onClick.bind(this) 
    }

    public onClick() {
        this.props.owner.props.app.setPath('/trips/' + this.props.trip.id)
    }

    public render(){
        const app = this.props.owner.props.app
        const trip = this.props.trip
        const id = trip.id
        const isApproved = this.props.trip.isApproved
        const me = this.props.owner.props.app.getMe()
        let validation = app.validateTrip(trip).filter(i => !i.ok)

        const extractWarnings = (match:RegExp) => {
            const errors = validation.filter(i => match.test(i.id))
            validation = validation.filter(i => !match.test(i.id))
            return errors.map((e,i)=> <ToolTipIcon key={i} icon='warning' id={id + 'warning' + e.id + '_' + i} 
                                        tooltip={e.message} className='warning-icon'/>)
        }

        const tablerow = [
            <td key={'date' + id} onClick={this.onClick}>
                {GetDate(trip.tripDate)}{extractWarnings(/date/)}
            </td>,
            <td key={'length' + id} onClick={this.onClick} className='centered'>
                {GetLength(trip.length)}{extractWarnings(/length/)}
            </td>,
            <td key={'title' + id} onClick={this.onClick}>
                {trip.title}{extractWarnings(/title/)}
            </td>,
            <td key={'grade' + id} onClick={this.onClick} className='desktop-only'>
                <span hidden={!trip.isSocial}><ToolTipIcon id={'social' + id} icon='glass' tooltip='Social Event'/> </span>
                {trip.grade}{extractWarnings(/grade/)}
            </td>,
            <td key={'leaders' + id} onClick={this.onClick} hidden={!me.id} className='desktop-only'>
                {trip.leaders}{extractWarnings(/leaders/)}
            </td>,
            <td key={'role' + id} onClick={this.onClick} hidden={trip.tripState !== TripState.MyTrip}>
                {trip.role}{extractWarnings(/role/)}
            </td>,
            <td key={'approved' + id} onClick={this.onClick} hidden={trip.tripState !== TripState.SuggestedTrip} className='centered'>
                <ToolTipIcon id={'approvedicon' + id} icon={isApproved ? 'thumbs-o-up' : 'clock-o'} 
                    tooltip={isApproved ? 'This trip has been approved' : 'This trip is not yet approved'}/>
            </td>,
            <td key={'link' + id}>
                {extractWarnings(/./)}
                <Button color='link' onClick={this.onClick}>▶</Button>
            </td>
        ]

        return (
            <Expandable id={'trip' + id} tablerow={tablerow} expandClassName='mobile-only'>
                <div><strong>Grade: </strong>{trip.grade}</div>
                <div><strong>Leader: </strong>{trip.leaders}</div>
            </Expandable>
        )
    }
}

export class TripsGroup extends Component<{
    app: App
    trips: ITrip[]
    expanded: boolean
  },{
  }> {
  constructor(props: any){
      super(props)
  }

    public render(){

        const trips = this.props.trips
        const id = 'tg' + trips[0].tripState
        const me = this.props.app.getMe()

        return  (
            <Expandable key={id} id={id} expanded={this.props.expanded} 
            title={[TripState[trips[0].tripState].replace('Trip',' Trip') + (trips.length > 1 ? 's' : ''), 
                    <span key='count' className='trip-count'> ({trips.length})</span>]}>
                <Table className='TripGroup' size='sm' striped={true}>
                    <thead>
                        <tr>
                            <th className='mobile-only'/>
                            <th>Date</th>
                            <th className='centered'>Length</th>
                            <th>Title</th>
                            <th className='desktop-only'>Grade</th>
                            <th hidden={!me.id} className='desktop-only'>Leader</th>
                            <th hidden={this.props.trips[0].tripState !== TripState.MyTrip}>My Role</th>
                            <th hidden={this.props.trips[0].tripState !== TripState.SuggestedTrip} className='centered'>Approved</th>
                            <th/>
                        </tr>
                    </thead>
                    <tbody>
                        {this.props.trips.map(
                            (trip:ITrip) => <TripsLine trip={trip} key={trip.id} owner={this} />)}
                    </tbody>    
                </Table>
            </Expandable>
      )
  }
}

export class TripsList extends Component<{
    app: App
  },{
    groups: ITrip[][],
  }> {
    constructor(props: any){
        super(props)
        this.state = {groups: []}
        this.requery = this.requery.bind(this)
    }

    public requery() {
        this.props.app.setStatus(['Loading ', Spinner])
        this.props.app.apiCall('GET',BaseUrl + '/trips')
        .then((data:ITrip[]) => {

            const groups : ITrip[][] = []

            groups[TripState.MyTrip] = [];
            groups[TripState.OpenTrip] = [];
            groups[TripState.ClosedTrip] = [];
            groups[TripState.SuggestedTrip] = [];
            groups[TripState.DeletedTrip] = [];

            for (const item of data) {
                groups[item.tripState as number].push(item)
            }

            this.setState({groups})
            this.props.app.setStatus('Loaded', 3000)
            this.props.app.setState({isLoading:false});
        })
    }

    public componentDidMount(){
        this.requery()
    }

    public render(){
        const groups = this.state.groups.filter((group:ITrip[]) => group.length)
        return [
            <TriphubNavbar key='triphubNavbar' app={this.props.app}/>,
            groups
                .filter((group:ITrip[]) => this.props.app.state.isPrivileged || 
                                            (group[0].tripState !== TripState.SuggestedTrip && group[0].tripState !== TripState.DeletedTrip))
                .map((group:ITrip[],i) => 
                <TripsGroup trips={group} key={'tripsGroup'  + group[0].tripState} 
                            app={this.props.app} expanded={i === 0}/>)
            ]
        }
}
