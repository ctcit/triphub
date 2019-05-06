import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import './index.css';
import { Component } from 'react';
import * as React from 'react';
import { App } from './App';
import { Button } from 'reactstrap';
import { BaseUrl, Spinner, ToolTipIcon  } from '.';
import { ITrip, TripState } from './Interfaces';
import { GetDate, GetLength } from './Utilities';
import './index.css';
import { Expandable } from './Expandable';
import Table from 'reactstrap/lib/Table';
import { TriphubNavbar } from './TriphubNavBar';

class TripsLine extends Component<{
    app: App,
    trip: ITrip,
    },{}> {
    constructor(props: any){
        super(props)
        this.onClick = this.onClick.bind(this) 
    }

    public onClick() {
        this.props.app.setModeEdit(this.props.trip.href)
    }

    public render(){
        const trip = this.props.trip
        const id = trip.id
        const isApproved = this.props.trip.is_approved
        let validation = this.props.app.validateTrip(trip).filter(i => !i.ok)

        const extractWarnings = (match:RegExp) => {
            const errors = validation.filter(i => match.test(i.id))
            validation = validation.filter(i => !match.test(i.id))
            return errors.map((e,i)=> <ToolTipIcon key={i} icon='warning' id={id + 'warning' + e.id + '_' + i} tooltip={e.message} className='warning-icon'/>)
        }

        const tablerow = [
            <td key={'date' + id} onClick={this.onClick}>
                {GetDate(trip.trip_date)}{extractWarnings(/date/)}
            </td>,
            <td key={'length' + id} onClick={this.onClick} className='centered'>
                {GetLength(trip.length)}{extractWarnings(/length/)}
            </td>,
            <td key={'title' + id} onClick={this.onClick}>
                {trip.title}{extractWarnings(/title/)}
            </td>,
            <td key={'grade' + id} onClick={this.onClick} className='desktop-only'>
                {trip.grade}{extractWarnings(/grade/)}
            </td>,
            <td key={'leaders' + id} onClick={this.onClick} className='desktop-only'>
                {trip.leaders}{extractWarnings(/leaders/)}
            </td>,
            <td key={'role' + id} onClick={this.onClick} hidden={trip.trip_state !== TripState.My_Trip}>
                {trip.role}{extractWarnings(/role/)}
            </td>,
            <td key={'approved' + id} onClick={this.onClick} hidden={trip.trip_state !== TripState.Suggested_Trip} className='centered'>
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
    app: App,
    trips: ITrip[]
    expanded: boolean
  },{
  }> {
  constructor(props: any){
      super(props)
  }

    public render(){

        const trips = this.props.trips
        const id = 'tg' + trips[0].trip_state

        return  (
            <Expandable key={id} id={id} expanded={this.props.expanded} 
            title={[TripState[trips[0].trip_state].replace('_',' ') + (trips.length > 1 ? 's' : ''), 
                    <span key='count' className='trip-count'> ({trips.length})</span>]}>
                <Table className='TripGroup' size='sm' striped={true}>
                    <thead>
                        <tr>
                            <th className='mobile-only'/>
                            <th>Date</th>
                            <th className='centered'>Length</th>
                            <th>Title</th>
                            <th className='desktop-only'>Grade</th>
                            <th className='desktop-only'>Leader</th>
                            <th hidden={this.props.trips[0].trip_state !== TripState.My_Trip}>My Role</th>
                            <th hidden={this.props.trips[0].trip_state !== TripState.Suggested_Trip} className='centered'>Approved</th>
                            <th/>
                        </tr>
                    </thead>
                    <tbody>
                        {this.props.trips.map(
                            (trip:ITrip) => <TripsLine trip={trip} key={trip.id} app={this.props.app}/>)}
                    </tbody>    
                </Table>
            </Expandable>
      )
  }
}

export class TripsList extends Component<{
    app: App,
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

            groups[TripState.My_Trip] = [];
            groups[TripState.Open_Trip] = [];
            groups[TripState.Closed_Trip] = [];
            groups[TripState.Suggested_Trip] = [];
            groups[TripState.Deleted_Trip] = [];

            for (const item of data) {
                groups[item.trip_state as number].push(item)
            }

            this.setState({groups})
            this.props.app.setStatus('Loaded', 3000)
            this.props.app.setState({loading:false});
        })
    }

    public componentDidMount(){
        this.requery()
    }

    public render(){
        const groups = this.state.groups.filter((group:ITrip[]) => group.length)
        return [
            <TriphubNavbar key='triphubNavbar' app={this.props.app}/>,
            groups.map((group:ITrip[],i) => 
                <TripsGroup trips={group} key={'tripsGroup'  + group[0].trip_state} app={this.props.app} expanded={i === 0}/>)
            ]
        }
}
