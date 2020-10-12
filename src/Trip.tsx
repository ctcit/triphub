import * as React from 'react';
import { Component } from 'react';
import { Button, Jumbotron } from 'reactstrap';
import { BaseUrl } from '.';
import { App } from './App';
import { Spinner, Done, AdminHint as TripHubAlert } from './Widgets';
import { IEdit,  IParticipant, ITrip, TripGroup, IParticipantsInfo, TripApprovalState } from './Interfaces';
import { GetDateString, AddDays, GetDisplayPriority, SafeJsonParse } from './Utilities';
import { TripDetail } from './TripDetail';
import { TripParticipants } from './TripParticipants';
import { History } from './History';
import { Email } from './Email';
import { TripPrint } from './TripPrint';
import { Pill } from './Widgets';
import './index.css';
import './print.css';
import { ToolTipIcon } from './ToolTipIcon';
import { Accordian } from './Accordian';
import Container from 'reactstrap/lib/Container';
import Badge from 'reactstrap/lib/Badge';


export class Trip extends Component<{
    isNew: boolean,
    isNewSocial: boolean,
    href?: string,
    app: App    
},{
    trip: ITrip,
    editId: number,
    editHref: string,
    editIsEdited: boolean,
    editList: IEdit[],
    editHeartbeatId?: any,
    participants: IParticipant[],
    isLoading: boolean,
    isSaving: boolean,
    showValidationMessage: boolean,
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
            isLoading: false,
            isSaving: true,
            showValidationMessage: false,
        }
        this.requeryParticipants = this.requeryParticipants.bind(this)
        this.startNewEvent = this.startNewEvent.bind(this) 
        this.saveSuggestedTrip = this.saveSuggestedTrip.bind(this) 
        this.cancelSuggestedTrip = this.cancelSuggestedTrip.bind(this) 
        this.deleteTrip = this.deleteTrip.bind(this)
        this.approveTrip = this.approveTrip.bind(this)
        this.rejectTrip = this.rejectTrip.bind(this)
        this.editHeartbeat = this.editHeartbeat.bind(this)
        this.getParticipantsInfo = this.getParticipantsInfo.bind(this)
    }

    public componentDidMount(){
        if (this.props.isNew) {
            this.setState({isLoading: false});
            this.props.app.setState({isLoading: false})    
            this.startNewEvent()
        } else {
            this.setState({isLoading: true});
            this.props.app.setState({isLoading: true})
            this.props.app.setStatus(['Loading ', Spinner])
            this.props.app.apiCall('POST',this.props.href + '/edit',{stamp:new Date().toISOString()})
                .then((editList:IEdit[]) => {
                    this.setState({
                        editList,
                        editId: editList[0].id,
                        editHref: `${this.props.href}/edit/${editList[0].id}`,
                        editIsEdited: false,
                        editHeartbeatId: setInterval(this.editHeartbeat, this.props.app.state.config.editRefreshInSec * 1000)
                    });
                });

            this.props.app.apiCall('GET',this.props.href as string)
                .then((trip:ITrip) => {
                    this.setState({
                        trip:trip[0],
                        isLoading: false
                    });
                    this.props.app.setState({isLoading: false});
                })
            
            this.requeryParticipants();
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
            participants = participants || []
            this.setState({participants, isSaving: false})
            this.props.app.setState({isLoading: false})
            this.props.app.setStatus('Loaded Trip', 3000)
        })
    }

    public canEditTrip() {
        const me = this.props.app.getMe()
        return this.props.app.amAdmin() ||
                ( !!this.state.participants.find((p:IParticipant) => me.id === p.memberId && p.isLeader))
    }

    public deleteTrip(){
        this.props.app.apiCall('POST', this.props.href as string, {isDeleted:!this.state.trip.isDeleted}, true)
            .then(() => this.props.app.setPath('/'))
    }

    public approveTrip(){
        this.props.app.apiCall('POST', this.props.href as string, {approval:TripApprovalState.Approved}, true)
            .then(() => this.props.app.setPath('/'))
    }

    public rejectTrip(){
        this.props.app.apiCall('POST', this.props.href as string, {approval:TripApprovalState.Rejected}, true)
            .then(() => this.props.app.setPath('/'))
    }

    public blankTramper() : IParticipant {
        return {id: -1, isLeader: false, isPlbProvider: false, isDeleted: false, isVehicleProvider: false, 
                logisticInfo: '', email: '', memberId: 0, name: '', phone: '', vehicleRego: '',
                emergencyContactName: '', emergencyContactPhone: ''}
    }

    public signMeUpTramper(isLeader: boolean = false) : IParticipant {
        const me = this.props.app.getMe()
        return {...this.blankTramper(), 
                memberId: me.id, name: me.name, email: me.email, phone: me.phone, isLeader,
                emergencyContactName: me.emergencyContactName, emergencyContactPhone: me.emergencyContactPhone}
    }

    public startNewEvent(){
        // First of the next month
        const openDate : Date = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        // Friday in the week after the open date (or Wednesday for Socials)
        const offset = (this.props.isNewSocial) ? 9 : 12
        const closeDate : Date = AddDays(openDate, offset - openDate.getDay())
        // The day after the close date (a Saturday)
        const tripDate : Date = AddDays(closeDate, 1)
        const me = this.props.app.getMe()

        this.suggestedTrip = {
            trip: {
                openDate: GetDateString(openDate),
                closeDate: GetDateString(closeDate),
                tripDate: GetDateString(tripDate),
                cost: '',
                departurePoint: '',
                departureDetails: '',
                description: '',
                grade: this.props.isNewSocial ? 'Social' : '',
                isSocial: this.props.isNewSocial,
                isNoSignup: this.props.isNewSocial,
                id: -1,
                length: 1,
                logisticInfo: '',
                maps: [],
                mapHtml: '',
                routes: [],
                isLimited: false,
                maxParticipants: 0,
                isDeleted: false,
                approval: (this.props.isNewSocial || this.props.app.amAdmin() ) ? TripApprovalState.Approved : TripApprovalState.Pending,
                isOpen: this.props.isNewSocial,
                title: '',
                tripGroup: this.props.isNewSocial ? TripGroup.OpenTrip : TripGroup.SuggestedTrip
            },
            participants: [
                this.signMeUpTramper(true)
            ],
        }
        this.setState(this.suggestedTrip)
    }

    public saveSuggestedTrip(){
        const trip = this.state.trip
        const participants = this.state.participants
        const tripWarnings = this.props.app.validateTrip(this.state.trip).filter(i => !i.ok);

        if (tripWarnings.length > 0) {
            this.setState({showValidationMessage: true})
        }
        else
        {
            this.props.app.apiCall('POST',BaseUrl + '/trips',trip)
                .then(data => { 
                        const newTrip = data[0] as ITrip
                        const url = BaseUrl + '/trips/'+newTrip.id + '/participants'
                        this.props.app.apiCall('POST', url ,participants[0])
                            .then(() => {
                                this.props.app.setPath('/')
                                const notificationText = (trip.approval === TripApprovalState.Pending) ?
                                    "Thanks for submitting a trip. It will be checked by the trip-coordinators and you will receive an email when it is approved." :
                                    "Trip has been added and auto-approved."
                                this.props.app.addNotification(notificationText, 'success');
                            })
                    })
            }
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
        const all = [...(this.state.participants || [])]

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
        return this.state.trip.maps
    }

    public getRoutes() : number[][][] {
        return this.state.trip.routes || []
    }

    public getRoutesSummary() : string {
        return (this.getRoutes().length === 0 ? 'No route' : this.getRoutes().length + ' points in route')
    }

    public getMapsSummary() : string {
        return this.getRoutesSummary() + ', ' +
               (this.getMaps().length === 0 ? 'no maps selected' : 'selected maps: ' + this.getMaps().map(m => m.split(' ')[0]).join(', '))
    }

    public render(){
        const trip = this.state.trip;
        const app = this.props.app;
        const isLoading = this.state.isLoading;
        const isNew = this.props.isNew;
        const history = () => <History key={'History' + trip.id} owner={this} app={this.props.app}/>
        const info = this.getParticipantsInfo();
        const tripWarnings = this.props.app.validateTrip(this.state.trip).filter(i => !i.ok);
        const participantWarnings = info.moveable.map(p => app.validateParticipant(p).filter(i => !i.ok)).filter(vm => vm.length)
        const participantWarning = participantWarnings.length && !isLoading
                                    ? <ToolTipIcon id='pw' key='pw' icon='warning' tooltip={participantWarnings[0][0].message} className='fw warning-icon'/> 
                                    : null
        const participantCount = <span key='count' className='TripCount'>
                                    {` (${info.leaders.length+info.early.length}${info.late.length ? '+'+info.late.length : ''})`}
                                 </span>                                    
        const amAdmin = this.props.app.amAdmin()
        const approval = this.state.trip.approval
        const tripCanBeApproved = ( approval === TripApprovalState.Pending || approval === TripApprovalState.Rejected ) && !trip.isDeleted
        // Note - approved trips can't be rejected, but they can be deleted
        const tripCanBeRejected = ( approval === TripApprovalState.Pending ) && !trip.isDeleted

        return [

            (isLoading ? 
                <Container key="loadingContainer" className={this.props.app.containerClassName() + "triphub-loading-container"}>
                    <Jumbotron key='loadingAlert' variant='primary'>
                        <div key='1'>{isLoading ? Spinner : Done} Loading Trip</div>
                    </Jumbotron>
                </Container> :
            
                <Container className={this.props.app.containerClassName()} key="triphubtripdetail" fluid={true}>
                    <div key='tripstatus' className='py-1'>
                        {this.state.editList
                            .filter((item:IEdit) => item.id !== this.state.editId)
                            .map((item:IEdit) =>
                            <ToolTipIcon key={'edititem' + item.id} id={'edititem' + item.id} tooltip={`last known time ${item.stamp}`}>
                                <Badge className='noprint' pill={true}>
                                    {this.props.app.getMemberById(item.userId).name} is {item.isEdited ? 'editing' : 'viewing'} this trip
                                </Badge>
                            </ToolTipIcon>)}
                        {trip.id <= 0
                         ? <Pill>New trip - not saved!</Pill>
                         : trip.tripGroup === TripGroup.DeletedTrip 
                         ? <Pill>This trip has been deleted</Pill>
                         : trip.tripGroup === TripGroup.SuggestedTrip && trip.approval === TripApprovalState.Pending
                         ? amAdmin
                            ? <TripHubAlert>This trip needs to be approved or rejected. Please check that all details are filled
                                out correctly and that the trip is suitable then use the buttons below to approve or reject.
                            </TripHubAlert>
                            : <Pill>This trip has only been suggested, and not yet approved</Pill>
                         : trip.tripGroup === TripGroup.SuggestedTrip && trip.approval === TripApprovalState.Rejected
                         ? <Pill>This trip has been been rejected</Pill>
                         : trip.tripGroup === TripGroup.SuggestedTrip && trip.approval === TripApprovalState.Approved
                         ? <Pill>This trip is not open yet</Pill>
                         : !trip.isOpen
                         ? <Pill>This trip is closed, please contact the leader</Pill>
                         : null}
                    </div>
                    <div hidden={isNew || !amAdmin} key='adminActions' className="py-1">
                        <Button color='primary' hidden={!tripCanBeApproved} onClick={this.approveTrip} className="px-2 mx-1">
                        <span key='approvetripicon' className='fa fa-thumbs-up fa-fw'/> Approve
                        </Button>
                        <Button color='primary' hidden={!tripCanBeRejected} onClick={this.rejectTrip} className="px-2 mx-1">
                        <span key='unapprovetripicon' className='fa fa-thumbs-down fa-fw'/>  Reject
                        </Button>
                        <Button color='primary' onClick={this.deleteTrip} hidden={isLoading || isNew || trip.isDeleted}>
                            <span className='fa fa-trash fa-fw'/> Delete this trip
                        </Button>
                        <Button onClick={this.deleteTrip} hidden={isLoading || isNew || !trip.isDeleted}>
                            <span className='fa fa-undo fa-fw'/> Undelete this trip
                        </Button>
                    </div>
                    <Accordian key='detail' id='detail' className='trip-section' headerClassName='trip-section-header'
                                title={<span><b><span key='icon' className='fa fa-map-marker fa-fw'/>{this.state.trip.title}</b></span>}
                                expanded={true}>
                        <TripDetail key={'TripDetail' + this.state.trip.id} owner={this} app={this.props.app} 
                        isLoading={isLoading} forceValidation={this.state.showValidationMessage}/>
                    </Accordian>
                    <div hidden={isLoading || !isNew} key='saveCancel' className="py-2">
                        <Button color='primary' onClick={this.saveSuggestedTrip} className="px-2 mx-1">
                            Save
                        </Button>
                        <Button color='primary' onClick={this.cancelSuggestedTrip} className="px-2 mx-1">
                            Cancel
                        </Button>
                    </div>
                    <div className="alert alert-danger" role="alert" hidden={!this.state.showValidationMessage || tripWarnings.length === 0} key='validation'>
                        Some trip details are missing or incorrect. Please correct before saving.
                    </div>
                    {this.state.trip.isSocial && this.state.trip.isNoSignup ? null :
                        <Accordian key='participants' id='participants' className='trip-section' headerClassName='trip-section-header'
                                    title={<span><b><span key='icon' className='fa fa-user fa-fw'/>{['Participants', participantWarning, participantCount]}</b></span>}
                                    expanded={true}>  
                            <TripParticipants key={'TripParticipants' + this.state.trip.id} trip={this}
                            app={this.props.app} isLoading={isLoading}  />
                        </Accordian>
                    }
                    {this.props.isNew || !this.canEditTrip() ? null :
                        <Accordian key={`email${this.state.trip.id}_${this.state.participants.length}`} id='email'
                                    className='trip-section' headerClassName='trip-section-header'
                                    title={<span><b><span key='icon' className='fa fa-paper-plane fa-fw'/>Email</b></span>}
                                    expanded={false}>  
                            <Email  owner={this} app={this.props.app} isLoading={isLoading} />
                        </Accordian>
                    }
                    {(!amAdmin || this.props.isNew) ? null : 
                        <Accordian key='history' id='history' className='trip-section' headerClassName='trip-section-header'
                                    title={<span><b><span key='icon' className='fa fa-history fa-fw'/>History</b></span>}
                                    expanded={false} ondemand={history}>
                            History ...
                        </Accordian>
                    }
                    <TripPrint key='tripprint' trip={this} app={this.props.app}/>
                </Container>
            )
        ]
    }

    private editHeartbeat() {
        this.props.app.apiCall('POST', this.state.editHref, {stamp:new Date().toISOString(),isEdited:this.state.editIsEdited})
            .then((editList:IEdit[]) => this.setState({editList}))
    }
}
