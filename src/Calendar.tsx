import * as React from 'react';
import { Component } from 'react';
import { App } from './App';
import { Spinner, BaseUrl } from '.';
import { ITrip, TripState } from './Interfaces';
import { MonthOfYear, DayOfWeek, AddDays, GetDateString } from './Utilities';
import Button from 'reactstrap/lib/Button';
import Badge from 'reactstrap/lib/Badge';
import ButtonGroup from 'reactstrap/lib/ButtonGroup';
import { TripsGroup } from './TripsList';
import Table from 'reactstrap/lib/Table';
import { TriphubNavbar } from './TriphubNavBar';
import { ToolTipIcon } from './ToolTipIcon';

interface ICalendarItem {
    id: number
    date: Date
    type: string
    trip: ITrip
    tooltip: string
}

interface ICalendarWeek {
    date: Date
    label: string
    days: ICalendarItem[][]
}

export enum StateFilter { MyTrips, Open, Suggested, All }
export enum LengthFilter { Day, Weekend, All }
export interface ICalendarFilter {
    show_open_and_close: boolean
    state_filter: StateFilter
    length_filter: LengthFilter
    selected_id?: number
    hover_id?: number
}

class CalendarItem extends Component<{
    item: ICalendarItem
    calendar: Calendar
},{
}> {
    constructor(props: any){
        super(props)
    }

    public render(){
        const item = this.props.item
        const trip = item.trip
        const app = this.props.calendar.props.app
        const filter = app.state.calendarFilter
        const selected = (filter.hover_id || filter.selected_id) === trip.id
        const hidden = (!filter.show_open_and_close && (item.type === 'O' || item.type === 'C') && !selected) ||
                       (filter.state_filter === StateFilter.MyTrips && trip.trip_state !== TripState.My_Trip) ||
                       (filter.state_filter === StateFilter.Open && !trip.is_open) ||
                       (filter.state_filter === StateFilter.Suggested && trip.trip_state > TripState.Suggested_Trip) ||
                       (filter.length_filter === LengthFilter.Day && trip.length !== 1) ||
                       (filter.length_filter === LengthFilter.Weekend && trip.length === 1)
        const onMouseEnter = () => app.setState({calendarFilter:{...filter, hover_id: trip.id}})
        const onMouseLeave = () => app.setState({calendarFilter:{...filter, hover_id: undefined}})
        const onClick = () => app.setState({calendarFilter:{...filter, selected_id: filter.selected_id === trip.id ? undefined : trip.id, 
                                                                       hover_id: undefined}})
        const onDragStart = (ev:any) => ev.dataTransfer.setData('id', item.id)

        return (
            <span onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onClick}>
                <ToolTipIcon key={item.id} id={'calendaritem' + item.id} tooltip={item.tooltip}>
                    <Badge pill={true} color={selected ? 'light' : 'dark'} className={hidden ? 'calendar-hidden' : ''}
                        onDragStart={onDragStart} draggable={true}>
                        {item.type}
                    </Badge>
                </ToolTipIcon>
            </span>
        )
    }
}

class CalendarDate extends Component<{
    date: Date
    items: ICalendarItem[]
    calendar: Calendar
},{
}> {
    constructor(props: any){
        super(props)
    }

    public render(){

        const app = this.props.calendar.props.app
        const is_today = GetDateString(this.props.date) === GetDateString(new Date())

        const onDragOver = (ev:any) => {
            ev.preventDefault()
        }

        const onDrop = (ev:any) => {
            const item = this.props.calendar.state.items[ev.dataTransfer.getData('id')]
            const field = item.type === 'O' ? 'open_date' : item.type === 'C' ? 'close_date' : 'trip_date'
            const trip = {...item.trip, [field]: GetDateString(this.props.date)}
            const before = app.validateTrip(item.trip).find(i => i.id === field && !i.ok)
            const after = app.validateTrip(trip).find(i => i.id === field && !i.ok)

            if (!before && after &&
                !window.confirm('Trip validation resulted in this message:\n\n' + after.message + '\n\nproceed anyway?')) {
                return
            }

            item.trip[field] = trip[field]
            app.apiCall('POST', item.trip.href as string, {[field]: item.trip[field]})
            this.props.calendar.process_trips(this.props.calendar.state.trips)
        }

        return (
            <td className={'calendar-' + (is_today ? 'today' : MonthOfYear[this.props.date.getMonth()].toLowerCase())} 
                onDragOver={onDragOver} onDrop={onDrop}>
                {this.props.date.getDate()}
                <br/>
                {this.props.items.map(date => <CalendarItem key={date.id} item={date} calendar={this.props.calendar}/>)}
            </td>
        )
    }
}

class CalendarWeek extends Component<{
    week: ICalendarWeek
    calendar: Calendar
},{
    selected: boolean
}> {
    constructor(props: any){
        super(props)
        this.state = {selected: false}
    }

    public render(){
        const week = this.props.week
        return (
            <tr key={week.date.toISOString()}>
                <td className='calendar-label'>{week.label}</td>
                {week.days.map((items,i) => <CalendarDate key={i} date={AddDays(week.date,i)} items={items} calendar={this.props.calendar}/>)}
            </tr>
        )
    }
}

export class Calendar extends Component<{
        app: App,
        router: any
    },{
        trips: ITrip[]
        weeks: ICalendarWeek[]
        items: ICalendarItem[]
    }>{
    constructor(props: any){
        super(props)
        this.state = {trips:[], weeks:[], items:[]}
        this.process_trips = this.process_trips.bind(this)
        this.requery = this.requery.bind(this)
    }

    public process_trips(trips: ITrip[]) {
        const weeks : ICalendarWeek[] = []
        const items : ICalendarItem[] = []

        for (const trip of trips) {
            items.push({date:new Date(trip.open_date), type: 'O', trip, id: 0, tooltip: 'Open date for ' + trip.title})
            items.push({date:new Date(trip.close_date), type: 'C', trip, id: 0, tooltip: 'Close date for ' + trip.title})

            const type = trip.length === 1 ? 'D' : trip.length === 2 ? 'WE' : 'LW'

            for (let i = 0; i < trip.length; i++) {
                items.push({date:AddDays(new Date(trip.trip_date),i), type, trip, id: 0, tooltip: trip.title})
            }
        }

        if (items.length)
        {
            items.sort((a,b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0)

            const start = AddDays(items[0].date,-items[0].date.getDay()-14)
            const stop = AddDays(items[items.length-1].date,-items[items.length-1].date.getDay()+14)
            const weekmap : {[key:string]:ICalendarWeek} = {}

            for (let date = start; date <= stop; date = AddDays(date,7)) {
                weeks.push({date, 
                    label: !weeks.length || date.getMonth() !== AddDays(date,-7).getMonth() ? MonthOfYear[date.getMonth()] : '',
                    days: [[],[],[],[],[],[],[]]})
                weekmap[date.toISOString()] = weeks[weeks.length-1]
            }

            items.forEach((item,i) => item.id = i)
            items.forEach((item,i) => weekmap[AddDays(item.date,-item.date.getDay()).toISOString()].days[item.date.getDay()].push(item))
        }

        this.setState({trips, weeks, items})
    }

    public requery() {
        this.props.app.setStatus(['Loading ', Spinner])
        this.props.app.apiCall('GET',BaseUrl + '/trips')
        .then((trips:ITrip[]) => {
            this.process_trips(trips)
            this.props.app.setStatus('Loaded', 3000)
            this.props.app.setState({loading:false})
        })
    }

    public componentDidMount(){
        this.requery()
    }

    public render(){


        const app = this.props.app
        const filter = app.state.calendarFilter
        const selected_trip = this.state.trips.find(trip => filter.selected_id === trip.id)
        const showOpenAndClose = () => app.setState({calendarFilter:{...filter, show_open_and_close: true}})
        const hideOpenAndClose = () => app.setState({calendarFilter:{...filter, show_open_and_close: false}})
        const stateFilterMyTrips = () => app.setState({calendarFilter:{...filter, state_filter: StateFilter.MyTrips}})
        const stateFilterOpen = () => app.setState({calendarFilter:{...filter, state_filter: StateFilter.Open}})
        const stateFilterSuggested = () => app.setState({calendarFilter:{...filter, state_filter: StateFilter.Suggested}})
        const stateFilterAll = () => app.setState({calendarFilter:{...filter, state_filter: StateFilter.All}})
        const lengthFilterDay = () => app.setState({calendarFilter:{...filter, length_filter: LengthFilter.Day}})
        const lengthFilterWeekend = () => app.setState({calendarFilter:{...filter, length_filter: LengthFilter.Weekend}})
        const lengthFilterAll = () => app.setState({calendarFilter:{...filter, length_filter: LengthFilter.All}})
        const open_and_close = filter.show_open_and_close
        const state = filter.state_filter
        const length = filter.length_filter

        return [
            <TriphubNavbar key='triphubNavbar' app={this.props.app} router={this.props.router}>
                <ButtonGroup>
                    <Button color='primary' disabled={true}>Show open and close dates:</Button>
                    <Button color='primary' onClick={showOpenAndClose} active={open_and_close}>Yes</Button>
                    <Button color='primary' onClick={hideOpenAndClose} active={!open_and_close}>No</Button>
                </ButtonGroup>
                <ButtonGroup>
                    <Button color='primary' disabled={true}>Trip Filter:</Button>
                    <Button color='primary' onClick={stateFilterMyTrips} active={state === StateFilter.MyTrips}>My Trips</Button>
                    <Button color='primary' onClick={stateFilterOpen} active={state === StateFilter.Open}>Open</Button>
                    <Button color='primary' onClick={stateFilterSuggested} active={state === StateFilter.Suggested}>Suggested</Button>
                    <Button color='primary' onClick={stateFilterAll} active={state === StateFilter.All}>All</Button>
                </ButtonGroup>
                <ButtonGroup>
                    <Button color='primary' disabled={true}>Length Filter:</Button>
                    <Button color='primary' onClick={lengthFilterDay} active={length === LengthFilter.Day}>Day</Button>
                    <Button color='primary' onClick={lengthFilterWeekend} active={length === LengthFilter.Weekend}>Weekend</Button>
                    <Button color='primary' onClick={lengthFilterAll} active={length === LengthFilter.All}>All</Button>
                </ButtonGroup>
            </TriphubNavbar>,
            <Table key='calendar' className='calendar'>
                <tbody>
                    <tr>
                        <td className='calendar-label'/>
                        {DayOfWeek.map((dow) => <td key={dow} className='calendar-label'>{dow}</td>)}
                    </tr>
                    {this.state.weeks.map(week => <CalendarWeek key={week.date.toISOString().substr(0,10)} week={week} calendar={this}/>)}
                </tbody>
            </Table>,
            selected_trip === undefined ? '' :
            <TripsGroup key='selectedtrip' trips={[selected_trip]} app={app} router={this.props.router} expanded={true}/>
        ]
    }
}
