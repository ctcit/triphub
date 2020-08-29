import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import { Component } from 'react';
import * as React from 'react';
import { App } from './App';
import { Button, Container, Form, Collapse, Jumbotron, Card, CardHeader, ButtonGroup } from 'reactstrap';
import { BaseUrl } from '.';
import { ITrip, TripState } from './Interfaces';
import { GetDate, GetLength } from './Utilities';
import './index.css';
import Table from 'reactstrap/lib/Table';
import { TriphubNavbar } from './TriphubNavBar';
import { ToolTipIcon } from './ToolTipIcon';
import { Spinner, Done } from './Widgets';
import { SwitchControl } from './Control';
import { Role } from './Interfaces';
import { Accordian } from './Accordian';
import { ButtonWithTooltip } from './MapEditor';
import { ExpandableTableRow } from './ExpandableTableRow';

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

    public render() {
        const app = this.props.owner.props.app
        const trip = this.props.trip
        const id = trip.id
        const me = this.props.owner.props.app.getMe()
        let validation = app.validateTrip(trip).filter(i => !i.ok)

        const extractWarnings = (match:RegExp) => {
            const errors = validation.filter(i => match.test(i.id))
            validation = validation.filter(i => !match.test(i.id))
            return errors.map((e,i)=> <ToolTipIcon key={i} icon='warning' id={id + 'warning' + e.id + '_' + i} 
                                        tooltip={e.message} className='warning-icon'/>)
        }

        const onGetApproved = (): any => {
            return trip.isApproved
        }
        const onSaveApproved = (tripId: string, value: any): Promise<void> => {
            trip.isApproved = value
            const body = { isApproved: value }
            return this.props.owner.props.app.apiCall('POST', BaseUrl + '/trips/' + trip.id, body, true);
        }
        const onGetValidationMessage = (): any => {
            return ''
        }

        const myRole = this.props.owner.props.app.state.role 

        const tablerow = [
            <td key={'open' + id}>
                {extractWarnings(/./)}
                <ButtonGroup className='trip-list-buttons'>
                    <ButtonWithTooltip id={`open-${id}`} onClick={this.onClick} tooltipText="Go to trip">
                        <span className='fas fa-hiking'/>  
                    </ButtonWithTooltip>
                </ButtonGroup>
            </td>,
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
                <span hidden={!trip.isSocial}><ToolTipIcon id={'social' + id} icon='users' tooltip='Social Event'/> </span>
                {trip.grade}{extractWarnings(/grade/)}
            </td>,
            <td key={'leaders' + id} onClick={this.onClick} hidden={!me.id} className='desktop-only'>
                {trip.leaders}{extractWarnings(/leaders/)}
            </td>,
            <td key={'role' + id} onClick={this.onClick} hidden={trip.tripState !== TripState.MyTrip}>
                {trip.role}{extractWarnings(/role/)}
            </td>,
            <td key={'approved' + id} hidden={trip.tripState !== TripState.SuggestedTrip} className='centered'>
                <SwitchControl id='isApproved' label='' isLoading={false} onGetValidationMessage={onGetValidationMessage}
                    readOnly={myRole < Role.Admin}
                    onGet={onGetApproved} onSave={onSaveApproved} />
            </td>
        ]

        return (
            <ExpandableTableRow id={'trip' + id} tablerow={tablerow} expandClassName='mobile-only'>
                <div><strong>Grade: </strong>{trip.grade}</div>
                <div><strong>Leader: </strong>{trip.leaders}</div>
            </ExpandableTableRow>
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
            <Container className={this.props.app.containerClassName()} fluid={true}>
                <Accordian id={id} className='trip-group' headerClassName='trip-group-header' expanded={this.props.expanded}
                    title={<span>
                            <b>{TripState[trips[0].tripState].replace('Trip',' Trip') + (trips.length > 1 ? 's' : '')}</b>
                            <span key='count' className='trip-count'> ({trips.length})</span>
                        </span>
                    }>
                    <Table className='TripGroup' size='sm' striped={true} reflow={false}>
                        <thead>
                            <tr>
                                <th />
                                <th>Date</th>
                                <th className='centered'>Length</th>
                                <th>Title</th>
                                <th className='desktop-only'>Grade</th>
                                <th hidden={!me.id} className='desktop-only'>Leader</th>
                                <th hidden={this.props.trips[0].tripState !== TripState.MyTrip}>My Role</th>
                                <th hidden={this.props.trips[0].tripState !== TripState.SuggestedTrip} className='centered'>Approved</th>
                                <th className='mobile-only'/>
                            </tr>
                        </thead>
                        <tbody>
                            {this.props.trips.map(
                                (trip:ITrip) => <TripsLine trip={trip} key={trip.id} owner={this} />)}
                        </tbody>    
                    </Table>
                </Accordian>
            </Container>
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
        const isLoading = this.props.app.state.isLoading;
        const groups = this.state.groups.filter((group:ITrip[]) => group.length)
        const role : Role = this.props.app.state.role
        const isAdmin = role >= Role.Admin
        const isTripLeader = role >= Role.TripLeader
        return [
            <TriphubNavbar key='triphubNavbar' app={this.props.app}/>,
            (isLoading ? 
                <Container key="loadingContainer" className={this.props.app.containerClassName() + "triphub-loading-container"}>
                    <Jumbotron key='loadingAlert' variant='primary'>
                        <div key='1'>{isLoading ? Spinner : Done} Loading Trips</div>
                    </Jumbotron>
                </Container> :

                groups
                    // Only Tripleaders+ can see suggested trips
                    // Only Admin+ can see deleted trips
                    .filter((group:ITrip[]) => ( (group[0].tripState !== TripState.SuggestedTrip && group[0].tripState !== TripState.DeletedTrip) ||
                                                (group[0].tripState === TripState.SuggestedTrip && isTripLeader) ||
                                                (group[0].tripState === TripState.DeletedTrip && isAdmin) ) )
                    .map((group:ITrip[],i) => 
                    <TripsGroup trips={group} key={'tripsGroup'  + group[0].tripState} 
                                app={this.props.app} expanded={i <= 1}/>)
                )
            ]
        }
}
