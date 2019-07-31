import * as React from 'react';
import { Component } from 'react';
import { Badge, Button, ButtonGroup } from 'reactstrap';
import { BaseUrl, Spinner } from '.';
import { App } from './App';
import { IEdit,  IParticipant, ITrip, TripState } from './Interfaces';
import { GetDateString, AddDays, GetDisplayPriority } from './Utilities';
import { TripDetail } from './TripDetail';
import { TripParticipants } from './TripParticipants';
import { ChangeHistory } from './ChangeHistory';
import { Expandable } from './Expandable';
import { Email } from './Email';
import { TripPrint } from './TripPrint';
import './index.css';
import './print.css';
import { TriphubNavbar } from './TriphubNavBar';
import { ToolTipIcon } from './ToolTipIcon';


export class Trip extends Component<{
    is_new: boolean
    href?: string
    app: App    
    router: any
    },{
      trip: ITrip
      edit_id: number
      edit_href: string
      edit_is_edited: boolean
      edit_list: IEdit[]
      edit_heartbeat_id?: any
      participants: IParticipant[]
      is_saving: boolean
    }> {

      public suggestedTrip: {trip: ITrip, participants: IParticipant[]};

      constructor(props:any){
        super(props)
        this.state = {
            edit_id: 0,
            edit_href: '',
            edit_is_edited: false,
            edit_list: [],
            participants: [],
            trip: {id:0} as ITrip,
            is_saving: true,
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
        return (me.role || '') !== '' || 
                (!roleonly && !!this.state.participants.find((p:IParticipant) => me.id === p.member_id && p.is_leader))
    }

    public componentDidMount(){
        if (this.props.is_new) {
            this.props.app.setState({loading: false})    
            this.startSuggestedTrip()
        } else {

            this.props.app.setStatus(['Loading ', Spinner])
            this.props.app.apiCall('POST',this.props.href + '/edit',{stamp:new Date().toISOString()})
                .then((edit_list:IEdit[]) => {
                    this.setState({
                        edit_id : edit_list[0].id,
                        edit_href : edit_list[0].href,
                        edit_is_edited: false,
                        edit_list,
                        edit_heartbeat_id: setInterval(this.editHeartbeat, this.props.app.state.config.edit_refresh_in_sec * 1000)
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
        if (this.state.edit_heartbeat_id) {
            clearInterval(this.state.edit_heartbeat_id)
        }

        if (this.state.edit_href) {
            this.props.app.apiCall('DELETE', this.state.edit_href,{})
        }
    }

    public requeryParticipants(){
        this.props.app.apiCall('GET',this.props.href + '/participants')
        .then((participants:IParticipant[]) => {

            this.setState({participants, is_saving: false})
            this.props.app.setState({loading: false})
            this.props.app.setStatus('Loaded Trip', 3000)
        })
    }

    public deleteTrip(){
        const href = this.state.trip.href

        this.props.app.apiCall('POST', href as string, {is_deleted:!this.state.trip.is_deleted}, true)
            .then(() => this.props.router.history.push('/'))
    }

    public approveTrip(){
        const href = this.state.trip.href

        this.props.app.apiCall('POST', href as string, {is_approved:!this.state.trip.is_approved}, true)
            .then(() => this.props.router.history.push('/'))
    }

    public blankTramper() : IParticipant {
        return {id: -1, is_leader: false, is_plb_provider: false, is_deleted: false, is_vehicle_provider: false, 
                logistic_info: '', email: '', member_id: 0, name: '', phone: '', vehicle_rego: '', emergency_contact: ''}
    }

    public signMeUpTramper() : IParticipant {
        const me = this.props.app.getMe()
        return {...this.blankTramper(), 
                member_id: me.id, name: me.name, email: me.email, phone: me.phone, emergency_contact: me.emergency_contact}
    }

    public startSuggestedTrip(){
        const open_date : Date = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        const close_date : Date = AddDays(open_date, 12 - open_date.getDay())
        const trip_date : Date = AddDays(close_date, 8)
        const me = this.props.app.getMe()

        this.suggestedTrip = {
            trip: {
                open_date: GetDateString(open_date),
                close_date: GetDateString(close_date),
                trip_date: GetDateString(trip_date),
                cost: '',
                departure_point: '',
                description: '',
                grade: '',
                is_social: false,
                id: -1,
                length: 1,
                logistic_info: '',
                map_1: '',
                map_2: '',
                map_3: '',
                map_html: '',
                max_participants: 0,
                is_deleted: false,
                is_approved: false,
                is_open: false,
                title: me.name + '\'s suggested trip',
                trip_state: TripState.Suggested_Trip
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

        console.log(JSON.stringify(trip))
        console.log(JSON.stringify(participants))

        this.props.app.apiCall('POST',BaseUrl + '/trips',trip)
            .then(data => { 
                    this.props.app.apiCall('POST',data.href + '/participants',participants[0])
                        .then(this.props.router.history.push('/'))
                })
        }

    public cancelSuggestedTrip(){
        const trip = this.state.trip
        const participants = this.state.participants

        if (JSON.stringify({trip,participants}) === JSON.stringify(this.suggestedTrip) ||
            window.confirm('You have made changes, are you sure you want to cancel?')) {
                this.props.router.history.push('/')
        }
    }

    public getParticipantsInfo() : 
        {max_participants:number, all:IParticipant[], non_deleted:IParticipant[], current:IParticipant[], waitlist:IParticipant[], deleted:IParticipant[]} {
        const all = [...this.state.participants]

        all.sort((a,b) => GetDisplayPriority(a) - GetDisplayPriority(b))

        const trip = this.state.trip
        const max_participants = trip.max_participants === 0 ? 999 : trip.max_participants
        const non_deleted = all.filter(p => !p.is_deleted)
        const deleted = all.filter(p => p.is_deleted)
        const current = non_deleted.filter((p,i) => i < max_participants)
        const waitlist = non_deleted.filter((p,i) => i >= max_participants)

        return {max_participants,all,non_deleted,current,waitlist,deleted}
    }

    public render(){
        const trip = this.state.trip
        const app = this.props.app
        const is_new = this.props.is_new
        const changehistory = () => <ChangeHistory key={'ChangeHistory' + trip.id} owner={this} app={this.props.app}/>
        const info = this.getParticipantsInfo()
        const trip_warnings = app.validateTrip(this.state.trip).filter(i => !i.ok)
        const trip_warning = trip_warnings.length && !this.props.app.state.loading
                                    ? <ToolTipIcon id='pw' key='pw' icon='warning' tooltip={trip_warnings[0].message} className='warning-icon'/> 
                                    : null
        const participant_warnings = info.non_deleted.map(p => app.validateParticipant(p).filter(i => !i.ok)).filter(vm => vm.length)
        const participant_warning = participant_warnings.length && !this.props.app.state.loading
                                    ? <ToolTipIcon id='pw' key='pw' icon='warning' tooltip={participant_warnings[0][0].message} className='warning-icon'/> 
                                    : null
        const participantCount = <span key='count' className='TripCount'>{` (${info.current.length}${info.waitlist.length ? '+'+info.waitlist.length : ''})`}</span>                                    

        return [
            <TriphubNavbar key='triphubnavbar' app={this.props.app} router={this.props.router}>
                <Button color='primary' onClick={this.deleteTrip} 
                        hidden={this.props.app.state.loading || is_new || trip.is_deleted || !this.isPrivileged()}>
                    <span className='fa fa-remove'/> 
                    Delete this trip
                </Button>
                <Button color='primary' onClick={this.deleteTrip} 
                        hidden={this.props.app.state.loading || is_new || !trip.is_deleted || !this.isPrivileged()}>
                    Undelete this trip
                </Button>
                <Button color='primary' onClick={this.approveTrip}  
                        hidden={this.props.app.state.loading || is_new || trip.is_approved  || !this.isPrivileged(true)}>
                    <span key='approvetripicon' className='fa fa-thumbs-o-up'/> 
                    Approve this trip
                </Button>
                <Button color='primary' onClick={this.approveTrip} 
                        hidden={this.props.app.state.loading || is_new || !trip.is_approved || !this.isPrivileged(true)}>
                    <span key='unapprovetripicon' className='fa fa-thumbs-o-down'/> 
                    Remove Approval
                </Button>
                <ButtonGroup hidden={this.props.app.state.loading || !is_new}>
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
                {this.state.edit_list.map((item:IEdit) =>
                    <ToolTipIcon key={'edititem' + item.id} id={'edititem' + item.id} tooltip={`last known time ${item.stamp}`}>
                        <Badge pill={true}>
                            {this.props.app.getMemberById(item.user_id).name} is {item.is_edited ? 'editing' : 'viewing'} this trip
                        </Badge>
                    </ToolTipIcon>)}
                {!trip.href 
                    ? <Badge pill={true}>New trip</Badge>
                    : trip.trip_state === TripState.Deleted_Trip 
                    ? <Badge pill={true}>This trip has been deleted</Badge>
                    : trip.trip_state === TripState.Suggested_Trip && !trip.is_approved
                    ? <Badge pill={true}>This trip has has only been suggested, and not yet approved</Badge>
                    : trip.trip_state === TripState.Suggested_Trip && trip.is_approved
                    ? <Badge pill={true}>This trip has has been suggested, and is approved</Badge>
                    : !trip.is_open
                    ? <Badge pill={true}>This trip is closed, please contact the leader</Badge>
                    : null}
            </div>,
            <Expandable key='detail' id='detail' 
                        title={[this.state.trip.title, trip_warning, <span key='icon' className='fa fa-map-marker section-icon'/>]} level={2} expanded={true}>  
                <TripDetail key={'TripDetail' + this.state.trip.id} owner={this} app={this.props.app}/>
            </Expandable>,
            <Expandable key='participants' id='participants' 
                        title={['Participants', participant_warning, participantCount ,<span key='icon' className='fa fa-user section-icon'/>]} 
                        level={2} expanded={true}>  
                <TripParticipants key={'TripParticipants' + this.state.trip.id} trip={this} app={this.props.app} />
            </Expandable>,
            this.props.is_new || !this.isPrivileged() ? null :
            <Expandable key={`email${this.state.trip.id}_${this.state.participants.length}`} id='email'
                        title={['Email', <span key='icon' className='fa fa-paper-plane section-icon'/>]}
                        level={2} expanded={false}>  
                <Email  owner={this} app={this.props.app}/>
            </Expandable>,
            this.props.is_new ? null : 
            <Expandable key='changehistory' id='changehistory'
                        title={['Change History', <span key='icon' className='fa fa-history section-icon'/>]}
                        level={2} expanded={false} ondemand={changehistory}>  
                Change history ...
            </Expandable>,
            <TripPrint key='tripprint' trip={this} app={this.props.app}/>,
        ]
    }

    private editHeartbeat() {
        this.props.app.apiCall('POST', this.state.edit_href, {stamp:new Date().toISOString(),is_edited:this.state.edit_is_edited})
            .then((edit_list:IEdit[]) => this.setState({edit_list}))
    }
}
