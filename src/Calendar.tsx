import * as React from 'react';
import { Component } from 'react';
import { App } from './App';
import { BaseUrl } from '.';
import { ITrip, TripState, Role } from './Interfaces';
import { MonthOfYear, DayOfWeek, AddDays, GetDateString, CountWhile } from './Utilities';
import Button from 'reactstrap/lib/Button';
import ButtonGroup from 'reactstrap/lib/ButtonGroup';
import Table from 'reactstrap/lib/Table';
import { TriphubNavbar } from './TriphubNavBar';
import Badge from 'reactstrap/lib/Badge';
import { Spinner } from './Widgets';
import Dropdown from 'reactstrap/lib/Dropdown';
import DropdownToggle from 'reactstrap/lib/DropdownToggle';
import DropdownMenu from 'reactstrap/lib/DropdownMenu';
import DropdownItem from 'reactstrap/lib/DropdownItem';
import Container from 'reactstrap/lib/Container';
import { ButtonWithTooltip } from './MapEditor';

interface ICalendarItem {
    id: number
    date: Date
    field: string
    trip: ITrip
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
},{
}> {
    constructor(props: any){
        super(props)
    }

    public render(){
        const rowCount = Math.max(...this.props.week.days.map(w => w.length))
        const week = this.props.week.date
        const days = this.props.week.days
        const label = week.getMonth() === AddDays(week,-7).getMonth() ? '' : MonthOfYear[week.getMonth()] 
        const rows = []

        for (let row = 0; row < rowCount; row++)
        {
            const cells = row === 0 ? [<td key={GetDateString(this.props.week.date)} 
                                            className='calendar label' rowSpan={rowCount}>{label}</td>] : []

            for (let col = 0; col < 7;) {
                let colSpan = 1
                const date = AddDays(week,col)                
                const items = days[col][row] || []
                const slots = []
                const onDrop = (ev:any) => {
                    const item = this.props.calendar.items[ev.dataTransfer.getData('id')]
                    const trip = {...item.trip, [item.field]: GetDateString(date)}
                    const before = this.props.calendar.props.app.validateTrip(item.trip).find(i => i.id === item.field && !i.ok)
                    const after = this.props.calendar.props.app.validateTrip(trip).find(i => i.id === item.field && !i.ok)
        
                    if (!before && after &&
                        !window.confirm('Trip validation resulted in this message:\n\n' + after.message + '\n\nproceed anyway?')) {
                        return
                    }

                    const trips = [...this.props.calendar.state.trips]

                    trips[trips.indexOf(item.trip)] = trip

                    this.props.calendar.props.app.apiCall('POST', `${BaseUrl}/trips/${item.trip.id}`, {[item.field]: item.trip[item.field]})
                    this.props.calendar.setState({trips})
                }

                for (const item of items) {

                    if (item.field === '') {
                        slots.push(<span key={item.id}>{item.text}</span>)
                        continue
                    }

                    colSpan = CountWhile(x => col+x < 7 && days[col+x][row] && days[col+x][row].indexOf(item) >= 0);

                    const text = item.text

                    const onLink = () => this.props.calendar.props.app.setPath('/trips/' + item.trip.id)
                    const onSelect = () => this.props.calendar.setState({selected: item.trip.id})
                    const onDragStart = (ev:any) => ev.dataTransfer.setData('id', item.id)
                    const isSelected = item.trip && this.props.calendar.state.selected === item.trip.id

                    slots.push(' ')
                    slots.push(
                        <Badge key={item.id} id={`badge${item.id}`} onDragStart={onDragStart} 
                                draggable={this.props.calendar.props.app.state.role >= Role.Admin}
                                className={isSelected ? 'selected' : ''}>
                                    <span>
                                    {item.field !== 'tripDate' ? 
                                        <span>{text}</span> : 
                                        <ButtonGroup className='calendar-trip-buttons'>
                                            <ButtonWithTooltip id={`open-${item.id}`} onClick={onLink} tooltipText="Open trip">
                                                <span className='fas fa-hiking'/>  
                                            </ButtonWithTooltip>
                                            <div className='calendar-trip-name'>
                                                <ButtonWithTooltip id={`select-${item.id}`} color='transparent' onClick={onSelect} tooltipText={text}>
                                                    {text}  
                                                </ButtonWithTooltip>
                                            </div>
                                        </ButtonGroup>}
                                    </span>
                        </Badge>)
                }

                const isToday = GetDateString(date) === GetDateString(new Date())
                const isWeekend = this.props.calendar.props.app.state.holidayMap[GetDateString(date)] || 
                                    date.getDay() === 0 || date.getDay() === 6
                const className= (isToday ? 'today' : MonthOfYear[date.getMonth()].toLowerCase() + (isWeekend ? 'weekend' : '')) 
                                    + ' ' + (row === 0 ? 'top' : '')
                const onDragOver = (ev:any) => ev.preventDefault()

                cells.push(<td colSpan={colSpan} key={col} onDragOver={onDragOver} onDrop={onDrop} className={className}>
                                {slots}</td>)
                col += colSpan
            }

            rows.push(<tr key={`${week.toISOString()}_${row}`}>{cells}</tr>)
        }

        return rows
    }
}

export class Calendar extends Component<{
        app: App
    },{
        trips: ITrip[];
        showDropdownIsOpen: boolean
        openClose: boolean
        state: StateFilter
        length: LengthFilter
        selected: number
    }>{
    public weeks: ICalendarWeek[]
    public items: ICalendarItem[]

    constructor(props: any){
        super(props)
        this.state = {
            showDropdownIsOpen: false,
            openClose: false,
            length: LengthFilter.Trips, 
            state: StateFilter.Open, 
            selected: 0, trips: [],
        }
        this.processTrips = this.processTrips.bind(this)
        this.requery = this.requery.bind(this)
        this.showItem = this.showItem.bind(this)
    }

    public dayIndex(date : Date) : number {
        return (date.getDay() - this.props.app.state.config.calendarStartOfWeek + 7) % 7
    }

    public processTrips() {
        const weeks : ICalendarWeek[] = []
        let items : ICalendarItem[] = []

        for (const trip of this.state.trips) {
            if (!trip.isSocial || !trip.isNoSignup) {
                items.push({id: 0, date: new Date(trip.openDate), text: 'O', field: 'openDate', trip, 
                            tooltip: 'Open date for ' + trip.title, length: 1})
                items.push({id: 0, date: new Date(trip.closeDate), text: 'C', field: 'closeDate', trip, 
                            tooltip: 'Close date for ' + trip.title, length: 1})
            }

            items.push({id: 0, date: new Date(trip.tripDate), field: 'tripDate', trip, text: trip.title, 
                        tooltip: trip.title, length: trip.length})
        }

        if (items.length)
        {
            const min = new Date(Math.min(...items.map( i => i.date.getTime())))
            const max = new Date(Math.max(...items.map( i => AddDays(i.date, i.length-1).getTime())))
            const start = AddDays(min,-this.dayIndex(min)-14)
            const stop = AddDays(max,-this.dayIndex(max)+14+6)
            const datemap : {[key:string]:ICalendarItem[][]} = {}

            items = items.filter(this.showItem)

            for (let date = start; date <= stop; date = AddDays(date,1)) {
                items.push({id:0,date,text:`${date.getDate()}`, field:'',tooltip:'',length:1,trip: null as unknown as ITrip})
                datemap[GetDateString(date)] = [[]]
            }

            items.sort((a,b) => a.field < b.field ? -1 : a.field > b.field ? 1 : 0)
            items.forEach((item,i) => item.id = i)

            for (const item of items) {
                if (item.field === 'tripDate') {
                    // Find a clear slot
                    for (let index = 0; ; index++) {
                        if (CountWhile(x => x < item.length && !datemap[GetDateString(AddDays(item.date,x))][index]) === item.length) {
                            // Claim it
                            for (let span = 0; span < item.length; span++) {
                                datemap[GetDateString(AddDays(item.date,span))][index] = [item]
                            }
                            break
                        }
                    }
                } else {
                    const date = datemap[GetDateString(item.date)]
                    if (date[date.length-1].length === 5) {
                        date.push([])
                    }
                    date[date.length-1].push(item)
                }
            }

            for (let date = start; date <= stop; date = AddDays(date,7)) {
                const week : ICalendarWeek = {date, days: []}
                weeks.push(week)
                for (let i = 0; i < 7; i++) {
                    week.days.push(datemap[GetDateString(AddDays(date,i))])
                }
            }
        }

        this.weeks = weeks
        this.items = items
    }

    public requery() {
        this.props.app.setStatus(['Loading ', Spinner])
        this.props.app.apiCall('GET',BaseUrl + '/trips')
        .then((trips:ITrip[]) => {
            this.props.app.setStatus('Loaded', 3000)
            this.props.app.setState({isLoading:false})
            this.setState({trips})
        })
    }

    public componentDidMount(){
        this.requery()
    }

    public showItem(item : ICalendarItem) {
        const state = this.state
        const trip = item.trip

        if (trip.id === state.selected) {
            return true
        }

        return  (state.openClose || item.field === 'tripDate')
            && ((state.state === StateFilter.MyTrips && trip.tripState === TripState.MyTrip) ||
                (state.state === StateFilter.Open && trip.isOpen) ||
                (state.state === StateFilter.Suggested && trip.tripState <= TripState.SuggestedTrip) ||
                (state.state === StateFilter.All)) 
            && ((state.length === LengthFilter.Day && !trip.isSocial && trip.length === 1) ||
                (state.length === LengthFilter.Weekend && !trip.isSocial && trip.length > 1) ||
                (state.length === LengthFilter.Trips && !trip.isSocial) ||
                (state.length === LengthFilter.Social && trip.isSocial) ||
                (state.length === LengthFilter.All))
    }

    public render(){

        const config = this.props.app.state.config
        const state = this.state
        const toggleShowDropdown = () => this.setState({showDropdownIsOpen: !this.state.showDropdownIsOpen});
        const toggelShowOpenAndCloseDates = () => this.setState({openClose: !this.state.openClose})
        const stateFilterMyTrips = () => this.setState({state: StateFilter.MyTrips})
        const stateFilterOpen = () => this.setState({state: StateFilter.Open})
        const stateFilterSuggested = () => this.setState({state: StateFilter.Suggested})
        const stateFilterAll = () => this.setState({state: StateFilter.All})
        const lengthFilterDay = () => this.setState({length: LengthFilter.Day})
        const lengthFilterWeekend = () => this.setState({length: LengthFilter.Weekend})
        const lengthFilterTrips = () => this.setState({length: LengthFilter.Trips})
        const lengthFilterSocial = () => this.setState({length: LengthFilter.Social})
        const lengthFilterAll = () => this.setState({length: LengthFilter.All})

        this.processTrips()


        const filterElement: JSX.Element = (
            <Dropdown key='filterDropdown' nav={true} isOpen={this.state.showDropdownIsOpen} toggle={toggleShowDropdown}>
                <DropdownToggle className="triphub-navbar" nav={true} caret={true}>
                    <span className='fa fa-filter'/> 
                    &nbsp; Filter trips
                </DropdownToggle>
                <DropdownMenu color='primary'>

                    <DropdownItem header={true}>Trip State</DropdownItem>
                    <DropdownItem onClick={stateFilterMyTrips}>
                        <span className={'fa ' + (state.state === StateFilter.MyTrips ? 'fa-check' : 'fa-fw') + ' fa-fw'}/>Mine</DropdownItem>
                    <DropdownItem onClick={stateFilterOpen}>
                        <span className={'fa ' + (state.state === StateFilter.Open ? 'fa-check' : 'fa-fw') + ' fa-fw'}/>Open</DropdownItem>
                    <DropdownItem onClick={stateFilterSuggested}>
                        <span className={'fa ' + (state.state === StateFilter.Suggested ? 'fa-check' : 'fa-fw') + ' fa-fw'}/>Suggested</DropdownItem>
                    <DropdownItem onClick={stateFilterAll}>
                        <span className={'fa ' + (state.state === StateFilter.All ? 'fa-check' : 'fa-fw') + ' fa-fw'}/>All</DropdownItem>

                    <DropdownItem divider={true}/>
                    <DropdownItem header={true}>Trip Length/Type</DropdownItem>
                    <DropdownItem onClick={lengthFilterDay}>
                        <span className={'fa ' + (state.length === LengthFilter.Day ? 'fa-check' : 'fa-fw') + ' fa-fw'}/>Day</DropdownItem>
                    <DropdownItem onClick={lengthFilterWeekend}>
                        <span className={'fa ' + (state.length === LengthFilter.Weekend ? 'fa-check' : 'fa-fw') + ' fa-fw'}/>Weekend</DropdownItem>
                    <DropdownItem onClick={lengthFilterTrips}>
                        <span className={'fa ' + (state.length === LengthFilter.Trips ? 'fa-check' : 'fa-fw') + ' fa-fw'}/>Trip</DropdownItem>
                    <DropdownItem onClick={lengthFilterSocial}>
                        <span className={'fa ' + (state.length === LengthFilter.Social ? 'fa-check' : 'fa-fw') + ' fa-fw'}/>Social</DropdownItem>
                    <DropdownItem onClick={lengthFilterAll}>
                        <span className={'fa ' + (state.length === LengthFilter.All ? 'fa-check' : 'fa-fw') + ' fa-fw'}/>All</DropdownItem>

                    <DropdownItem divider={true}/>
                    <DropdownItem onClick={toggelShowOpenAndCloseDates}>
                        <span className={'fa ' + (state.openClose ? 'fa-check' : 'fa-fw') + ' fa-fw'}/>Show open and close dates</DropdownItem>
                </DropdownMenu>
            </Dropdown>)

        return [
            <TriphubNavbar key='triphubNavbar' app={this.props.app} priorityNavItems={[filterElement]}/>,

            <Container key='calendar' fluid={true}>
                <Table className='calendar' responsive={true}>
                    <tbody>
                        <tr>
                            <td className='label'/>
                            {DayOfWeek.map((_,i) => <td key={i} className='label'>
                                                        {DayOfWeek[(i + config.calendarStartOfWeek) % 7]}
                                                    </td>)}
                        </tr>
                        {this.weeks.map(week => <CalendarWeek key={week.date.toISOString().substr(0,10)} week={week} calendar={this}/>)}
                    </tbody>
                </Table>
            </Container>
        ]
    }
}
