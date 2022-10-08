import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import { Component } from 'react'
import { Container, ButtonGroup, Table } from 'reactstrap'
import { ITrip, Role } from './Interfaces'
import { BindMethods, GetDate, GetLength } from './Utilities'
import './index.css'
import { ToolTipIcon } from './ToolTipIcon'
import { Accordian } from './Accordian'
import { AccordianTableRow } from './AccordianTableRow'
import { TripCoordinatorDashboard } from './TripCoordinatorDashboard'
import { TripState } from './TripStates'
import { ButtonWithTooltip } from './ButtonWithTooltip'
import { MembersService } from './Services/MembersService'
import { TripsService } from './Services/TripsService'
import { ConfigService } from './Services/ConfigService'
import memoizeOne from 'memoize-one'
import { TripsCache } from './Services/TripsCache'

class TripsLine extends Component<{
    trip: ITrip
    available: boolean
    setPath(path: string): void
}, {}> {
    constructor(props: any) {
        super(props)
        BindMethods(this)
    }

    public onClick() {
        this.props.setPath('/trips/' + this.props.trip.id)
    }

    public render() {
        const trip = this.props.trip
        const id = trip.id
        const me = MembersService.Me

        let validation = TripsService.validateTrip(trip).filter(i => !i.ok)

        const extractWarnings = (match: RegExp) => {
            const errors = validation.filter(i => match.test(i.field))
            validation = validation.filter(i => !match.test(i.field))
            return errors.map((e, i) =>
                <ToolTipIcon key={i} icon='exclamation-triangle' id={`${id}warning${e.field}_${i}`}
                    tooltip={e.message} className='warning-icon' />)
        }

        const onClick = () => {
            if (this.props.available) {
                this.onClick();
            }
        }

        const tablerow = [
            <td key={'open' + id}>
                <ButtonGroup className='trip-list-buttons'>
                    <ButtonWithTooltip id={`open-${id}`} onClick={onClick} 
                        tooltipText={this.props.available ? 'Go to trip' : 'This trip is not available while offline'}
                        disabled={!this.props.available}>
                        <span className={trip.isSocial ? 'fas fa-users' : 'fas fa-hiking'} />
                    </ButtonWithTooltip>
                </ButtonGroup>
                {extractWarnings(/./)}
                {trip.approval === TripState.Pending.id &&
                    <ToolTipIcon id={id + 'notapproved'} icon='exclamation-circle' className='warning-icon' tooltip="Not approved yet" />
                }
            </td>,
            <td key={'date' + id} onClick={onClick}>
                {GetDate(trip.tripDate)}{extractWarnings(/date/)}
            </td>,
            <td key={'length' + id} onClick={onClick} className='centered'>
                {(!trip.isSocial) && GetLength(trip.length, new Date(trip.tripDate))}{extractWarnings(/length/)}
            </td>,
            <td key={'title' + id} onClick={onClick}>
                {trip.title}{extractWarnings(/title/)}
            </td>,
            <td key={'grade' + id} onClick={onClick} className='desktop-only'>
                <span hidden={!trip.isSocial}><ToolTipIcon id={'social' + id} icon='users' tooltip='Social Event' /> </span>
                {trip.grade}{extractWarnings(/grade/)}
            </td>,
            <td key={'leaders' + id} onClick={onClick} hidden={!me.id} className='desktop-only'>
                {trip.leaders}{extractWarnings(/leaders/)}
            </td>,
            <td key={'role' + id} onClick={onClick} hidden={trip.state !== 'MyTrip'}>
                {trip.role}{extractWarnings(/role/)}
            </td>,
        ]

        return (
            <AccordianTableRow id={'trip' + id} tablerow={tablerow} expandClassName='mobile-only'>
                <div><strong>Grade: </strong>{trip.grade}</div>
                <div><strong>Leader: </strong>{trip.leaders}</div>
            </AccordianTableRow>
        )
    }
}

export class TripsGroup extends Component<{
    trips: ITrip[]
    expanded: boolean
    cachedTripIds: number[] | null
    setPath(path: string): void
}, {
}> {

    constructor(props: any) {
        super(props)
    }

    public render() {

        const trips = this.props.trips
        const me = MembersService.Me

        return (
            <Container className={ConfigService.containerClassName} fluid={true}>
                <Accordian id={`tg${trips[0].state}`} className='trip-group' headerClassName='trip-group-header' expanded={this.props.expanded}
                    title={<span>
                        <b>{TripState[trips[0].state].groupTitle || trips[0].state}</b>
                        <span key='count' className='trip-count'> ({trips.length})</span>
                    </span>
                    }>
                    <Table className='TripGroup' size='sm' striped={true}>
                        <thead>
                            <tr>
                                <th />
                                <th>Date</th>
                                <th className='centered'>Length</th>
                                <th>Title</th>
                                <th className='desktop-only'>Grade</th>
                                <th hidden={!me.id} className='desktop-only'>Leader</th>
                                <th hidden={this.props.trips[0].state !== 'MyTrip'}>My Role</th>
                                <th className='mobile-only' />
                            </tr>
                        </thead>
                        <tbody>
                            {this.props.trips.map(
                                (trip: ITrip) => <TripsLine key={'trip' + trip.id} 
                                    trip={trip}
                                    available={this.props.cachedTripIds == null || this.props.cachedTripIds.includes(trip.id)}
                                    setPath={this.props.setPath}
                                     />)}
                        </tbody>
                    </Table>
                </Accordian>
            </Container>
        )
    }
}

export class TripsList extends Component<{
    role: Role,
    isOnline: boolean,
    setPath(path: string): void
    loadingStatus(state: any): JSX.Element
}, {
    isLoadingTrips: boolean
    groups: ITrip[][],
    cachedTripIds: number[] | null
}> {
    constructor(props: any) {
        super(props)
        this.state = { isLoadingTrips: true, groups: [], cachedTripIds: null }
    }

    private requeryTrips() {
        TripsService.getTrips()
            .then((data: ITrip[]) => {
                const order = Object.keys(TripState)
                const groups = new Map<string, ITrip[]>(
                    data.sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state))
                        .map(t => [t.state, []] as [string, ITrip[]]))

                for (const item of data) {
                    (groups.get(item.state) as ITrip[]).push(item)
                }

                this.setState({ isLoadingTrips: false, groups: [...groups.values()] })
            })
    }

    private memoizedGetCachedTripIds = memoizeOne((isOnline: boolean) => {
        if (this.props.isOnline) {
            this.setState({cachedTripIds: null})
        } else {
            TripsCache.getCachedTripIds().then((cachedTripIds: number[]) => {
                this.setState({cachedTripIds})
            })
        }
    });

    public componentDidMount() {
        this.requeryTrips()
    }

    public render() {
        this.memoizedGetCachedTripIds(this.props.isOnline)

        if (this.state.isLoadingTrips) {
            return this.props.loadingStatus({ ...this.state })
        }

        const groups = this.state.groups
        const role = this.props.role
        const isAdmin = MembersService.amAdmin(role)
        return [
            isAdmin && groups.length > 0 &&
            <TripCoordinatorDashboard key='tripCoordinatorDashboard' 
                trips={groups.reduce((a,b) => [...a, ...b], [])} 
                setPath={this.props.setPath} />,
            // Only Tripleaders+ can see suggested trips
            // Only Admin+ can see deleted and rejected trips
            groups
                .filter(group => role >= TripState[group[0].state].roleToView)
                .map((group, i) =>
                    <TripsGroup key={'group' + i} 
                        trips={group} 
                        expanded={i <= 1} 
                        cachedTripIds={this.state.cachedTripIds}
                        setPath={this.props.setPath}
                        />)
        ]
    }
}
