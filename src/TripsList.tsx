import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import { Component } from 'react';
import * as React from 'react';
import { App } from './App';
import { Container, ButtonGroup } from 'reactstrap';
import { BaseUrl } from '.';
import { ITrip, TripGroup, TripApprovalState } from './Interfaces';
import { GetDate, GetLength } from './Utilities';
import './index.css';
import Table from 'reactstrap/lib/Table';
import { ToolTipIcon } from './ToolTipIcon';
import { Spinner, Done } from './Widgets';
import { Accordian } from './Accordian';
import { ButtonWithTooltip } from './MapEditor';
import { ExpandableTableRow } from './ExpandableTableRow';
import { TripCoordinatorDashboard } from './TripCoordinatorDashboard';
import Jumbotron from 'reactstrap/lib/Jumbotron';

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
            return errors.map((e,i)=> <ToolTipIcon key={i} icon='exclamation-triangle' id={id + 'warning' + e.id + '_' + i} 
                                        tooltip={e.message} className='warning-icon'/>)
        }



        const tablerow = [
            <td key={'open' + id}>
                <ButtonGroup className='trip-list-buttons'>
                    <ButtonWithTooltip id={`open-${id}`} onClick={this.onClick} tooltipText="Go to trip">
                        { (trip.isSocial) ? <span className='fas fa-users'/>  : <span className='fas fa-hiking'/>  }
                    </ButtonWithTooltip>
                </ButtonGroup>
                {extractWarnings(/./)}
                { (trip.approval === TripApprovalState.Pending) &&
                    <ToolTipIcon id={id+'notapproved'} icon='exclamation-circle' className='warning-icon' tooltip="Not approved yet"/>
                }
            </td>,
            <td key={'date' + id} onClick={this.onClick}>
                {GetDate(trip.tripDate)}{extractWarnings(/date/)}
            </td>,
            <td key={'length' + id} onClick={this.onClick} className='centered'>
                {(!trip.isSocial) && GetLength(trip.length)}{extractWarnings(/length/)}
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
            <td key={'role' + id} onClick={this.onClick} hidden={trip.tripGroup !== TripGroup.MyTrip}>
                {trip.role}{extractWarnings(/role/)}
            </td>,
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
    private groupTitles = new Map([
        [TripGroup.ClosedTrip, "Closed Trips"],
        [TripGroup.DeletedTrip, "Deleted Trips"],
        [TripGroup.MyTrip, "My Trips"],
        [TripGroup.OpenTrip, "Open Trips"],
        [TripGroup.RejectedTrip, "Rejected Trips"],
        [TripGroup.SuggestedTrip, "Future Trips"],
    ])

    constructor(props: any){
        super(props)
    }

    public render(){

        const trips = this.props.trips
        const id = 'tg' + trips[0].tripGroup
        const me = this.props.app.getMe()

        return  (
            <Container className={this.props.app.containerClassName()} fluid={true}>
                <Accordian id={id} className='trip-group' headerClassName='trip-group-header' expanded={this.props.expanded}
                    title={<span>
                            <b>{this.groupTitles.get(trips[0].tripGroup)}</b>
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
                                <th hidden={this.props.trips[0].tripGroup !== TripGroup.MyTrip}>My Role</th>
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

            groups[TripGroup.MyTrip] = [];
            groups[TripGroup.OpenTrip] = [];
            groups[TripGroup.ClosedTrip] = [];
            groups[TripGroup.SuggestedTrip] = [];
            groups[TripGroup.DeletedTrip] = [];
            groups[TripGroup.RejectedTrip] = [];

            for (const item of data) {
                groups[item.tripGroup as number].push(item)
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
        const isAdmin = this.props.app.amAdmin()
        const isTripLeader = this.props.app.amTripLeader()
        return isLoading ? 
            <Container key="loadingContainer" className={this.props.app.containerClassName() + "triphub-loading-container"}>
                <Jumbotron key='loadingAlert' variant='primary'>
                    <div key='1'>{isLoading ? Spinner : Done} Loading Trips</div>
                </Jumbotron>
            </Container> :
            [ isAdmin && groups.length > 0 && <TripCoordinatorDashboard trips={this.state.groups[TripGroup.SuggestedTrip]} app={this.props.app}/>,
            groups
                // Only Tripleaders+ can see suggested trips
                // Only Admin+ can see deleted and rejected trips
                .filter((group:ITrip[]) => ( (group[0].tripGroup !== TripGroup.SuggestedTrip && group[0].tripGroup !== TripGroup.DeletedTrip &&
                                            group[0].tripGroup !== TripGroup.RejectedTrip) ||
                                            (group[0].tripGroup === TripGroup.SuggestedTrip && isTripLeader) ||
                                            (group[0].tripGroup === TripGroup.RejectedTrip && isAdmin) ||
                                            (group[0].tripGroup === TripGroup.DeletedTrip && isAdmin) ) )
                .map((group:ITrip[],i) => 
                <TripsGroup trips={group} key={'tripsGroup'  + group[0].tripGroup} 
                            app={this.props.app} expanded={i <= 1}/>)
            ]
    }
}
