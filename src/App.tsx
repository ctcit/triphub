import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import { Component } from 'react';
import * as React from 'react';
import { BaseOpt, BaseUrl, Spinner } from '.';
import { IMember, IConfig, IMap, ITrip, IValidation, IParticipant, IHoliday } from './Interfaces';
import { Trip } from './Trip';
import { TripsList } from './TripsList';
import { Calendar } from './Calendar';
import { TitleFromId } from './Utilities';
import { TriphubNavbar } from './TriphubNavBar';
import { Newsletter } from './Newsletter';
import { NewsletterList } from './NewsletterList';

export class App extends Component<{
    },{
      status?: any
      statusShow?: boolean
      path : string
      isLoading: boolean
      isLoadingConfig: boolean
      isLoadingMaps: boolean
      isLoadingMembers: boolean
      isLoadingHolidays: boolean
      isPrivileged: boolean
      members: IMember[]
      membersById: { [id: number]: IMember }
      maps: IMap[]
      holidayMap: { [id: string]: IHoliday }
      config: IConfig
      statusId?: any
    }> {
      public trip: React.RefObject<Trip>
      public triplist: React.RefObject<TripsList>
      public calendar: React.RefObject<Calendar>

      constructor(props: any){
        super(props)
        this.state = {
            config: { editRefreshInSec: 10, printLines: 25, calendarStartOfWeek: 1 },
            path: window.location.hash.replace('#',''),
            isLoading: false,
            isLoadingConfig: true,
            isLoadingMaps: true,
            isLoadingMembers: true,
            isLoadingHolidays: true,
            isPrivileged: false,
            members: [],
            membersById: {},
            maps: [],
            holidayMap: {},
            status: ['Loading ', Spinner],
            statusShow: true,
        }
        this.setStatus = this.setStatus.bind(this) 
        this.apiCall = this.apiCall.bind(this)
        this.getMembers = this.getMembers.bind(this)
        this.getMe = this.getMe.bind(this)
        this.getMaps = this.getMaps.bind(this)
        this.trip = React.createRef()
        this.triplist = React.createRef()
        this.calendar = React.createRef()
    }

    public setStatus(status : any, keepFor? : number) : void {
        if (this.state.statusId !== undefined) {
            clearTimeout(this.state.statusId)
        }
        this.setState({status, statusShow: true,
                        statusId: keepFor && setTimeout(() => this.setState({statusShow: false}), keepFor)})
    }

    public setPath(path: string) : void {
        window.location.hash = "#" + path
        window.scrollTo(0,0)
        this.setState({path})
    }
    
    public async apiCall(method:string, url:string, data?:any, isTripEdit?: boolean): Promise<any> {
        if (isTripEdit && this.trip.current && this.trip.current.state.editHref && !this.trip.current.state.editIsEdited) {
            this.trip.current.setState({editIsEdited: true})
        }

        const request : RequestInit = /localhost/.test(`${window.location}`) ? { headers: BaseOpt } : {}
        
        if (data) {
            request.method = method
            request.headers = {...request.headers, 'Content-Type': 'application/json'}
            request.body = JSON.stringify(data)
        }
        
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
        return this.state.members.find((m:IMember) => m.isMe) || {} as unknown as IMember
    }

    public getMemberById(id: number) : IMember {
        return this.state.membersById[id] || {id,name:'Anonymous'} as IMember
    }

    public getMaps() : IMap[] {
        return this.state.maps
    }

    public validateTrip(trip : ITrip) : IValidation[] {

        return this.state.isPrivileged && !this.state.isLoading ? [
            {id:'title', ok: !trip.isDeleted, message: 'This trip has been deleted'},
            ...this.mandatory(trip,['title','description']),
            ...this.mandatory(trip,trip.isSocial ? [] : ['cost','grade','departure_point']),
            {id:'length', ok: trip.length >= 1 && trip.length <= 14, message:'Length should be between 1 and 14 days'},
            {id:'openDate', ok: trip.openDate <= trip.closeDate, message:'Open date must be on or before Close date'},
            {id:'closeDate', ok: trip.openDate <= trip.closeDate, message:'Open date must be on or before Close date'},
            {id:'closeDate', ok: trip.closeDate <= trip.tripDate, message:'Close date must be on or before Trip date'},
            {id:'tripDate', ok: trip.closeDate <= trip.tripDate, message:'Close date must be on or before Trip date'},
            {id:'maxParticipants', ok: trip.maxParticipants >= 0, message:'Max Participants must not be negative'},
        ] : []
    }

    public validateParticipant(participant : IParticipant) : IValidation[] {
        return [
            {id:'vehicleRego',ok:!participant.isVehicleProvider || participant.vehicleRego !== '',message:'Rego must be specified'}
        ]
    }
    
    public mandatory(obj: any, ids: string[]) : IValidation[]{
        return ids.map(id => ({id, ok: obj[id] !== '', message: TitleFromId(id) + ' must be entered'}))
    }

    public requeryMembers() : void {
        this.apiCall('GET',BaseUrl + '/members')
            .then((members : IMember[]) => {

                const membersById: {[id: number]: IMember} = {}
                let isPrivileged = false

                for (const member of members) {
                    if (member.id) {
                        membersById[member.id] = member
                        isPrivileged = isPrivileged || (member.isMe && member.role != null)
                    }
                }

                this.setState({isPrivileged, members, membersById, isLoadingMembers: false})
            })
    }

    public componentDidMount() : void {
        this.requeryMembers()

        this.apiCall('GET',BaseUrl + '/config')
            .then(config => this.setState({config:config[0], isLoadingConfig: false}));
        this.apiCall('GET',BaseUrl + '/maps')
            .then(maps => this.setState({maps, isLoadingMaps: false}));
        this.apiCall('GET',BaseUrl + '/public_holidays')
            .then(holidays => {
                const holidayMap = {}

                for (const holiday of holidays.filter((h : IHoliday) => h.type === 'National holiday' || h.name === 'Canterbury Show Day')){
                    holidayMap[holiday.date] = holiday
                }

                this.setState({holidayMap, isLoadingHolidays: false})
            });
    }

    public render(){

        console.log(`path=${this.state.path}`)

        if ( this.state.isLoadingConfig || this.state.isLoadingMaps || this.state.isLoadingMembers || this.state.isLoadingHolidays) {
            return  [<TriphubNavbar key='triphubNavbar' app={this}/>,
                     <div key='1'>Loading Configuration {this.state.isLoadingConfig ? Spinner : 'Done.'}</div>,
                     <div key='2'>Loading Maps {this.state.isLoadingMaps ? Spinner : 'Done.'}</div>,
                     <div key='3'>Loading Members {this.state.isLoadingMembers ? Spinner : 'Done.'}</div>,
                     <div key='4'>Loading Holidays {this.state.isLoadingHolidays ? Spinner : 'Done.'}</div>]
        } else if (this.state.path === "/calendar") {
            return <Calendar key='calendar' app={this}/> 
        } else if (this.state.path === "/newtrip") {
            return <Trip key='newtrip' app={this} isNew={true} isNewSocial={false}/> 
        } else if (this.state.path === "/newsletterlist") {
            return <NewsletterList app={this} /> 
        } else if (this.state.path.startsWith("/newsletters/")) {
            return <Newsletter app={this} href={BaseUrl + this.state.path}/> 
        } else if (this.state.path === "/newsocial") {
            return <Trip key='newsocial' app={this} isNew={true} isNewSocial={true}/> 
        } else if (this.state.path.startsWith("/trips/")) {
            return <Trip key='trip' app={this} isNew={false} isNewSocial={true} href={BaseUrl + this.state.path}/> 
        } else {
            return <TripsList key='triplist' app={this}/>
        }
    }
}
