import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import { Component } from 'react'
import { Container, ButtonGroup, Table, Row, Col } from 'reactstrap'
import { ITrip, Role } from './Interfaces'
import { BindMethods, GetDate, GetFullDate, GetLength, GradeIcon, GradeValue } from './Utilities'
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
import { TripsCache } from './Services/TripsCache'

class TripsLine extends Component<{
    trip: ITrip
    available: boolean
    highlights?: { [key: string]: RegExp }
    minRanking?: number
    maxRanking?: number
    setPath(path: string): void
}, {
    expanded?: boolean
}> {
    constructor(props: any) {
        super(props)
        this.state = { expanded: false }
        BindMethods(this)
    }

    public onToggle() {
        this.setState({ expanded: !this.state.expanded })
    }

    public onShowTrip() {
        if (this.props.available) {
            this.props.setPath('/trips/' + this.props.trip.id)
        }
    }

    public render() {
        const trip = this.props.trip
        const { id, ranking } = this.props.trip
        const minRanking = this.props.minRanking
        const maxRanking = this.props.maxRanking
        const highlights = this.props.highlights

        const me = MembersService.Me

        const onClick = highlights ? this.onToggle : this.onShowTrip

        let validation = TripsService.validateTrip(trip).filter(i => !i.ok)

        const extractWarnings = (match: RegExp) => {
            const errors = validation.filter(i => match.test(i.field))
            validation = validation.filter(i => !match.test(i.field))
            return errors.map((e, i) =>
                <ToolTipIcon key={i} icon='exclamation-triangle' id={`${id}warning${e.field}_${i}`}
                    tooltip={e.message} className='warning-icon' />)
        }

        const highlight = (value?: string, regexp?: RegExp, condition?: number): Array<string | JSX.Element | undefined> => {
            if (regexp && value && condition) {
                const separator = '{339a845e-ee32-49f0-bc3c-ff029b903e97}'
                const parts = value.replace(regexp, m => separator + m + separator).split(separator);

                return parts.map((p, i) => i % 2 ? <span key={i} className='pastTripHighlight'>{p}</span> : p);
            } else {
                return [value]
            }
        }

        const rankingStyle = (): { background?: string } => {

            if (minRanking === undefined || maxRanking === undefined || ranking === undefined) {
                return {}
            }

            const colors = [[0x00, 0x80, 0x00], [0xFF, 0xFF, 0x00], [0xFF, 0xA5, 0x00], [0xFF, 0x00, 0x00]]

            if (minRanking === maxRanking) {
                return { background: `rgb(${colors[colors.length - 1].join()})` }
            }

            const value = (ranking - minRanking) / (maxRanking - minRanking) * (colors.length - 1)
            const a = Math.min(Math.floor(value), colors.length - 2)
            const b = a + 1
            const out = [0, 1, 2].map(i => colors[a][i] * (b - value) + colors[b][i] * (value - a))

            return { background: `rgb(${out.join()})` }
        }

        const grade = highlight(trip.grade, highlights?.grade, trip.ranking_grade)
        const leaders = highlight(trip.leaders?.join(', '), highlights?.member, trip.ranking_member)
        const nonleaders = highlight(trip.nonleaders?.join(', '), highlights?.member, trip.ranking_member)
        const editors = highlight(trip.editors?.join(', '), highlights?.member, trip.ranking_member)

        const tdStyle = this.props.available ? undefined : {color: 'grey'}

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
            <td key={'date' + id} onClick={onClick} style={tdStyle}>
                {highlights ? GetFullDate(trip.tripDate) : GetDate(trip.tripDate)}{extractWarnings(/date/)}
            </td>,
            <td key={'length' + id} onClick={onClick} className='centered' style={tdStyle}>
                {!trip.isSocial && highlight(GetLength(trip.length, new Date(trip.tripDate)), /.*/, trip.ranking_length)}
                {extractWarnings(/length/)}
            </td>,
            <td key={'title' + id} onClick={onClick} style={tdStyle}>
                {highlight(trip.title, highlights?.title, trip.ranking_title)}{extractWarnings(/title/)}
            </td>,
            <td key={'grade' + id} onClick={onClick} className='desktop-only' style={tdStyle}>
                <span hidden={!trip.isSocial}><ToolTipIcon id={'social' + id} icon='users' tooltip='Social Event' /> </span>
                <span hidden={trip.isSocial}><ToolTipIcon id={'social' + id} icon={GradeIcon(trip)} tooltip='Tramp' /> </span>
                {grade}{extractWarnings(/grade/)}
            </td>,
            <td key={'leaders' + id} onClick={onClick} hidden={!me.id} className='desktop-only' style={tdStyle}>
                {leaders}{extractWarnings(/leaders/)}
            </td>,
            <td key={'role' + id} onClick={onClick} hidden={trip.state !== 'MyTrip'}>
                {trip.role}{extractWarnings(/role/)}
            </td>,
            <td key={'ranking' + id} onClick={onClick} hidden={trip.ranking === undefined} style={rankingStyle()}>
                {trip.ranking?.toFixed(1)}
            </td>
        ]

        return (
            <AccordianTableRow id={'trip' + id} key={this.state.expanded ? 0 : 1} expanded={this.state.expanded}
                tablerow={tablerow} expandClassName={highlights ? 'hide' : 'mobile-only'}>
                <Container fluid={true}>
                    <Row className='mobile-only'>
                        <Col sm={2} md={2}><strong>Grade:</strong></Col>
                        <Col sm={2} md={2}>{grade}</Col>
                    </Row>
                    <Row className='mobile-only'>
                        <Col sm={2} md={2}><strong>Leader:</strong></Col>
                        <Col sm={2} md={2}>{leaders}</Col>
                    </Row>
                    {
                        highlights && <>
                            {nonleaders.length >= 2 &&
                                <Row>
                                    <Col sm={2} md={2}><strong>Non-Leaders:</strong></Col>
                                    <Col sm={8} md={8}>{nonleaders}</Col>
                                </Row>}
                            {editors.length >= 2 &&
                                <Row>
                                    <Col sm={2} md={2}><strong>Editors:</strong></Col>
                                    <Col sm={8} md={8}>{editors}</Col>
                                </Row>}
                            {trip.isDeleted &&
                                <Row>
                                    <Col sm={2} md={2}>this.highlight('Deleted',/Deleted/)</Col>
                                </Row>}
                            <Row>
                                <Col sm={2} md={2}><strong>Description:</strong></Col>
                                <Col sm={8} md={8}>{highlight(trip.description, highlights.description, trip.ranking_description)}</Col>
                            </Row>
                            <Row>
                                <Col sm={2} md={2}><strong>Logistic Information:</strong></Col>
                                <Col sm={8} md={8}>{highlight(trip.logisticInfo, highlights.logisticInfo, trip.ranking_logisticInfo)}</Col>
                            </Row>
                            <Row>
                                <Col sm={2} md={2}><strong>Cost:</strong></Col>
                                <Col sm={8} md={8}>{highlight(trip.cost, /.*/, trip.ranking_cost)}</Col>
                            </Row>
                            {trip.ranking_participants  && <Row>
                                <Col sm={2} md={2}><strong>Participants:</strong></Col>
                                <Col sm={8} md={8}>{highlight(`${trip.computed_participants}`, /.*/, trip.ranking_participants)}</Col>
                            </Row>}
                            <Row>
                                <Col sm={2} md={2}><strong>Prerequisites:</strong></Col>
                                <Col sm={8} md={8}>{highlight(trip.prerequisites, highlights.prerequisites, trip.ranking_prerequisites)}</Col>
                            </Row>
                            <Row>
                                <Col sm={2} md={2}><strong>Approval:</strong></Col>
                                <Col sm={8} md={8}>{highlight(trip.approval, highlights.approval, trip.ranking_approval)}</Col>
                            </Row>
                            <Row>
                                <Col sm={2} md={2}><strong>Maps:</strong></Col>
                                <Col sm={8} md={8}>{highlight(trip.maps?.join(', '), highlights.maps, trip.ranking_maps)}</Col>
                            </Row>
                        </>
                    }
                </Container>
            </AccordianTableRow>
        )
    }
}

const Sorts = ['date', 'length', 'title', 'grade', 'leader', 'rank'] as const
type SortBy = typeof Sorts[number]
interface ISort { sort: (a: ITrip, b: ITrip) => number, dir: number }
const sorts: { [key in SortBy]: ISort } = {
    date: { sort: (a: ITrip, b: ITrip) => a.tripDate.localeCompare(b.tripDate), dir: 1 },
    length: { sort: (a: ITrip, b: ITrip) => (a.isSocial ? 0 : a.length) - (b.isSocial ? 0 : b.length), dir: 1 },
    title: { sort: (a: ITrip, b: ITrip) => a.title.localeCompare(b.title), dir: 1 },
    grade: { sort: (a: ITrip, b: ITrip) => GradeValue(a) - GradeValue(b), dir: 1 },
    leader: { sort: (a: ITrip, b: ITrip) => (a.leaders?.join() ?? '').localeCompare(b.leaders?.join() ?? ''), dir: 1 },
    rank: { sort: (a: ITrip, b: ITrip) => (a.ranking ?? 0) - (b.ranking ?? 0), dir: -1 },
} as const

export class TripsGroup extends Component<{
    trips: ITrip[]
    isOnline: boolean
    cachedTripIds?: number[]
    title?: string
    expanded?: boolean
    highlights?: { [key: string]: RegExp }
    setPath(path: string): void
}, {
    sortBy: SortBy
    sortDir: number
}> {
    constructor(props: any) {
        super(props)
        this.state = this.props.highlights ? { sortBy: 'rank', sortDir: -1 } : { sortBy: 'date', sortDir: 1 }
        BindMethods(this)
    }

    public onSort(sortBy: SortBy) {
        const sortDir = sortBy === this.state.sortBy ? -this.state.sortDir : sorts[sortBy].dir
        this.setState({ sortBy, sortDir })
    }

    public render() {
        const { sortBy, sortDir } = this.state
        const trips = this.props.trips
        const me = MembersService.Me

        const rankings = trips.filter(t => t.ranking !== undefined).map(t => t.ranking as number)
        const minRanking = rankings.length ? Math.min(...rankings) : undefined
        const maxRanking = rankings.length ? Math.max(...rankings) : undefined
        const sortArrow = sortDir === 1 ? '↓' : '↑'
        const onSort = Object.fromEntries(
            Sorts.map((s: SortBy) => [s, () => this.onSort(s)])) as { [key in SortBy]: () => void }

        trips.sort((a, b) =>
            sortDir * (sorts[sortBy].sort(a, b) || sorts.rank.sort(a, b) || sorts.date.sort(a, b)))


        return (
            <Container className={ConfigService.containerClassName} fluid={true}>
                <Accordian id={`tg${trips[0]?.state ?? ''}`} className='trip-group' headerClassName='trip-group-header' expanded={this.props.expanded}
                    title={<span>
                        <b>{this.props.title ?? TripState[trips[0]?.state].groupTitle ?? trips[0]?.state}</b>
                        <span key='count' className='trip-count'> ({trips.length})</span>
                    </span>
                    }>
                    <Table className='TripGroup' size='sm' striped={true}>
                        <thead>
                            <tr>
                                <th />
                                <th onClick={onSort.date} className='sortable'>
                                    Date{sortBy === 'date' ? sortArrow : ''}
                                </th>
                                <th onClick={onSort.length} className='sortable centered'>
                                    Length{sortBy === 'length' ? sortArrow : ''}
                                </th>
                                <th onClick={onSort.title} className='sortable'>
                                    Title{sortBy === 'title' ? sortArrow : ''}
                                </th>
                                <th onClick={onSort.grade} className='sortable desktop-only'>
                                    Grade{sortBy === 'grade' ? sortArrow : ''}
                                </th>
                                <th onClick={onSort.leader} className='sortable desktop-only' hidden={!me.id}>
                                    Leader{sortBy === 'leader' ? sortArrow : ''}
                                </th>
                                <th hidden={trips[0]?.state !== 'MyTrip'}>
                                    My Role
                                </th>
                                <th onClick={onSort.rank} className='sortable' hidden={!rankings.length}>
                                    Rank{sortBy === 'rank' ? sortArrow : ''}
                                </th>
                                <th className='mobile-only' />
                            </tr>
                        </thead>
                        <tbody>
                            {this.props.trips.map(
                                (trip: ITrip) => <TripsLine key={'trip' + trip.id} 
                                    trip={trip}
                                    available={this.props.isOnline || (this.props.cachedTripIds?.includes(trip.id) || false)}
                                    minRanking={minRanking} maxRanking={maxRanking}
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
    setCachedTrips(cachedTrips: ITrip[]): void
}, {
    isLoadingTrips: boolean
    groups: ITrip[][],
    cachedTripIds: number[]
}> {
    constructor(props: any) {
        super(props)
        this.state = { 
            isLoadingTrips: true, 
            groups: [], 
            cachedTripIds: [] 
        }
    }

    private requeryTrips() {
        Promise.all([
            TripsService.getTrips(true),
            TripsCache.getCachedTripIds()
            ]).then(values => {
                const trips: ITrip[] = values[0]
                const cachedTripIds: number[] = values[1]

                const order = Object.keys(TripState)
                const groups = new Map<string, ITrip[]>(
                    trips.sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state))
                        .map(t => [t.state, []] as [string, ITrip[]]))
                for (const item of trips) {
                    (groups.get(item.state) as ITrip[]).push(item)
                }

                this.setState({ groups: [...groups.values()], cachedTripIds, isLoadingTrips: false })
                this.props.setCachedTrips(trips.filter(trip => cachedTripIds.includes(trip.id)))
            })
    }

    public componentDidMount() {
        this.requeryTrips()
    }

    public render() {
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
                        isOnline={this.props.isOnline}
                        cachedTripIds={this.state.cachedTripIds}
                        setPath={this.props.setPath}
                        />)
        ]
    }
}
