import * as React from 'react';
import { Component } from 'react';
import { Badge, Button, ButtonGroup } from 'reactstrap';
import { BaseUrl, Spinner } from '.';
import { App } from './App';
import { IEdit,  IParticipant, ITrip, TripState, IParticipantsInfo } from './Interfaces';
import { GetDateString, AddDays, GetDisplayPriority, SafeJsonParse } from './Utilities';
import { TripDetail } from './TripDetail';
import { TripParticipants } from './TripParticipants';
import { History } from './History';
import { Expandable } from './Expandable';
import { Email } from './Email';
import { TripPrint } from './TripPrint';
import './index.css';
import './print.css';
import { TriphubNavbar } from './TriphubNavBar';
import { ToolTipIcon } from './ToolTipIcon';


export class Trip extends Component<{
    isNew: boolean
    href?: string
    app: App    
    },{
      trip: ITrip
      editId: number
      editHref: string
      editIsEdited: boolean
      editList: IEdit[]
      editHeartbeatId?: any
      participants: IParticipant[]
      isSaving: boolean
    }> {

      public suggestedTrip: {trip: ITrip, participants: IParticipant[]};

      constructor(props:any){
        super(props)
        this.state = {
            editId: 0,
            editHref: '',
            editIsEdited: false,
            editList: [],
            participants: [],
            trip: {id:0} as ITrip,
            isSaving: true,
        }
        this.requeryParticipants = this.requeryParticipants.bind(this)
        this.startSuggestedTrip = this.startSuggestedTrip.bind(this) 
        this.saveSuggestedTrip = this.saveSuggestedTrip.bind(this) 
        this.cancelSuggestedTrip = this.cancelSuggestedTrip.bind(this) 
        this.deleteTrip = this.deleteTrip.bind(this)
        this.approveTrip = this.approveTrip.bind(this)
        this.editHeartbeat = this.editHeartbeat.bind(this)
        this.getParticipantsInfo = this.getParticipantsInfo.bind(this)
    }

    public isPrivileged(roleonly?: boolean) : boolean {
        const me = this.props.app.getMe()
        return this.props.app.state.isPrivileged || 
                (!roleonly && !!this.state.participants.find((p:IParticipant) => me.id === p.memberId && p.isLeader))
    }

    public componentDidMount(){
        if (this.props.isNew) {
            this.props.app.setState({isLoading: false})    
            this.startSuggestedTrip()
        } else {

            this.props.app.setStatus(['Loading ', Spinner])
            this.props.app.apiCall('POST',this.props.href + '/edit',{stamp:new Date().toISOString()})
                .then((editList:IEdit[]) => {
                    this.setState({
                        editList,
                        editId : editList[0].id,
                        editHref : editList[0].href,
                        editIsEdited: false,
                        editHeartbeatId: setInterval(this.editHeartbeat, this.props.app.state.config.editRefreshInSec * 1000)
                    })        
            })

            this.props.app.apiCall('GET',this.props.href as string)
                .then((trip:ITrip) => {
                    this.setState({trip:trip[0]})
                })
            
            this.requeryParticipants()
        }
    }

    public componentWillUnmount(){
        if (this.state.editHeartbeatId) {
            clearInterval(this.state.editHeartbeatId)
        }

        if (this.state.editHref) {
            this.props.app.apiCall('DELETE', this.state.editHref,{})
        }
    }

    public requeryParticipants(){
        this.props.app.apiCall('GET',this.props.href + '/participants')
        .then((participants:IParticipant[]) => {

            this.setState({participants, isSaving: false})
            this.props.app.setState({isLoading: false})
            this.props.app.setStatus('Loaded Trip', 3000)
        })
    }

    public deleteTrip(){
        const href = this.state.trip.href

        this.props.app.apiCall('POST', href as string, {isDeleted:!this.state.trip.isDeleted}, true)
            .then(() => this.props.app.setPath('/'))
    }

    public approveTrip(){
        const href = this.state.trip.href

        this.props.app.apiCall('POST', href as string, {isApproved:!this.state.trip.isApproved}, true)
            .then(() => this.props.app.setPath('/'))
    }

    public blankTramper() : IParticipant {
        return {id: -1, isLeader: false, isPlbProvider: false, isDeleted: false, isVehicleProvider: false, 
                logisticInfo: '', email: '', memberId: 0, name: '', phone: '', vehicleRego: '',
                emergencyContactName: '', emergencyContactPhone: ''}
    }

    public signMeUpTramper() : IParticipant {
        const me = this.props.app.getMe()
        return {...this.blankTramper(), 
                memberId: me.id, name: me.name, email: me.email, phone: me.phone, 
                emergencyContactName: me.emergencyContactName, emergencyContactPhone: me.emergencyContactPhone}
    }

    public startSuggestedTrip(){
        const openDate : Date = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        const closeDate : Date = AddDays(openDate, 12 - openDate.getDay())
        const tripDate : Date = AddDays(closeDate, 8)
        const me = this.props.app.getMe()

        this.suggestedTrip = {
            trip: {
                openDate: GetDateString(openDate),
                closeDate: GetDateString(closeDate),
                tripDate: GetDateString(tripDate),
                cost: '',
                departurePoint: '',
                description: '',
                grade: '',
                isSocial: false,
                isNoSignup: false,
                id: -1,
                length: 1,
                logisticInfo: '',
                map1: '',
                map2: '',
                map3: '',
                mapHtml: '',
                mapRoute: '[]',
                maxParticipants: 0,
                isDeleted: false,
                isApproved: false,
                isOpen: false,
                title: me.name + "'s suggested trip",
                tripState: TripState.SuggestedTrip
            },
            participants: [
                this.signMeUpTramper()
            ],
        }
        this.setState(this.suggestedTrip)
    }

    public saveSuggestedTrip(){
        const trip = this.state.trip
        const participants = this.state.participants

        this.props.app.apiCall('POST',BaseUrl + '/trips',trip)
            .then(data => { 
                    this.props.app.apiCall('POST',data.href + '/participants',participants[0])
                        .then(() => this.props.app.setPath('/'))
                })
        }

    public cancelSuggestedTrip(){
        const trip = this.state.trip
        const participants = this.state.participants

        if (JSON.stringify({trip,participants}) === JSON.stringify(this.suggestedTrip) ||
            window.confirm('You have made changes, are you sure you want to cancel?')) {
                this.props.app.setPath('/')
        }
    }

    public getParticipantsInfo() : IParticipantsInfo {
        const all = [...this.state.participants]

        all.sort((a,b) => GetDisplayPriority(a) - GetDisplayPriority(b))

        const trip = this.state.trip
        const maxParticipants = trip.maxParticipants === 0 ? 999 : trip.maxParticipants
        const leaders = all.filter(p => p.isLeader && !p.isDeleted)
        const moveable = all.filter(p => !p.isLeader && !p.isDeleted)
        const deleted = all.filter(p => p.isDeleted)
        const early = moveable.filter((_,i) => i < maxParticipants - leaders.length)
        const late = moveable.filter((_,i) => i >= maxParticipants - leaders.length)
        const current = [...leaders, ...early]

        return {maxParticipants,all,leaders,current,moveable,early,late,deleted}
    }

    public getMaps() : string[] {
        return [this.state.trip.map1,this.state.trip.map2,this.state.trip.map3].filter(m => m !== '')
    }

    public getRoute() : any[] {
        return SafeJsonParse(this.state.trip.mapRoute,[])
    }

    public getRouteSummary() : string {
        return (this.getRoute().length === 0 ? 'No route' : this.getRoute().length + ' points in route')
    }

    public getMapSummary() : string {
        return this.getRouteSummary() + ', ' +
               (this.getMaps().length === 0 ? 'no maps selected' : 'selected maps: ' + this.getMaps().map(m => m.split(' ')[0]).join(', '))
    }

    public render(){
        const trip = this.state.trip
        const app = this.props.app
        const isNew = this.props.isNew
        const history = () => <History key={'History' + trip.id} owner={this} app={this.props.app}/>
        const info = this.getParticipantsInfo()
        const tripWarnings = app.validateTrip(this.state.trip).filter(i => !i.ok)
        const tripWarning = tripWarnings.length && !this.props.app.state.isLoading
                                    ? <ToolTipIcon id='pw' key='pw' icon='warning' tooltip={tripWarnings[0].message} className='warning-icon'/> 
                                    : null
        const participantWarnings = info.moveable.map(p => app.validateParticipant(p).filter(i => !i.ok)).filter(vm => vm.length)
        const participantWarning = participantWarnings.length && !this.props.app.state.isLoading
                                    ? <ToolTipIcon id='pw' key='pw' icon='warning' tooltip={participantWarnings[0][0].message} className='warning-icon'/> 
                                    : null
        const participantCount = <span key='count' className='TripCount'>
                                    {` (${info.leaders.length+info.early.length}${info.late.length ? '+'+info.late.length : ''})`}
                                 </span>                                    

        return [
            <TriphubNavbar key='triphubnavbar' app={this.props.app}>
                <Button color='primary' onClick={this.deleteTrip} 
                        hidden={this.props.app.state.isLoading || isNew || trip.isDeleted || !this.isPrivileged()}>
                    <span className='fa fa-remove'/> 
                    Delete this trip
                </Button>
                <Button color='primary' onClick={this.deleteTrip} 
                        hidden={this.props.app.state.isLoading || isNew || !trip.isDeleted || !this.isPrivileged()}>
                    Undelete this trip
                </Button>
                <Button color='primary' onClick={this.approveTrip}  
                        hidden={this.props.app.state.isLoading || isNew || trip.isApproved  || !this.isPrivileged(true)}>
                    <span key='approvetripicon' className='fa fa-thumbs-o-up'/> 
                    Approve this trip
                </Button>
                <Button color='primary' onClick={this.approveTrip} 
                        hidden={this.props.app.state.isLoading || isNew || !trip.isApproved || !this.isPrivileged(true)}>
                    <span key='unapprovetripicon' className='fa fa-thumbs-o-down'/> 
                    Remove Approval
                </Button>
                <ButtonGroup hidden={this.props.app.state.isLoading || !isNew}>
                    <Button color='primary' disabled={true}>
                        <span key='suggesttriplabelicon' className='fa fa-lightbulb-o'/> 
                        Suggest a trip:
                    </Button>
                    <Button color='primary' onClick={this.saveSuggestedTrip}>
                        Save
                    </Button>
                    <Button color='primary' onClick={this.cancelSuggestedTrip}>
                        Cancel
                    </Button>
                </ButtonGroup>
            </TriphubNavbar>,
            <div key='tripstatus'>
                {this.state.editList.map((item:IEdit) =>
                    <ToolTipIcon key={'edititem' + item.id} id={'edititem' + item.id} tooltip={`last known time ${item.stamp}`}>
                        <Badge pill={true}>
                            {this.props.app.getMemberById(item.userId).name} is {item.isEdited ? 'editing' : 'viewing'} this trip
                        </Badge>
                    </ToolTipIcon>)}
                {!trip.href 
                    ? <Badge pill={true}>New trip</Badge>
                    : trip.tripState === TripState.DeletedTrip 
                    ? <Badge pill={true}>This trip has been deleted</Badge>
                    : trip.tripState === TripState.SuggestedTrip && !trip.isApproved
                    ? <Badge pill={true}>This trip has has only been suggested, and not yet approved</Badge>
                    : trip.tripState === TripState.SuggestedTrip && trip.isApproved
                    ? <Badge pill={true}>This trip has has been suggested, and is approved</Badge>
                    : !trip.isOpen
                    ? <Badge pill={true}>This trip is closed, please contact the leader</Badge>
                    : null}
            </div>,
            <Expandable key='detail' id='detail' 
                        title={[this.state.trip.title, tripWarning, <span key='icon' className='fa fa-map-marker section-icon'/>]} level={2} expanded={true}>  
                <TripDetail key={'TripDetail' + this.state.trip.id} owner={this} app={this.props.app}/>
            </Expandable>,
            this.state.trip.isSocial && this.state.trip.isNoSignup ? null :
            <Expandable key='participants' id='participants' 
                        title={['Participants', participantWarning, participantCount, <span key='icon' className='fa fa-user section-icon'/>]} 
                        level={2} expanded={true}>  
                <TripParticipants key={'TripParticipants' + this.state.trip.id} trip={this} app={this.props.app} />
            </Expandable>,
            this.props.isNew || !this.isPrivileged() ? null :
            <Expandable key={`email${this.state.trip.id}_${this.state.participants.length}`} id='email'
                        title={['Email', <span key='icon' className='fa fa-paper-plane section-icon'/>]}
                        level={2} expanded={false}>  
                <Email  owner={this} app={this.props.app}/>
            </Expandable>,
            this.props.isNew ? null : 
            <Expandable key='history' id='history'
                        title={['History', <span key='icon' className='fa fa-history section-icon'/>]}
                        level={2} expanded={false} ondemand={history}>  
                History ...
            </Expandable>,
            <TripPrint key='tripprint' trip={this} app={this.props.app}/>,
        ]
    }

    private editHeartbeat() {
        this.props.app.apiCall('POST', this.state.editHref, {stamp:new Date().toISOString(),isEdited:this.state.editIsEdited})
            .then((editList:IEdit[]) => this.setState({editList}))
    }
}
