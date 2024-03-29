import { Component } from 'react'
import { Badge, Button, ButtonGroup, Col, Container, Row } from 'reactstrap'
import { AdminHint as TripHubAlert } from './Widgets'
import { IEdit, IParticipant, ITrip, IParticipantsInfo, IState, Role } from './Interfaces'
import { GetDateString, AddDays, GetDisplayPriority, BindMethods } from './Utilities'
import { TripDetail } from './TripDetail'
import { TripParticipants } from './TripParticipants'
import { History } from './History'
import { Email } from './Email'
import { TripCosts } from './TripCosts'
import { TripPrint } from './TripPrint'
import { Pill } from './Widgets'
import './index.css'
import { ToolTipIcon } from './ToolTipIcon'
import { Accordian } from './Accordian'
import { TextAreaInputControl } from './Control'
import { TripState } from './TripStates'
import { ConfigService } from './Services/ConfigService'
import { MembersService } from './Services/MembersService'
import { TripsService } from './Services/TripsService'
import memoizeOne from 'memoize-one'
import { TripsCache } from './Services/TripsCache'


export class Trip extends Component<{
    isNew: boolean,
    isNewSocial: boolean,
    id?: number,
    copyFromId?: number,
    role: Role,
    isOnline: boolean,
    isCached: boolean,
    setPath(path: string): void,
    addNotification(text: string, colour: string): void,
    loadingStatus(state: any): JSX.Element,
    addCachedTrip(CachedTrip: ITrip): void,
    isSocial(value: boolean): void
}, {
    trip: ITrip,
    editId: number,
    editIsEdited: boolean,
    editList: IEdit[],
    editHeartbeatId?: any,
    participants: IParticipant[],
    isLoadingTrip: boolean,
    showValidationMessage: boolean,
    approval?: IState | null
}> {

    public suggestedTrip?: { trip: ITrip, participants: IParticipant[] }

    constructor(props: any) {
        super(props)
        this.state = {
            editId: 0,
            editIsEdited: false,
            editList: [],
            participants: [],
            trip: { id: 0 } as ITrip,
            isLoadingTrip: true,
            showValidationMessage: false,
        }

        BindMethods(this)
    }

    public componentDidMount() {
        if (this.props.isNew) {
            if (this.props.copyFromId == undefined) {
                // new empty trip
                this.setState({ isLoadingTrip: false })
                this.onStartNewEvent()
            } else {
                // new trip copied from existing trip
                this.setState({ isLoadingTrip: true })

                let existingTrip: ITrip | null = null
                TripsService.getTrip(this.props.copyFromId as number)
                    .then((trip: ITrip | null) => {
                        existingTrip = trip
                    }).finally(() => {
                        this.setState({ isLoadingTrip: false })
                        this.onStartNewEvent(existingTrip)
                    })
            }
        } else {
            // existing trip
            this.setState({ isLoadingTrip: true })

            TripsService.getTrip(this.props.id as number)
                .then((trip: ITrip | null) => {
                    if (trip) {
                        this.setState({ trip })
                        if (this.props.role > Role.NonMember) { // will fail 403 for NonMember
                            this.requeryParticipants().then(() => {
                                TripsCache.getCachedTripIds().then((ids: number[]) => {
                                    if (ids.indexOf(trip.id) >= 0) {
                                        this.props.addCachedTrip(trip) // notify app that trip is in cache
                                    }
                                })
                            })
                        }
                        this.props.isSocial(trip.isSocial)
                    }
                }).finally(() => {
                    this.setState({ isLoadingTrip: false })
                })
        }
    }

    public componentWillUnmount() {
        if (this.state.editHeartbeatId) {
            clearInterval(this.state.editHeartbeatId)
        }

        this.stopEditHeartbeat()
    }

    public setTripFields(fields: any, setEdited: boolean, save: boolean): Promise<void>
    {
        return new Promise((resolve) => {
            this.setState(state => ({ trip: { ...state.trip, ...fields } }), () => {
                if (setEdited && !this.state.editIsEdited) {
                    this.setState({ editIsEdited: true })
                }
                if (save && this.state.trip.id > 0) {
                    TripsService.postTripUpdate(this.state.trip.id as number, fields).finally(() => resolve())
                } else {
                    resolve()
                }
            })
        })
    }

    public setTripIsEdited(): void {
        if (!this.state.editIsEdited) {
            this.setState({ editIsEdited: true })
        }
    }

    public setTripParticipants(participants: IParticipant[], setEdited: boolean): void {
        this.setState({participants}, () => {
            if (setEdited && !this.state.editIsEdited) {
                this.setState({ editIsEdited: true })
            }
    })
    }

    public saveNewTripParticipant(participant: IParticipant): Promise<IParticipant[]> {
        this.setTripIsEdited()
        return TripsService.postTripParticipantNew(this.state.trip.id, participant)
            .then(() => this.requeryParticipants())
    }

    public requeryParticipants(): Promise<IParticipant[]> {
        return TripsService.getTripParticipants(this.props.id as number)
            .then((participants: IParticipant[]) => {
                participants = participants || []
                this.setState({ participants })
                return participants
            })
    }

    public get canEditTrip() {
        if (!this.availableToEdit) {
            return false
        }
        return this.amAdminOrLeader
    }

    public get availableToEdit() {
        return this.props.isOnline || this.props.isCached
    }

    public get amAdminOrLeader() {
        const me = MembersService.Me
        return this.amAdmin || this.state.participants.some((p: IParticipant) => me.id === p.memberId && p.isLeader)
    }

    public async onDeleteTrip() {
        if (this.state.trip.isDeleted || confirm('Are you sure you want to delete this trip?')) {
            this.setTripIsEdited()
            await TripsService.postTripUpdate(this.props.id as number, { isDeleted: !this.state.trip.isDeleted })
            this.props.setPath('/')
        }
    }

    public onStartNewEvent(existingTrip?: ITrip | null) {
        // First of the next month
        const openDate: Date = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        // Friday in the week after the open date (or Wednesday for Socials)
        const offset = (this.props.isNewSocial) ? 10 : 12
        const closeDate: Date = AddDays(openDate, offset - openDate.getDay())
        // For trips, The day after the close date (a Saturday)
        // For socials, the trip date is the same as the close date
        const tripDate: Date = (this.props.isNewSocial) ? closeDate : AddDays(closeDate, 1)

        this.suggestedTrip = {
            trip: {
                openDate: GetDateString(openDate),
                closeDate: GetDateString(closeDate),
                tripDate: GetDateString(tripDate),
                cost: existingTrip ? existingTrip.cost : '',
                departurePoint: existingTrip ? existingTrip.departurePoint : '',
                departureDetails: existingTrip ? existingTrip.departureDetails : '',
                description: existingTrip ? existingTrip.description : '',
                grade: existingTrip ? existingTrip.grade : this.props.isNewSocial ? 'Social' : '',
                isSocial: this.props.isNewSocial,
                isNoSignup: this.props.isNewSocial,
                prerequisites: existingTrip ? existingTrip.prerequisites : undefined,
                id: -1,
                length: existingTrip ? existingTrip.length : 1,
                logisticInfo: existingTrip ? existingTrip.logisticInfo : '',
                maps: existingTrip ? existingTrip.maps : [],
                mapHtml: existingTrip ? existingTrip.mapHtml : '',
                routes: existingTrip ? existingTrip.routes : [],
                isLimited: existingTrip ? existingTrip.isLimited : false,
                isFull: false,
                maxParticipants: existingTrip ? existingTrip.maxParticipants : 0,
                isDeleted: false,
                approval: this.props.isNewSocial || this.amAdmin ? TripState.Approved.id : TripState.Pending.id,
                approvalText: '',
                title: existingTrip ? existingTrip.title : '',
                state: this.props.isNewSocial ? 'Open' : 'Suggested',

                distanceOneWay: existingTrip ? existingTrip.distanceOneWay : 0,
                totalVehicleCost: null,
                payingParticipantsCount: null,
                vehicleFee: null
            },
            participants: [
                { ...TripParticipants.signMeUpTramper, isLeader: true }
            ],
        }
        this.setState(this.suggestedTrip)
    }

    public onSaveSuggestedTrip() {
        const trip = this.state.trip
        const participants = this.state.participants
        const tripWarnings = [] // TripsService.validateTrip(this.state.trip).filter(i => !i.ok)

        if (tripWarnings.length > 0) {
            this.setState({ showValidationMessage: true })
        }
        else {
            TripsService.postTripNew(trip)
                .then(newTrip => {
                    if (newTrip) {
                        TripsService.postTripParticipantNew(newTrip.id, participants[0])
                        .then(() => {
                            this.props.setPath('/')
                            const notificationText = trip.approval === TripState.Pending.id ?
                                "Thanks for submitting a trip. It will be checked by the trip-coordinators and you will receive an email when it is approved." :
                                "Trip has been added and auto-approved."
                            this.props.addNotification(notificationText, 'success')
                        })
                    }
                })
        }
    }

    public onCancelSuggestedTrip() {
        const trip = this.state.trip
        const participants = this.state.participants

        if (JSON.stringify({ trip, participants }) === JSON.stringify(this.suggestedTrip) ||
            window.confirm('You have made changes, are you sure you want to cancel?')) {
            this.props.setPath('/')
        }
    }

    public onEmail(): JSX.Element {
        const setTripIsEdited = () => this.setTripIsEdited()
        return <Email 
            trip={this.state.trip} 
            participants={this.state.participants}
            setTripIsEdited={setTripIsEdited}/>
    }

    public onHistory(): JSX.Element {
        return <History key={'History' + this.state.trip.id} 
            trip={this.state.trip} 
            participants={this.state.participants} />
    }

    public get participantsInfo(): IParticipantsInfo {
        const participants = this.state.participants || []
        const all = [...participants].sort((a, b) => GetDisplayPriority(a) - GetDisplayPriority(b))
        const trip = this.state.trip
        const maxParticipants = trip.maxParticipants || 999
        const leaders = all.filter(p => p.isLeader && !p.isDeleted)
        const moveable = all.filter(p => !p.isLeader && !p.isDeleted)
        const deleted = all.filter(p => p.isDeleted)
        const early = moveable.filter((_, i) => i < maxParticipants - leaders.length)
        const late = moveable.filter((_, i) => i >= maxParticipants - leaders.length)
        const current = [...leaders, ...early]

        return { maxParticipants, all, leaders, current, moveable, early, late, deleted }
    }

    public onApprovalSubmit(approval: IState) {
        const body = { approval: approval.id, approvalText: this.state.trip.approvalText }
        this.setTripIsEdited()
        TripsService.postTripUpdate(this.props.id as number, body)
            .then(() => this.props.setPath('/'))

    }
    public onApprovalCancel() {
        this.setState({ approval: null })
    }

    public approvalButton(approval: IState, onClick: (a: IState) => any): JSX.Element | null {
        const onApproval = () => onClick(approval)
        const visible =
            !this.props.isNew &&
            this.props.role >= approval.roleToChange &&
            !this.state.trip.isDeleted &&
            TripState[this.state.trip.approval || TripState.Pending.id].nextStates.indexOf(approval.id) >= 0

        return visible ?
            <Button onClick={onApproval} key={approval.id}
                    className="px-2 mx-1 ctc-button-outline">
                <span className={`fa ${approval.icon} fa-fw`} />{approval.button}
            </Button> : null
    }

    public approvalPrompt(): JSX.Element {

        const approval = this.state.approval || TripState.Pending
        const common = {
            onGet: () => this.state.trip.approvalText,
            onSet: (_: string, value: any) => this.setState({ trip: { ...this.state.trip, approvalText: value } }),
            onGetValidationMessage: () => null as unknown as string,
            onSave: (_: string, value: any) => {
                this.setState({ trip: { ...this.state.trip, approvalText: value } });
                return Promise.resolve()
            }
        }
        const onApprovalCancel = () => this.onApprovalCancel();

        return (
            <Container>
                <div>
                    {this.approvalButton(approval, this.onApprovalSubmit)}
                    <Button onClick={onApprovalCancel}
                            className="ctc-button-outline px-2 mx-1">
                        Cancel</Button>
                </div>
                <Container fluid={true}>
                    <Row>
                        <Col>
                            <TextAreaInputControl id='approval' field='description'
                                label={approval.prompt || ''} {...common} onSet={undefined} />
                        </Col>
                    </Row>
                </Container>
            </Container>)
    }

    public render() {
        if (!this.props.isNew) {
            this.memoizedStartEditHeatbeat(this.props.isOnline)
        } 

        if (this.state.isLoadingTrip) {
            return this.props.loadingStatus({ isLoadingTrip: this.state.isLoadingTrip })
        }

        if (this.state.approval) {
            return this.approvalPrompt()
        }

        const trip = this.state.trip
        const isNew = this.props.isNew
        const info = this.participantsInfo
        const tripWarnings = TripsService.validateTrip(this.state.trip).filter(i => !i.ok)
        const participantWarnings = info.current
            .flatMap(p => TripsService.validateParticipant(p, info.all)
            .filter(i => !i.ok))
            .map(i => i.message)
            .filter((value, index, self) => self.indexOf(value) === index) // unique
        const participantWarningJsx = !!participantWarnings.length
            ? <ToolTipIcon id='pw' key='pw' icon='warning' tooltip={participantWarnings.join(', ')} className='fw warning-icon' />
            : null
        const participantCountJsx = <span key='count' className='TripCount'>
            {` (${info.leaders.length + info.early.length}${info.late.length ? '+' + info.late.length : ''})`}
            </span>
        const seats = (pa: IParticipant[]) => pa.reduce((total, p, i, a) => total + (p.isVehicleProvider ? (p.seats ?? 0) : 0), 0)
        const totalSeats = seats(info.leaders) + seats(info.early)
        const totalLateSeats = seats(info.late)
        const totalSeatsJsx = <span key='totalseats' className='total-seats-count'>
            {` (${totalSeats}${totalLateSeats ? '+' + totalLateSeats : ''} seats)`}
            </span>
        const amAdmin = this.amAdmin
        const approval = TripState[this.state.trip.approval || TripState.Pending.id]
        // Note - approved trips can't be rejected (unless user is admin), but they can be deleted
        const approvalButtons = Object.keys(TripState).map(a =>
            this.approvalButton(TripState[a], () => this.setState({ approval: TripState[a] })))
        const onDeleteTrip = () => this.onDeleteTrip();
        const onSaveSuggestedTrip = () => this.onSaveSuggestedTrip();
        const onCancelSuggestedTrip = () => this.onCancelSuggestedTrip();
        const onEmail = () => this.onEmail();
        const onHistory = () => this.onHistory();
        const setTripFields = (fields: any, setEdited: boolean, save: boolean) => this.setTripFields(fields, setEdited, save)
        const setTripParticipants = (participants: IParticipant[], setEdited: boolean) => this.setTripParticipants(participants, setEdited)
        const saveNewTripParticipant = (participant: IParticipant) => this.saveNewTripParticipant(participant)
        const newMembersRep = MembersService.Members.length === 1 ? MembersService.Members[0] : null

        let status: JSX.Element | null = null
        if (trip.id <= 0) {
            status = <Pill>New trip - not saved!</Pill>
        } else {
            switch (trip.state) {
                case 'Deleted':
                    status = <Pill>This trip has been deleted</Pill>
                    break
                case TripState.Approved.id:
                    status = <Pill>This trip is not open yet</Pill>
                    break
                case TripState.Pending.id:
                case TripState.Resubmitted.id:
                    if (amAdmin) {
                        status = <TripHubAlert>
                            This trip needs to be approved or be given some suggestions for improvement.
                            Please check that all details are filled out correctly and
                            that the trip is suitable then use the buttons below to approve or suggest imrovements.
                        </TripHubAlert>
                    } else {
                        status = <Pill>This trip has only been suggested, and not yet approved</Pill>
                    }
                    break
                case 'Rejected':
                case 'SuggestChanges':
                case 'Draft':
                    status = <Pill>{approval.status}</Pill>
                    break
                case 'Closed':
                    status = <Pill>This trip is closed, please contact the leader</Pill>
            }
        }

        return (
            <Container className={ConfigService.containerClassName} key="triphubtripdetail" fluid={true}>
                <div key='tripstatus' className='py-1'>
                    {(this.state.editList || [])
                        .filter((item: IEdit) => item.id !== this.state.editId)
                        .map((item: IEdit) =>
                            <ToolTipIcon key={'edititem' + item.id} id={'edititem' + item.id} tooltip={`last known time ${item.stamp}`}>
                                <Badge className='noprint' pill={true}>
                                    {MembersService.getMemberById(item.userId).name} is {item.isEdited ? 'editing' : 'viewing'} this trip
                                </Badge>
                            </ToolTipIcon>)}
                    {status}
                    <Pill>Status: {approval.id} Group: {trip.state}</Pill>
                </div>
                <div key='adminActions' className="py-1" style={{ display: 'flex'}}>
                    {approvalButtons}
                    <Button onClick={onDeleteTrip} hidden={!this.canEditTrip || isNew || trip.isDeleted}
                            className="ctc-button-outline px-2 mx-1">
                        <span className='fa fa-trash fa-fw' />Delete this trip
                    </Button>
                    <Button onClick={onDeleteTrip} hidden={isNew || !trip.isDeleted}
                            className="ctc-button-outline px-2 mx-1">
                        <span className='fa fa-undo fa-fw' />Undelete this trip
                    </Button>
                </div>
                <Accordian key='detail' id='detail' className='trip-section' headerClassName='trip-section-header'
                    title={<span title={`Status: ${trip.approval}`}><b><span key='icon' className='fa fa-map-marker fa-fw' />{this.state.trip.title}</b></span>}
                    expanded={true}>
                    <TripDetail key={'TripDetail' + this.state.trip.id}
                        trip={this.state.trip} isNew={this.props.isNew}
                        canEditTrip={this.canEditTrip}
                        forceValidation={this.state.showValidationMessage}
                        role={this.props.role}
                        isOnline={this.props.isOnline}
                        setTripFields={setTripFields}
                    />
                </Accordian>
                <div hidden={!isNew} key='saveCancel' className="py-2">
                    <Button onClick={onSaveSuggestedTrip} className="ctc-button-outline px-2 mx-1">
                        Save
                    </Button>
                    <Button onClick={onCancelSuggestedTrip} className="ctc-button-outline px-2 mx-1">
                        Cancel
                    </Button>
                </div>
                <div className="alert alert-danger" role="alert" hidden={!this.state.showValidationMessage || tripWarnings.length === 0} key='validation'>
                    Some trip details are missing or incorrect. Please correct before saving.
                </div>
                <div className="alert alert-warning" role="alert" hidden={this.props.role > Role.NonMember || newMembersRep === null} key='nonmember-alert'>
                    <p>Members, please login in order to sign up for this trip.</p>
                    <p>Non-members, please refer to <a href="https://ctc.org.nz/index.php/about-the-ctc">About the CTC</a> and contact the new members rep, {newMembersRep?.name}, for details on participating in this trip.</p>
                </div>
                {(this.state.trip.isSocial && this.state.trip.isNoSignup) || this.props.role <= Role.NonMember ? null :
                    <Accordian key='participants' id='participants' className='trip-section' headerClassName='trip-section-header'
                        title={<span><b><span key='icon' className='fa fa-user fa-fw' />{['Participants', participantWarningJsx, participantCountJsx, totalSeatsJsx]}</b></span>}
                        expanded={true}>
                        <TripParticipants key={`TripParticipants${this.state.trip.id}${this.state.trip.prerequisites}`} 
                            participants={this.state.participants}
                            participantsInfo={this.participantsInfo}
                            trip={this.state.trip}
                            setTripParticipants={setTripParticipants}
                            saveNewTripParticipant={saveNewTripParticipant}
                            isNew={isNew}
                            availableToEdit={this.availableToEdit}
                            amAdminOrLeader={this.amAdminOrLeader} 
                            isOnline={this.props.isOnline} />
                    </Accordian>
                }
                {this.props.isNew || !this.canEditTrip ? null :
                    <Accordian key={`email${this.state.trip.id}_${this.state.participants.length}`} id='email'
                        className='trip-section' headerClassName='trip-section-header'
                        title={<span><b><span key='icon' className='fa fa-paper-plane fa-fw' />Email</b></span>}
                        expanded={false} onDemand={onEmail}>
                        Email ...
                    </Accordian>
                }
                {(this.state.trip.isSocial && this.state.trip.isNoSignup) || this.props.isNew || !this.amAdminOrLeader ? null :
                    <Accordian key={`costs${this.state.trip.id}_${this.state.participants.length}`} id='costs'
                        className='trip-section' headerClassName='trip-section-header'
                        title={<span><b><span key='icon' className='fa fa-dollar-sign fa-fw' />Cost Calculator</b></span>}
                        expanded={false}>
                        <TripCosts key={'TripCosts' + this.state.trip.id} 
                            trip={this.state.trip} 
                            participants={this.state.participants} 
                            currentParticipants={this.participantsInfo.current} 
                            canEditTrip={this.canEditTrip} 
                            setTripFields={setTripFields} 
                            setTripParticipants={setTripParticipants} />
                    </Accordian>
                }
                {(!amAdmin || this.props.isNew || !this.canEditTrip) ? null :
                    <Accordian key='history' id='history' className='trip-section' headerClassName='trip-section-header'
                        title={<span><b><span key='icon' className='fa fa-history fa-fw' />History</b></span>}
                        expanded={false} onDemand={onHistory}>
                        History ...
                    </Accordian>
                }
                <TripPrint key='tripprint' 
                    trip={this.state.trip} 
                    participantsInfo={this.participantsInfo} />
            </Container>
        )
    }

    private memoizedStartEditHeatbeat = memoizeOne((isOnline: boolean) => {
        if (this.props.role > Role.NonMember) { // Will fail 403 if NonMember
            this.startEditHeatbeat()
        }
    });

    public startEditHeatbeat() {
        if (this.props.isOnline && !this.state.editId) {
            TripsService.postTripEditHeartbeatInit(this.props.id as number, { stamp: new Date().toISOString() })
            .then((editList: IEdit[]) => {
                if (editList) {
                    this.setState({
                        editList,
                        editId: editList[0].id,
                        editIsEdited: false,
                        editHeartbeatId: setInterval(() => this.onEditHeartbeat(), ConfigService.Config.editRefreshInSec * 1000)
                    })
                }
            })
        }
    }

    public onEditHeartbeat() {
        if (this.props.isOnline && !this.state.editId) {
            TripsService.postTripEditHeartbeat(this.state.trip.id, this.state.editId, { stamp: new Date().toISOString(), isEdited: this.state.editIsEdited })
            .then((editList: IEdit[]) => {
                if (editList) {
                    this.setState({ editList })
                }
            })
        }
    }

    // only called from componentWillUnmount
    public stopEditHeartbeat() {
        if (this.state.editId) {
            TripsService.deleteTripEditHeartbeat(this.state.trip.id, this.state.editId)
        }
    }

    private get amAdmin(): boolean { return this.props.role >= Role.Admin }
}
