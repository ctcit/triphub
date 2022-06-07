import * as React from 'react'
import { Component } from 'react'
import { Button } from 'reactstrap'
import { BaseUrl } from '.'
import { App } from './App'
import { AdminHint as TripHubAlert } from './Widgets'
import { IEdit, IParticipant, ITrip, IParticipantsInfo, IState } from './Interfaces'
import { GetDateString, AddDays, GetDisplayPriority, BindMethods } from './Utilities'
import { TripDetail } from './TripDetail'
import { TripParticipants } from './TripParticipants'
import { History } from './History'
import { Email } from './Email'
import { TripPrint } from './TripPrint'
import { Pill } from './Widgets'
import './index.css'
import { ToolTipIcon } from './ToolTipIcon'
import { Accordian } from './Accordian'
import Container from 'reactstrap/lib/Container'
import Badge from 'reactstrap/lib/Badge'
import { TextAreaInputControl } from './Control'
import Row from 'reactstrap/lib/Row'
import Col from 'reactstrap/lib/Col'
import { TripState } from './TripStates'


export class Trip extends Component<{
    isNew: boolean,
    isNewSocial: boolean,
    href?: string,
    app: App
}, {
    trip: ITrip,
    editId: number,
    editHref: string,
    editIsEdited: boolean,
    editList: IEdit[],
    editHeartbeatId?: any,
    participants: IParticipant[],
    isSaving: boolean,
    isLoadingTrip: boolean,
    showValidationMessage: boolean,
    showLegend: boolean,
    approval?: IState | null
}> {

    public suggestedTrip: { trip: ITrip, participants: IParticipant[] }

    constructor(props: any) {
        super(props)
        this.state = {
            editId: 0,
            editHref: '',
            editIsEdited: false,
            editList: [],
            participants: [],
            trip: { id: 0 } as ITrip,
            isSaving: true,
            isLoadingTrip: true,
            showValidationMessage: false,
            showLegend: false,
        }

        BindMethods(this)
    }

    public componentDidMount() {
        if (this.props.isNew) {
            this.setState({ isLoadingTrip: false })
            this.onStartNewEvent()
        } else {
            this.setState({ isLoadingTrip: true })
            this.props.app.triphubApiCall('POST', this.props.href + '/edit', { stamp: new Date().toISOString() })
                .then((editList: IEdit[]) => {
                    if (editList) {
                        this.setState({
                            editList,
                            editId: editList[0].id,
                            editHref: `${this.props.href}/edit/${editList[0].id}`,
                            editIsEdited: false,
                            editHeartbeatId: setInterval(() => this.onEditHeartbeat(), this.props.app.state.config.editRefreshInSec * 1000)
                        })
                    }
                })

            this.props.app.triphubApiCall('GET', this.props.href as string)
                .then((trip: ITrip[]) => {
                    this.setState({ isLoadingTrip: false })
                    this.setState({ trip: trip[0] })
                })

            this.onRequeryParticipants()
        }
    }

    public componentWillUnmount() {
        if (this.state.editHeartbeatId) {
            clearInterval(this.state.editHeartbeatId)
        }

        if (this.state.editHref) {
            this.props.app.triphubApiCall('DELETE', this.state.editHref, {})
        }
    }

    public onRequeryParticipants() {
        this.props.app.triphubApiCall('GET', this.props.href + '/participants')
            .then((participants: IParticipant[]) => {
                participants = participants || []
                this.setState({ participants, isSaving: false })
            })
    }

    public get canEditTrip() {
        const me = this.props.app.me
        return this.props.app.amAdmin ||
            this.state.participants.some((p: IParticipant) => me.id === p.memberId && p.isLeader)
    }

    public get blankTramper(): IParticipant {
        return {
            id: -1, isLeader: false, isPlbProvider: false, isDeleted: false, isVehicleProvider: false,
            logisticInfo: '', email: '', memberId: 0, name: '', phone: '', vehicleRego: '',
            emergencyContactName: '', emergencyContactPhone: ''
        }
    }

    public get signMeUpTramper(): IParticipant {
        const me = this.props.app.me
        return {
            ...this.blankTramper,
            memberId: me.id, name: me.name, email: me.email, phone: me.phone,
            emergencyContactName: me.emergencyContactName, emergencyContactPhone: me.emergencyContactPhone
        }
    }

    public async onDeleteTrip() {
        if (this.state.trip.isDeleted || confirm('Are you sure you want to delete this trip?')) {
            await this.props.app.triphubApiCall('POST', this.props.href as string, { isDeleted: !this.state.trip.isDeleted }, true)
            this.props.app.setPath('/')
        }
    }

    public onStartNewEvent() {
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
                approval: this.props.isNewSocial || this.props.app.amAdmin ? TripState.Approved.id : TripState.Pending.id,
                approvalText: '',
                title: '',
                state: this.props.isNewSocial ? 'Open' : 'Suggested'
            },
            participants: [
                { ...this.signMeUpTramper, isLeader: true }
            ],
        }
        this.setState(this.suggestedTrip)
    }

    public onSaveSuggestedTrip() {
        const trip = this.state.trip
        const participants = this.state.participants
        const tripWarnings = this.props.app.validateTrip(this.state.trip).filter(i => !i.ok)

        if (tripWarnings.length > 0) {
            this.setState({ showValidationMessage: true })
        }
        else {
            this.props.app.triphubApiCall('POST', BaseUrl + '/trips', trip)
                .then(data => {
                    const newTrip = data[0] as ITrip
                    const url = BaseUrl + '/trips/' + newTrip.id + '/participants'
                    this.props.app.triphubApiCall('POST', url, participants[0])
                        .then(() => {
                            this.props.app.setPath('/')
                            const notificationText = trip.approval === TripState.Pending.id ?
                                "Thanks for submitting a trip. It will be checked by the trip-coordinators and you will receive an email when it is approved." :
                                "Trip has been added and auto-approved."
                            this.props.app.addNotification(notificationText, 'success')
                        })
                })
        }
    }

    public onCancelSuggestedTrip() {
        const trip = this.state.trip
        const participants = this.state.participants

        if (JSON.stringify({ trip, participants }) === JSON.stringify(this.suggestedTrip) ||
            window.confirm('You have made changes, are you sure you want to cancel?')) {
            this.props.app.setPath('/')
        }
    }

    public onEmail(): JSX.Element {
        return <Email owner={this} app={this.props.app} />
    }

    public onHistory(): JSX.Element {
        return <History key={'History' + this.state.trip.id} owner={this} app={this.props.app} />
    }

    public get participantsInfo(): IParticipantsInfo {
        const participants = this.state.participants || []
        const all = [...participants].sort((a, b) => GetDisplayPriority(a) - GetDisplayPriority(b))
        const trip = this.state.trip
        const maxParticipants = trip.maxParticipants === 0 ? 999 : trip.maxParticipants
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
        this.props.app.triphubApiCall('POST', this.props.href as string, body, true)
            .then(() => this.props.app.setPath('/'))

    }
    public onApprovalCancel() {
        this.setState({ approval: null })
    }

    public approvalButton(approval: IState, onClick: (a: IState) => any): JSX.Element | null {
        const onApproval = () => onClick(approval)
        const visible =
            !this.props.isNew &&
            this.props.app.state.role >= approval.roleToChange &&
            !this.state.trip.isDeleted &&
            TripState[this.state.trip.approval || TripState.Pending.id].nextStates.indexOf(approval.id) >= 0

        return visible ?
            <Button color='primary' onClick={onApproval} key={approval.id} className="px-2 mx-1">
                <span className={`fa ${approval.icon} fa-fw`} />{approval.button}
            </Button> : null
    }

    public approvalPrompt(): JSX.Element {

        const approval = this.state.approval || TripState.Pending
        const common = {
            onGet: () => this.state.trip.approvalText,
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
                    <Button color='primary' onClick={onApprovalCancel} className="px-2 mx-1">
                        Cancel</Button>
                </div>
                <Container fluid={true}>
                    <Row>
                        <Col>
                            <TextAreaInputControl id='approval' field='description'
                                label={approval.prompt || ''} {...common} />
                        </Col>
                    </Row>
                </Container>
            </Container>)
    }

    public render() {
        if (this.state.isLoadingTrip) {
            return this.props.app.loadingStatus({ ...this.props.app.state, ...this.state })
        }

        if (this.state.approval) {
            return this.approvalPrompt()
        }

        const trip = this.state.trip
        const app = this.props.app
        const isNew = this.props.isNew
        const info = this.participantsInfo
        const tripWarnings = this.props.app.validateTrip(this.state.trip).filter(i => !i.ok)
        const participantWarnings = info.current.flatMap(p => app.validateParticipant(p, info.all).filter(i => !i.ok))
        const participantWarning = !!participantWarnings.length
            ? <ToolTipIcon id='pw' key='pw' icon='warning' tooltip={participantWarnings[0].message} className='fw warning-icon' />
            : null
        const participantCount = <span key='count' className='TripCount'>
            {` (${info.leaders.length + info.early.length}${info.late.length ? '+' + info.late.length : ''})`}
        </span>
        const amAdmin = this.props.app.amAdmin
        const approval = TripState[this.state.trip.approval || TripState.Pending.id]
        // Note - approved trips can't be rejected (unless user is admin), but they can be deleted
        const approvalButtons = Object.keys(TripState).map(a =>
            this.approvalButton(TripState[a], () => this.setState({ approval: TripState[a] })))
        const onDeleteTrip = () => this.onDeleteTrip();
        const onSaveSuggestedTrip = () => this.onSaveSuggestedTrip();
        const onCancelSuggestedTrip = () => this.onCancelSuggestedTrip();
        const onEmail = () => this.onEmail();
        const onHistory = () => this.onHistory();

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
            <Container className={this.props.app.containerClassName} key="triphubtripdetail" fluid={true}>
                <div key='tripstatus' className='py-1'>
                    {(this.state.editList || [])
                        .filter((item: IEdit) => item.id !== this.state.editId)
                        .map((item: IEdit) =>
                            <ToolTipIcon key={'edititem' + item.id} id={'edititem' + item.id} tooltip={`last known time ${item.stamp}`}>
                                <Badge className='noprint' pill={true}>
                                    {this.props.app.getMemberById(item.userId).name} is {item.isEdited ? 'editing' : 'viewing'} this trip
                                </Badge>
                            </ToolTipIcon>)}
                    {status}
                    <Pill>Status: {approval.id} Group: {trip.state}</Pill>
                </div>
                <div key='adminActions' className="py-1">
                    {approvalButtons}
                    <Button color='primary' onClick={onDeleteTrip} hidden={!this.canEditTrip || isNew || trip.isDeleted} className="px-2 mx-1">
                        <span className='fa fa-trash fa-fw' />Delete this trip
                    </Button>
                    <Button onClick={onDeleteTrip} hidden={isNew || !trip.isDeleted} className="px-2 mx-1">
                        <span className='fa fa-undo fa-fw' />Undelete this trip
                    </Button>
                </div>
                <Accordian key='detail' id='detail' className='trip-section' headerClassName='trip-section-header'
                    title={<span title={`Status: ${trip.approval}`}><b><span key='icon' className='fa fa-map-marker fa-fw' />{this.state.trip.title}</b></span>}
                    expanded={true}>
                    <TripDetail key={'TripDetail' + this.state.trip.id} owner={this} app={this.props.app}
                        forceValidation={this.state.showValidationMessage} />
                </Accordian>
                <div hidden={!isNew} key='saveCancel' className="py-2">
                    <Button color='primary' onClick={onSaveSuggestedTrip} className="px-2 mx-1">
                        Save
                    </Button>
                    <Button color='primary' onClick={onCancelSuggestedTrip} className="px-2 mx-1">
                        Cancel
                    </Button>
                </div>
                <div className="alert alert-danger" role="alert" hidden={!this.state.showValidationMessage || tripWarnings.length === 0} key='validation'>
                    Some trip details are missing or incorrect. Please correct before saving.
                </div>
                {this.state.trip.isSocial && this.state.trip.isNoSignup ? null :
                    <Accordian key='participants' id='participants' className='trip-section' headerClassName='trip-section-header'
                        title={<span><b><span key='icon' className='fa fa-user fa-fw' />{['Participants', participantWarning, participantCount]}</b></span>}
                        expanded={true}>
                        <TripParticipants key={'TripParticipants' + this.state.trip.id} trip={this}
                            app={this.props.app} />
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
                {(!amAdmin || this.props.isNew) ? null :
                    <Accordian key='history' id='history' className='trip-section' headerClassName='trip-section-header'
                        title={<span><b><span key='icon' className='fa fa-history fa-fw' />History</b></span>}
                        expanded={false} onDemand={onHistory}>
                        History ...
                    </Accordian>
                }
                <TripPrint key='tripprint' trip={this} app={this.props.app} />
            </Container>
        )
    }

    public onEditHeartbeat() {
        this.props.app.triphubApiCall('POST', this.state.editHref, { stamp: new Date().toISOString(), isEdited: this.state.editIsEdited })
            .then((editList: IEdit[]) => {
                if (editList) {
                    this.setState({ editList })
                }
            })
    }
}
