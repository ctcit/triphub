import * as React from 'react';
import { Component } from 'react';
import { App } from './App';
import { ITrip, Role } from './Interfaces';
import { MonthOfYear, DayOfWeek, AddDays, GetDateString, CountWhile, GetDate } from './Utilities';
import { PriorityNavItem } from './TriphubNavBar';
import { ButtonWithTooltip } from './ButtonWithTooltip';
import { ToolTipIcon } from './ToolTipIcon';
import { ConfigService } from './Services/ConfigService';
import { HolidaysService } from './Services/HolidaysService';
import { TripsService } from './Services/TripsService';
import { Badge, ButtonGroup, DropdownItem, Dropdown, DropdownToggle, DropdownMenu, Container, Table } from 'reactstrap';
import { TripsCache } from './Services/TripsCache';
import memoizeOne from 'memoize-one';

interface ICalendarItem {
    id: number
    date: Date
    field: string
    trip?: ITrip
    text: string
    tooltip: string
    length: number
}

interface ICalendarWeek {
    date: Date
    days: ICalendarItem[][][]
}

export enum StateFilter { MyTrips, Open, Suggested, All }
export enum LengthFilter { Day, Weekend, Trips, Social, All }

class CalendarWeek extends Component<{
    week: ICalendarWeek
    calendar: Calendar
    role: Role
    isOnline: boolean,
    cachedTripIds: number[]
    setPath(path: string): void
}, {
}> {
    constructor(props: any) {
        super(props)
    }

    public render() {
        const rowCount = Math.max(...this.props.week.days.map(w => w.length))
        const week = this.props.week.date
        const days = this.props.week.days
        const label = week.getMonth() === AddDays(week, -7).getMonth() ? '' : MonthOfYear[week.getMonth()]
        const rows = []

        for (let row = 0; row < rowCount; row++) {
            const cells = row === 0 ?
                [<td key={GetDateString(this.props.week.date)}
                    className='calendar label' rowSpan={rowCount}>{label}</td>] : []

            for (let col = 0; col < 7;) {
                let colSpan = 1
                const date = AddDays(week, col)
                const items = days[col][row] || []
                const slots = []
                const onDrop = (ev: any) => {
                    const item = this.props.calendar.items[ev.dataTransfer.getData('id')]
                    const field = item.field
                    const oldTrip = item.trip as ITrip
                    const newTrip = { ...oldTrip, [field]: GetDateString(date) } as ITrip
                    const before = TripsService.validateTrip(oldTrip)
                        .find(i => i.field === field && !i.ok)
                    const after = TripsService.validateTrip(newTrip)
                        .find(i => i.field === field && !i.ok)

                    if (!before && after &&
                        !window.confirm('Trip validation resulted in this message:\n\n' + after.message + '\n\nproceed anyway?')) {
                        return
                    }

                    const trips = [...this.props.calendar.state.trips]

                    trips[trips.indexOf(oldTrip)] = newTrip

                    TripsService.postTripUpdate(oldTrip.id, { [field]: newTrip[field] })
                    this.props.calendar.setState({ trips })
                }

                for (const item of items) {

                    if (!item.trip) {
                        slots.push(<span key={item.id}>{item.text}</span>)
                        continue
                    }

                    colSpan = CountWhile(x => col + x < 7 && days[col + x][row] && days[col + x][row].indexOf(item) >= 0);

                    const text = item.text
                    const trip = item.trip as ITrip
                    const onLink = () => this.props.setPath('/trips/' + trip.id)
                    const onSelect = () => this.props.calendar.setState({ selected: trip.id })
                    const onDragStart = (ev: any) => ev.dataTransfer.setData('id', item.id)
                    const isSelected = trip && this.props.calendar.state.selected === trip.id
                    const available = this.props.isOnline || this.props.cachedTripIds.includes(trip.id)

                    slots.push(' ')
                    slots.push(
                        <Badge key={item.id} id={'badge' + item.id} onDragStart={onDragStart} color='green'
                            draggable={this.props.role >= Role.Admin}
                            className={isSelected ? 'selected' : ''}>
                            <span>
                                {item.field === 'tripDate' ?
                                    <ButtonGroup className='calendar-trip-buttons'>
                                        <ButtonWithTooltip id={`open-${item.id}`}
                                            onClick={onLink} 
                                            tooltipText={available ? 'Go to trip' : 'This trip is not available while offline'}
                                        >
                                        <span className={trip.isSocial ? 'fas fa-users' : 'fas fa-hiking'} />
                                        </ButtonWithTooltip>
                                        <div className='calendar-trip-name'>
                                            <ButtonWithTooltip id={`select-${item.id}`} color='transparent'
                                                onClick={onSelect} tooltipText={text}>
                                                {text}
                                            </ButtonWithTooltip>
                                        </div>
                                    </ButtonGroup> :
                                    <ToolTipIcon id={`item-${item.id}`} tooltip={item.tooltip}>{text}</ToolTipIcon>}
                            </span>
                        </Badge>)
                }

                const isToday = GetDateString(date) === GetDateString(new Date())
                const isWeekend = HolidaysService.CanterburyHolidaysByDate.has(GetDateString(date)) ||
                    date.getDay() === 0 || date.getDay() === 6
                const className = [
                    isToday ? 'today' : MonthOfYear[date.getMonth()].toLowerCase(),
                    isWeekend ? 'weekend' : '',
                    row === 0 || colSpan > 1 ? 'top' : '',
                    row === rowCount - 1 || colSpan > 1 ? 'bottom' : ''].join(' ')
                const onDragOver = (ev: any) => ev.preventDefault()

                cells.push(
                    <td colSpan={colSpan} key={col} onDragOver={onDragOver} onDrop={onDrop} className={className}>
                        {slots}</td>)
                col += colSpan
            }

            rows.push(<tr key={`${week.toISOString()}_${row}`}>{cells}</tr>)
        }

        return rows
    }
}

export class Calendar extends Component<{
    role: Role
    isOnline: boolean,
    setPath(path: string): void
    loadingStatus(state: any): JSX.Element
    setCachedTrips(cachedTrips: ITrip[]): void
}, {
    isLoadingCalendar: boolean
    trips: ITrip[]
    cachedTripIds: number[]
    showDropdownIsOpen: boolean
    openClose: boolean
    state: StateFilter
    length: LengthFilter
    selected: number
}>{
    public weeks: ICalendarWeek[] = []
    public items: ICalendarItem[] = []

    constructor(props: any) {
        super(props)
        this.state = {
            isLoadingCalendar: true,
            showDropdownIsOpen: false,
            openClose: false,
            length: LengthFilter.All,
            state: StateFilter.All,
            selected: 0, 
            trips: [],
            cachedTripIds: [] 
        }
    }

    public dayIndex(date: Date): number {
        return (date.getDay() - ConfigService.Config.calendarStartOfWeek + 7) % 7
    }

    public processTrips() {
        const weeks: ICalendarWeek[] = []
        let items: ICalendarItem[] = []

        for (const trip of this.state.trips) {
            if (!trip.isSocial || !trip.isNoSignup) {
                items.push({
                    id: 0, date: new Date(trip.openDate), text: 'O', field: 'openDate',
                    trip, tooltip: 'Open date for ' + trip.title, length: 1
                })
                items.push({
                    id: 0, date: new Date(trip.closeDate), text: 'C', field: 'closeDate',
                    trip, tooltip: 'Close date for ' + trip.title, length: 1
                })
            }

            items.push({
                id: 0, date: new Date(trip.tripDate), text: trip.title, field: 'tripDate',
                trip, tooltip: trip.title, length: trip.length
            })
        }

        if (items.length) {
            const min = new Date();
            const max = new Date(Math.max(...items.map(i => AddDays(i.date, i.length - 1).getTime())))
            const start = AddDays(new Date(), -this.dayIndex(min) - 7)
            const stop = AddDays(max, -this.dayIndex(max) + 14 + 6)
            const datemap: { [key: string]: ICalendarItem[][] } = {}

            items = items.filter(item => this.showItem(item))

            // Add items for date labels
            for (let date = start; date <= stop; date = AddDays(date, 1)) {
                items.push({ id: 0, date, text: `${date.getDate()}`, field: '', tooltip: '', length: 1 })
                datemap[GetDateString(date)] = [[]]
            }

            items.sort((a, b) => a.field < b.field ? -1 : a.field > b.field ? 1 : 0)
            items.forEach((item, i) => item.id = i)

            for (const item of items) {
                if (item.field === 'tripDate') {
                    // Find a clear slot
                    for (let index = 0; ; index++) {
                        if (CountWhile(x => x < item.length && !datemap[GetDateString(AddDays(item.date, x))][index])
                            === item.length) {
                            // Claim it
                            for (let span = 0; span < item.length; span++) {
                                datemap[GetDateString(AddDays(item.date, span))][index] = [item]
                            }
                            break
                        }
                    }
                } else {
                    // Add to an existing slot, so long as it doesn't have more than 5 in it already
                    let itemDate = item.date
                    if (itemDate < start) {
                        item.text += '*'
                        item.tooltip = `Actual ${item.tooltip} is ${GetDate(GetDateString(itemDate))}`
                        itemDate = start
                    }
                    const date = datemap[GetDateString(itemDate)]
                    if (date[date.length - 1].length === 5) {
                        date.push([])
                    }
                    date[date.length - 1].push(item)
                }
            }

            // Decompose datemap into weeks
            for (let date = start; date <= stop; date = AddDays(date, 7)) {
                const week: ICalendarWeek = { date, days: [] }
                weeks.push(week)
                for (let i = 0; i < 7; i++) {
                    week.days.push(datemap[GetDateString(AddDays(date, i))])
                }
            }
        }

        this.weeks = weeks
        this.items = items
    }

    public requery() {
        this.setState({ isLoadingCalendar: true })
        Promise.all([
            TripsService.getTrips(),
            TripsCache.getCachedTripIds()
        ]).then(values => {
            const trips: ITrip[] = values[0]
            const cachedTripIds: number[] = values[1]

            this.setState({ trips, cachedTripIds, isLoadingCalendar: false })
            this.props.setCachedTrips(trips.filter(trip => cachedTripIds.includes(trip.id)))
        })
    }

    public componentDidMount() {
        this.requery()
    }

    public showItem(item: ICalendarItem) {
        const state = this.state
        const trip = item.trip as ITrip

        if (trip.id === state.selected) {
            return true
        }

        return (state.openClose || item.field === 'tripDate')
            && ((state.state === StateFilter.MyTrips && trip.state === 'MyTrip') ||
                (state.state === StateFilter.Open && trip.state === 'Open') ||
                (state.state === StateFilter.Suggested && trip.state <= 'SuggestedTrip') ||
                (state.state === StateFilter.All))
            && ((state.length === LengthFilter.Day && !trip.isSocial && trip.length === 1) ||
                (state.length === LengthFilter.Weekend && !trip.isSocial && trip.length > 1) ||
                (state.length === LengthFilter.Trips && !trip.isSocial) ||
                (state.length === LengthFilter.Social && trip.isSocial) ||
                (state.length === LengthFilter.All))
    }

    public render() {

        if (this.state.isLoadingCalendar) {
            return this.props.loadingStatus({ ...this.state })
        }

        const config = ConfigService.Config
        const state = this.state
        const toggleShowDropdown = () => this.setState({ showDropdownIsOpen: !this.state.showDropdownIsOpen });
        const StateItem = (props: { field: string, value: any, toggle?: boolean, children: any }) => {
            const onClick =
                () => this.setState({ [props.field]: props.toggle ? !state[props.field] : props.value } as any)
            return (
                <DropdownItem onClick={onClick}>
                    <span className={state[props.field] === props.value ? 'fa fa-check' : 'fa fa-fw'} />{props.children}
                </DropdownItem>
            )
        }

        this.processTrips()

        const filterElement: JSX.Element = (
            <Dropdown key='filterDropdown' nav={true} isOpen={this.state.showDropdownIsOpen} toggle={toggleShowDropdown}>
                <DropdownToggle className="triphub-navbar" nav={true} caret={true}>
                    <span className='fa fa-filter' />&nbsp; Filter trips
                </DropdownToggle>
                <DropdownMenu color='primary'>
                    <DropdownItem header={true}>Trip State</DropdownItem>
                    <StateItem field='state' value={StateFilter.MyTrips}>Mine</StateItem>
                    <StateItem field='state' value={StateFilter.Open}>Open</StateItem>
                    <StateItem field='state' value={StateFilter.Suggested}>Suggested</StateItem>
                    <StateItem field='state' value={StateFilter.All}>All</StateItem>
                    <DropdownItem divider={true} />
                    <DropdownItem header={true}>Trip Length/Type</DropdownItem>
                    <StateItem field='length' value={LengthFilter.Day}>Day</StateItem>
                    <StateItem field='length' value={LengthFilter.Weekend}>Weekend</StateItem>
                    <StateItem field='length' value={LengthFilter.Trips}>Trip</StateItem>
                    <StateItem field='length' value={LengthFilter.Social}>Social</StateItem>
                    <StateItem field='length' value={LengthFilter.All}>All</StateItem>
                    <DropdownItem divider={true} />
                    <StateItem field='openClose' value={true} toggle={true}>Show open and close dates</StateItem>
                </DropdownMenu>
            </Dropdown>)

        return [
            <PriorityNavItem key='filter'>
                {filterElement}
            </PriorityNavItem>,

            <Container className={ConfigService.containerClassName} key='calendar' fluid={true}>
                <Table className='calendar' responsive={true}>
                    <tbody>
                        <tr>
                            <td className='label' />
                            {DayOfWeek.map((_, i) => <td key={i} className='label'>
                                {DayOfWeek[(i + config.calendarStartOfWeek) % 7]}
                            </td>)}
                        </tr>
                        {this.weeks.map(week => <CalendarWeek key={week.date.toISOString().substring(0, 10)} 
                            week={week} 
                            calendar={this}
                            role={this.props.role}
                            isOnline={this.props.isOnline}
                            cachedTripIds={this.state.cachedTripIds}
                            setPath={this.props.setPath} />)}
                    </tbody>
                </Table>
            </Container>
        ]
    }
}
