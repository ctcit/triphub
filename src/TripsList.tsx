import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import { Component } from 'react'
import * as React from 'react'
import { App } from './App'
import { Container, ButtonGroup } from 'reactstrap'
import { BaseUrl } from '.'
import { ITrip } from './Interfaces'
import { BindMethods, GetDate, GetLength } from './Utilities'
import './index.css'
import Table from 'reactstrap/lib/Table'
import { ToolTipIcon } from './ToolTipIcon'
import { Accordian } from './Accordian'
import { ExpandableTableRow } from './ExpandableTableRow'
import { TripCoordinatorDashboard } from './TripCoordinatorDashboard'
import { TripState } from './TripStates'
import { ButtonWithTooltip } from './ButtonWithTooltip'

class TripsLine extends Component<{
    owner: TripsGroup,
    trip: ITrip,
}, {}> {
    constructor(props: any) {
        super(props)
        BindMethods(this)
    }

    public onClick() {
        this.props.owner.props.app.setPath('/trips/' + this.props.trip.id)
    }

    public render() {
        const app = this.props.owner.props.app
        const trip = this.props.trip
        const id = trip.id
        const me = this.props.owner.props.app.me

        let validation = app.validateTrip(trip).filter(i => !i.ok)

        const extractWarnings = (match: RegExp) => {
            const errors = validation.filter(i => match.test(i.field))
            validation = validation.filter(i => !match.test(i.field))
            return errors.map((e, i) =>
                <ToolTipIcon key={i} icon='exclamation-triangle' id={`${id}warning${e.field}_${i}`}
                    tooltip={e.message} className='warning-icon' />)
        }

        const onClick = () => this.onClick();
        const tablerow = [
            <td key={'open' + id}>
                <ButtonGroup className='trip-list-buttons'>
                    <ButtonWithTooltip id={`open-${id}`} onClick={onClick} tooltipText="Go to trip">
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
}, {
}> {

    constructor(props: any) {
        super(props)
    }

    public render() {

        const trips = this.props.trips
        const me = this.props.app.me

        return (
            <Container className={this.props.app.containerClassName} fluid={true}>
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
                                (trip: ITrip) => <TripsLine trip={trip} key={trip.id} owner={this} />)}
                        </tbody>
                    </Table>
                </Accordian>
            </Container>
        )
    }
}

export class TripsList extends Component<{
    app: App
}, {
    isLoadingTrips: boolean
    groups: ITrip[][],
}> {
    constructor(props: any) {
        super(props)
        this.state = { isLoadingTrips: true, groups: [] }
    }

    public requery() {
        this.props.app.triphubApiCall('GET', BaseUrl + '/trips')
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

    public componentDidMount() {
        this.requery()
    }

    public render() {
        if (this.state.isLoadingTrips) {
            return this.props.app.loadingStatus({ ...this.props.app.state, ...this.state })
        }

        const groups = this.state.groups
        const isAdmin = this.props.app.amAdmin
        const role = this.props.app.state.role
        return [
            isAdmin && groups.length > 0 &&
            <TripCoordinatorDashboard trips={groups.reduce((a,b) => [...a, ...b], [])} app={this.props.app} />,
            // Only Tripleaders+ can see suggested trips
            // Only Admin+ can see deleted and rejected trips
            groups
                .filter(group => role >= TripState[group[0].state].roleToView)
                .map((group, i) =>
                    <TripsGroup trips={group} key={i} app={this.props.app} expanded={i <= 1} />)
        ]
    }
}
