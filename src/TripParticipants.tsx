import * as React from 'react';
import { Button, Navbar, ButtonGroup, ListGroup, ListGroupItem, Container } from 'reactstrap';
import { Component } from 'react';
import { IParticipant, IParticipantsInfo, ITrip, Role } from './Interfaces';
import { Spinner } from './Widgets';
import { BindMethods, GetDisplayPriority } from './Utilities';
import { TripParticipant } from './TripParticipant';
import { MembersService } from './Services/MembersService';
import { TripsService } from './Services/TripsService';

export class TripParticipants extends Component<{
    participants: IParticipant[],
    participantsInfo: IParticipantsInfo
    trip: ITrip,
    isNew: boolean,
    availableToEdit: boolean,
    amAdminOrLeader: boolean,
    isOnline: boolean,
    setTripParticipants: (participants: IParticipant[], setEdited: boolean) => void
    saveNewTripParticipant: (participant: IParticipant) => Promise<IParticipant[]>
}, {
    showLegend: boolean
    isSaving: boolean
}> {

    public participant: React.RefObject<any>

    constructor(props: any) {
        super(props)
        this.state = {
            showLegend: false,
            isSaving: false,
        }
        this.participant = React.createRef()
        BindMethods(this)
    }

    public onSignMeUp() {

        if (!MembersService.Me.id) {
            const newMembersRep = MembersService.Members[0]
            alert(`Non members are most welcome to join club trips.\n` +
                `Please either:\n` +
                `• Get to meet us at our weekly meetings at\n` +
                `     Canterbury Mineral and Lapidary Club rooms,\n` +
                `     110 Waltham Rd, Waltham; or\n` +
                `• Contact ${newMembersRep.name} via the via the prospective members form`)
            return
        }
        this.setState({ isSaving: true })
        this.props.saveNewTripParticipant(TripParticipants.signMeUpTramper)
            .then(() => this.setState({ isSaving: false }))
    }

    public onSignUpTramper() {
        const participants = this.props.participants

        this.props.setTripParticipants([...participants, TripParticipants.blankTramper], false)
    }

    public onSignUpTramperSave() {
        const participant = this.props.participants[this.props.participants.length - 1]
        this.setState({ isSaving: true })
        this.props.saveNewTripParticipant(participant)
            .then(() => this.setState({ isSaving: false }))
    }

    public onSignUpTramperCancel() {
        this.props.setTripParticipants( this.props.participants.filter(p => p.id !== -1), false )
    }

    public static get blankTramper(): IParticipant {
        return {
            id: -1, isLeader: false, isPlbProvider: false, isAvalancheGearProvider: false, isDeleted: false, isVehicleProvider: false,
            logisticInfo: '', email: '', memberId: 0, name: '', phone: '', vehicleRego: '', seats: 0,
            emergencyContactName: '', emergencyContactPhone: '',

            broughtVehicle: false, isFixedCostVehicle: false,
            engineSize: null, totalDistance: null, ratePerKm: null, vehicleCost: null, 
            vehicleReimbursement: null, adjustedVehicleReimbursement: null,
            vehicleFee: null, 
            nonMemberFee: null, otherFees: null, 
            toPay: null, paid: null
        }
    }

    public static get signMeUpTramper(): IParticipant {
        const me = MembersService.Me
        return {
            ...this.blankTramper,
            memberId: me.id, name: me.name, email: me.email, phone: me.phone,
            emergencyContactName: me.emergencyContactName, emergencyContactPhone: me.emergencyContactPhone
        }
    }

    public onToggleLegend() {
        this.setState({ showLegend: !this.state.showLegend })
    }

    public onSetPosition(id: number, target?: IParticipant): Promise<any> {
        const info = this.props.participantsInfo
        const source = info.all.find(p => p.id === id) as IParticipant
        const sourceIndex = info.moveable.indexOf(source)
        let displayPriority = source.id

        if (info.moveable.length) {
            if (!target) {
                // If the target is not specified assume this is a toggle to/from the waitlist,
                // or to the end of the list if the participant is deleted
                const maxParticipantsExcludingLeader = info.maxParticipants - 1
                const endOfListIndex = info.moveable.length - 1
                const firstWaitListIndex = info.maxParticipants - 1
                const notOnWaitlist = sourceIndex < maxParticipantsExcludingLeader
                const toIndex = source.isDeleted ? endOfListIndex : firstWaitListIndex + (notOnWaitlist ? 0 : -1)
                target = info.moveable[toIndex]
            }

            const targetIndex = info.moveable.indexOf(target)
            const nextIndex = sourceIndex < targetIndex || source.isDeleted ? targetIndex + 1 : targetIndex - 1

            displayPriority = nextIndex < 0
                ? GetDisplayPriority(target) - 1
                : nextIndex >= info.moveable.length
                    ? GetDisplayPriority(target) + 1
                    : GetDisplayPriority(target) / 2 + GetDisplayPriority(info.moveable[nextIndex]) / 2
        }

        return this.setParticipant(id, { isDeleted: false, displayPriority: displayPriority.toString() }, true)
    }

    public setParticipant(id: number, fields: { [id: string]: any }, save: boolean): Promise<void> {
        return new Promise<void>((resolve) => {
            const participants = [...this.props.participants]
            const index = participants.findIndex(p => p.id === id)
            const participant = { ...participants[index], ...fields }
    
            participants[index] = participant
    
            this.props.setTripParticipants(participants, true)
            if (save && this.props.trip.id >= 0) {
                TripsService.postTripParticipantUpdate(this.props.trip.id, id, fields).finally(() => resolve())
            } else {
                resolve()
            }
        })
    }
    
    public render() {

        const me = MembersService.Me
        const anon = !me.id
        const info = this.props.participantsInfo
        const isOpen = this.props.trip.state === 'Open' || this.props.amAdminOrLeader
        const isNewTrip = this.props.isNew
        const hasNewTramper = !!info.all.find((p: IParticipant) => p.id === -1)
        const imOnList = !!info.all.find((m: IParticipant) => m.memberId === me.id)
        const onDragOver = (ev: any) => ev.preventDefault()
        const onDropOnWaitlist = (ev: any) => this.onSetPosition(parseInt(ev.dataTransfer.getData('id'), 10), undefined)
        const onDropOnDeleted = (ev: any) => this.setParticipant(parseInt(ev.dataTransfer.getData('id'), 10), { isDeleted: true }, true)
        const showLegend = this.state.showLegend
        const LegendIcon = (props: { icon: string, children: any }) =>
            <div>&nbsp;&nbsp;<span className={`fas ${props.icon}`} />&nbsp;{props.children}</div>
        const LegendButton = (props: { icon: string, children: any }) =>
            <div><Button disabled={true}><span className={`fa ${props.icon}`} /></Button>&nbsp;{props.children}</div>
        
        const onSignMeUp = () => this.onSignMeUp();
        const onSignUpTramper = () => this.onSignUpTramper();
        const onSignUpTramperSave = () => this.onSignUpTramperSave();
        const onSignUpTramperCancel = () => this.onSignUpTramperCancel();
        const onToggleLegend = () => this.onToggleLegend();
        const setParticipant = (id: number, data: { [id: string]: any }, save: boolean) => this.setParticipant(id, data, save);
        const setPosition = (id: number, target?: IParticipant) => this.onSetPosition(id, target)

        return [
            <Container key='parameters-initial' fluid={true}>
                <Navbar key='navbar' color='light' light={true} expand='md'>
                    {[
                        <Button key={'signmeup' + info.all.length} onClick={onSignMeUp}
                            hidden={isNewTrip || imOnList || !isOpen || !this.props.isOnline}>
                            <span className='fa fa-pen wiggle' />
                            {this.state.isSaving ? ['Signing up ', Spinner] : 'Sign me up!'}
                            {info.current.length >= info.maxParticipants ? " (on waitlist)" : ""}
                        </Button>,
                        <Button key={'signup' + info.all.length} onClick={onSignUpTramper}
                            hidden={isNewTrip || hasNewTramper || !isOpen || anon || !this.props.amAdminOrLeader || !this.props.isOnline}>
                            <span className='fa fa-user-plus' /> Sign up a tramper
                            {info.current.length >= info.maxParticipants ? " (on waitlist)" : ""}
                        </Button>,
                        <ButtonGroup key={'signupcomplete' + info.all.length}
                            hidden={isNewTrip || !hasNewTramper || !isOpen}>
                            <Button onClick={onSignUpTramper} disabled={true}>
                                <span className='fa fa-user-plus' /> Sign up a tramper:
                            </Button>
                            <Button key='save' color='primary' onClick={onSignUpTramperSave}>
                                {this.state.isSaving ? ['Saving ', Spinner] : 'Save'}
                            </Button>
                            <Button key='cancel' color='primary' onClick={onSignUpTramperCancel}>
                                Cancel
                            </Button>
                        </ButtonGroup>,
                        <Button key={'help' + info.all.length} onClick={onToggleLegend} hidden={isNewTrip || anon}>
                            <span className='fa fa-question-circle' />{showLegend ? 'Hide legend' : 'Show legend'}
                        </Button>
                    ]}
                </Navbar>
                {showLegend ? <div className='participant-buttons-legend'>
                    <LegendIcon icon='fa-star'>This person is the leader</LegendIcon>
                    <LegendIcon icon='fa-podcast'>This person is taking a Personal Location Beacon</LegendIcon>
                    <LegendIcon icon='fa-car'>This person can bring a car</LegendIcon>
                    <LegendIcon icon='fa-snowflake'>This person is taking Avalanche Gear</LegendIcon>
                    <LegendIcon icon='fa-comment'>There is special logistical information here</LegendIcon>
                    <LegendIcon icon='fa-id-badge'>This person is not a member of the CTC</LegendIcon>
                    <LegendButton icon='fa-angle-up'>Moves the person up the list</LegendButton>
                    <LegendButton icon='fa-angle-down'>Moves the person down the list</LegendButton>
                    <LegendButton icon='fa-trash'>Takes the person off the list</LegendButton>
                    <LegendButton icon='fa-sm fa-pen'>Puts the person back on the list</LegendButton>
                    <LegendButton icon='fa-sm fa-user-plus'>Puts the person on the wait-list</LegendButton>
                    <LegendButton icon='fa-sm fa-user-times'>Takes the person off the wait-list</LegendButton>
                    <LegendButton icon='fa-sm fa-phone'>Updates emergency contact details</LegendButton>
                </div> : null}
            </Container>,

            <ListGroup key='participants'>
                <ListGroupItem>
                    {
                        info.current.map(p =>
                            <TripParticipant key={`${p.id}${p.displayPriority}${p.isDeleted}`} 
                                participant={p}
                                trip={this.props.trip}
                                availableToEdit={this.props.availableToEdit}
                                amAdminOrLeader={this.props.amAdminOrLeader} 
                                isOnline={this.props.isOnline}
                                setParticipant={setParticipant}
                                setPosition={setPosition}
                                canWaitList={info.late.length !== 0}
                                participants={this.props.participants}
                                participantsInfo={info} />)
                    }
                </ListGroupItem>
                <ListGroupItem hidden={info.late.length === 0}>
                    <div onDragOver={onDragOver} onDrop={onDropOnWaitlist}><b>Waitlist</b></div>
                    {
                        info.late.map(p =>
                            <TripParticipant key={`${p.id}${p.displayPriority}${p.isDeleted}`}
                                participant={p}
                                trip={this.props.trip}
                                availableToEdit={this.props.availableToEdit}
                                amAdminOrLeader={this.props.amAdminOrLeader} 
                                isOnline={this.props.isOnline}
                                setParticipant={setParticipant}
                                setPosition={setPosition}
                                canUnwaitList={true} 
                                participants={this.props.participants}
                                participantsInfo={info} 
                            />)
                    }
                </ListGroupItem>
                <ListGroupItem hidden={isNewTrip || info.deleted.length === 0}>
                    <div onDragOver={onDragOver} onDrop={onDropOnDeleted}><b>Deleted</b></div>
                    {
                        info.deleted.map(p =>
                            <TripParticipant key={`${p.id}${p.displayPriority}${p.isDeleted}`} 
                                participant={p}
                                trip={this.props.trip}
                                availableToEdit={this.props.availableToEdit}
                                amAdminOrLeader={this.props.amAdminOrLeader} 
                                isOnline={this.props.isOnline}
                                setParticipant={setParticipant}
                                setPosition={setPosition}
                                participants={this.props.participants}
                                participantsInfo={info} />)
                    }
                </ListGroupItem>
            </ListGroup>,
        ]
    }
}
