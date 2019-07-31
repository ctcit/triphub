import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import { Component } from 'react';
import * as React from 'react';
import { BaseOpt, BaseUrl, Spinner } from '.';
import { IMember, IConfig, IMap, ITrip, IValidation, IParticipant } from './Interfaces';
import { Trip } from './Trip';
import { TripsList } from './TripsList';
import { Calendar, ICalendarFilter, StateFilter, LengthFilter } from './Calendar';
import { Route, Switch } from 'react-router-dom';

export class App extends Component<{
    },{
      status?: any,
      statusShow?: boolean,
      loading: boolean,
      members: IMember[],
      membersById: { [id: number]: IMember },
      maps: IMap[],
      config: IConfig,
      statusId?: any,
      calendarFilter: ICalendarFilter
    }> {

      public trip: React.RefObject<Trip>
      public triplist: React.RefObject<TripsList>
      public calendar: React.RefObject<Calendar>

      constructor(props: any){
        super(props)
        this.state = {
            config: { edit_refresh_in_sec: 10, print_lines: 25 },
            loading: true,
            members: [],
            membersById: {},
            maps: [],
            status: ['Loading ', Spinner],
            statusShow: true,
            calendarFilter: {show_open_and_close:false, state_filter:StateFilter.Open, length_filter: LengthFilter.All}
        }
        this.setStatus = this.setStatus.bind(this) 
        this.apiCall = this.apiCall.bind(this)
        this.getMembers = this.getMembers.bind(this)
        this.getMe = this.getMe.bind(this)
        this.trip = React.createRef()
        this.triplist = React.createRef()
        this.calendar = React.createRef()
    }

    public setStatus(status : any, keepFor? : number) {
        if (this.state.statusId !== undefined) {
            clearTimeout(this.state.statusId)
        }
        this.setState({status, statusShow: true})
        this.setState({statusId: keepFor && setTimeout(() => this.setState({statusShow: false}), keepFor)})
    }

    public async apiCall(method:string, url:string, data?:any, isTripEdit?: boolean): Promise<any> {
        if (isTripEdit && this.trip.current && this.trip.current.state.edit_href && !this.trip.current.state.edit_is_edited) {
            this.trip.current.setState({edit_is_edited: true})
        }

        const request : RequestInit = { headers: BaseOpt }
        
        if (data) {
            request.method = method
            request.headers = {...request.headers, 'Content-Type': 'application/json'}
            request.body = JSON.stringify(data)
        }
        
        url += isTripEdit && this.trip.current ? '?edit_id=' + this.trip.current.state.edit_id : ''
        console.log(`${method} ${url}`)
        const result = await fetch(url, request);
        const text = await result.text()

        try {
            return JSON.parse(text);
        }
        catch (ex){
            console.log(text)
            return null
        }
    }
    
    public getMembers() : IMember[] {
        return this.state.members
    }

    public getMe() : IMember {
        return this.state.members.find((m:IMember) => m.is_me) || {} as unknown as IMember
    }

    public getMemberById(id: number) : IMember {
        return this.state.membersById[id] || {"id":id,"name":`member ${id}`} as IMember
    }

    public getMaps() : IMap[] {
        return this.state.maps
    }

    public validateTrip(trip : ITrip) : IValidation[] {

        return this.getMe().role ? [
            {id:'title', ok: !trip.is_deleted, message: 'This trip has been deleted'},
            ...this.mandatory(trip,['title','grade','description','departure_point','cost']),
            {id:'length', ok: trip.length >= 1 && trip.length <= 7, message:'Length should be between 1 and 7 days'},
            {id:'open_date', ok: trip.open_date <= trip.close_date, message:'Open date must be on or before Close date'},
            {id:'close_date', ok: trip.open_date <= trip.close_date, message:'Open date must be on or before Close date'},
            {id:'close_date', ok: trip.close_date <= trip.trip_date, message:'Close date must be on or before Trip date'},
            {id:'trip_date', ok: trip.close_date <= trip.trip_date, message:'Close date must be on or before Trip date'},
            {id:'max_participants', ok: trip.max_participants >=0, message:'Max Participants must not be negative'},
        ] : []
    }

    public validateParticipant(participant : IParticipant) : IValidation[] {
        return [
            {id:'vehicle_rego',ok:!participant.is_vehicle_provider || participant.vehicle_rego !== '',message:'Rego must be specified'}
        ]
    }
    
    public mandatory(obj: any, ids: string[]) : IValidation[]{
        return ids.map(id => ({id, ok: obj[id] !== '', message: this.titleFromId(id) + ' must be entered'}))
    }

   public componentDidMount() {
        this.apiCall('GET',BaseUrl + '/members')
            .then((data : IMember[]) => {

                const membersById: {[id: number]: IMember} = {}

                for (const member of data) {
                    membersById[member.id] = member
                }

                this.setState({members:data, membersById})
            })
        this.apiCall('GET',BaseUrl + '/config')
            .then(config => {
                this.setState({config:config[0]})
            });
        this.apiCall('GET',BaseUrl + '/maps')
            .then(maps => {
                this.setState({maps})
            });
    }

    public render(){

        const renderTripList = (props : any) => <TripsList app={this} router={props}/> 
        const renderCalendar = (props : any) => <Calendar app={this} router={props}/> 
        const renderNewTrip = (props : any) => <Trip app={this} router={props} is_new={true}/> 
        const renderTrip = (props : any) => <Trip app={this} router={props} 
                                                  is_new={false} href={BaseUrl + '/trips/' + props.match.params.id}/> 

        return <Switch>
            <Route exact={true} path='/' render={renderTripList} />
            <Route path='/calendar' render={renderCalendar}/>
            <Route path='/newtrip' render={renderNewTrip}/>
            <Route path='/:id' render={renderTrip}/>
        </Switch>
    }

    private titleFromId(id:string) : string {
        return id.replace('_',' ').replace(/\b\w/,x => x.toUpperCase())
    }
}
