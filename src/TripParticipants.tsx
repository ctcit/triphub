import * as React from 'react';
import { Button, Navbar, ButtonGroup, ListGroup, ListGroupItem } from 'reactstrap';
import { Component } from 'react';
import { IParticipant } from './Interfaces';
import { Spinner } from './Widgets';
import { Trip } from './Trip';
import { App } from './App';
import { BindMethods, GetDisplayPriority } from './Utilities';
import { TripParticipant } from './TripParticipant';

export class TripParticipants extends Component<{
    trip: Trip,
    app: App
}, {
}> {

    public participant: React.RefObject<any>

    constructor(props: any) {
        super(props)
        this.state = {}
        this.participant = React.createRef()
        BindMethods(this)
    }

    public onSignUpTramper() {
        const participants = this.props.trip.state.participants

        this.props.trip.setState({ participants: [...participants, this.props.trip.blankTramper] })
    }

    public onSignMeUp() {

        if (!this.props.app.me.id) {
            const newMembersRep = this.props.app.state.members[0]
            alert(`Non members are most welcome to join club trips.\n` +
                `Please either:\n` +
                `• Get to meet us at our weekly meetings at\n` +
                `     Canterbury Mineral and Lapidary Club rooms,\n` +
                `     110 Waltham Rd, Waltham; or\n` +
                `• Contact ${newMembersRep.name} via the via the prospective members form`)
            return
        }

        this.props.trip.setState({ isSaving: true })
        this.props.app.triphubApiCall('POST', this.props.trip.props.href + '/participants',
            this.props.trip.signMeUpTramper, true)
            .then(this.props.trip.onRequeryParticipants)
    }

    public onSignUpTramperSave() {
        const participant = this.props.trip.state.participants[this.props.trip.state.participants.length - 1]

        this.props.trip.setState({ isSaving: true })
        this.props.app.triphubApiCall('POST', this.props.trip.props.href + '/participants', participant, true)
            .then(this.props.trip.onRequeryParticipants)
    }

    public onSignUpTramperCancel() {
        this.props.trip.setState({ participants: this.props.trip.state.participants.filter(p => p.id !== -1) })
    }

    public onToggleLegend() {
        this.props.trip.setState({ showLegend: !this.props.trip.state.showLegend })
    }

    public onSetPosition(id: number, target?: IParticipant, showMenu?: boolean): Promise<any> {
        const info = this.props.trip.participantsInfo
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

        return this.onSetParticipant(id, { isDeleted: false, displayPriority: displayPriority.toString() }, showMenu)
    }

    public onSetParticipant(id: number, props: {}, showMenu?: boolean): Promise<any> {

        const participants = [...this.props.trip.state.participants]
        const participant = participants.find((p: IParticipant) => p.id === id) as IParticipant
        const index = participants.indexOf(participant)

        participants[index] = { ...participant, ...props, showMenu }

        this.props.trip.setState({ participants })
        return this.props.app.triphubApiCall('POST', `${this.props.trip.props.href}/participants/${id}`, props, true)
    }

    public onDropOnDeleted(ev: any) {
        this.onSetParticipant(parseInt(ev.dataTransfer.getData('id'), 10), { isDeleted: true })
    }

    public render() {

        const me = this.props.app.me
        const anon = !me.id
        const info = this.props.trip.participantsInfo
        const isPrivileged = this.props.trip.canEditTrip
        const isOpen = this.props.trip.state.trip.state === 'Open' || isPrivileged
        const isNewTrip = this.props.trip.props.isNew
        const hasNewTramper = !!info.all.find((p: IParticipant) => p.id === -1)
        const imOnList = !!info.all.find((m: IParticipant) => m.memberId === me.id)
        const onDragOver = (ev: any) => ev.preventDefault()
        const onDropOnWaitlist = (ev: any) => this.onSetPosition(parseInt(ev.dataTransfer.getData('id'), 10), undefined)
        const onDropOnDeleted = (ev: any) => this.onDropOnDeleted(ev);
        const showLegend = this.props.trip.state.showLegend
        const LegendIcon = (props: { icon: string, children: any }) =>
            <div><span className={`fas ${props.icon}`} />{props.children}</div>
        const LegendButton = (props: { icon: string, children: any }) =>
            <div><Button disabled={true}><span className={`fa ${props.icon}`} /></Button>{props.children}</div>
        
        const onSignMeUp = () => this.onSignMeUp();
        const onSignUpTramper = () => this.onSignUpTramper();
        const onSignUpTramperSave = () => this.onSignUpTramperSave();
        const onSignUpTramperCancel = () => this.onSignUpTramperCancel();
        const onToggleLegend = () => this.onToggleLegend();

        return [
            <Navbar key='navbar' color='light' light={true} expand='md'>
                {[
                    <Button key={'signmeup' + info.all.length} onClick={onSignMeUp}
                        hidden={isNewTrip || imOnList || !isOpen}>
                        <span className='fa fa-pen wiggle' />
                        {this.props.trip.state.isSaving ? ['Signing up ', Spinner] : 'Sign me up!'}
                        {info.current.length >= info.maxParticipants ? " (on waitlist)" : ""}
                    </Button>,
                    <Button key={'signup' + info.all.length} onClick={onSignUpTramper}
                        hidden={isNewTrip || hasNewTramper || !isOpen || anon || !isPrivileged}>
                        <span className='fa fa-user-plus' /> Sign up a tramper
                        {info.current.length >= info.maxParticipants ? " (on waitlist)" : ""}
                    </Button>,
                    <ButtonGroup key={'signupcomplete' + info.all.length}
                        hidden={isNewTrip || !hasNewTramper || !isOpen}>
                        <Button onClick={onSignUpTramper} disabled={true}>
                            <span className='fa fa-user-plus' /> Sign up a tramper:
                        </Button>
                        <Button key='save' color='primary' onClick={onSignUpTramperSave}>
                            {this.props.trip.state.isSaving ? ['Saving ', Spinner] : 'Save'}
                        </Button>
                        <Button key='cancel' color='primary' onClick={onSignUpTramperCancel}>
                            Cancel
                        </Button>
                    </ButtonGroup>,
                    <Button key={'help' + info.all.length} onClick={onToggleLegend} hidden={isNewTrip || anon}>
                        <span className='fa fa-question-circle' />{showLegend ? 'Hide legend' : 'Show legend'}
                    </Button>
                ]}
            </Navbar>,
            (showLegend ? <div className='participant-buttons-legend'>
                <LegendIcon icon='fa-star'>This person is the leader</LegendIcon>
                <LegendIcon icon='fa-podcast'>This person is taking a Personal Location Beacon</LegendIcon>
                <LegendIcon icon='fa-car'>This person is taking a Car</LegendIcon>
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
            </div> : null),
            <ListGroup key='participants'>
                <ListGroupItem>
                    {
                        info.current.map(p =>
                            <TripParticipant key={`${p.id}${p.displayPriority}${p.isDeleted}`} participantId={p.id}
                                data={JSON.stringify(p)} trip={this.props.trip}
                                owner={this} app={this.props.app}
                                canWaitList={info.late.length !== 0} ref={this.participant} info={info} />)
                    }
                </ListGroupItem>
                <ListGroupItem hidden={info.late.length === 0}>
                    <div onDragOver={onDragOver} onDrop={onDropOnWaitlist}><b>Waitlist</b></div>
                    {
                        info.late.map(p =>
                            <TripParticipant key={`${p.id}${p.displayPriority}${p.isDeleted}`} participantId={p.id}
                                data={JSON.stringify(p)} trip={this.props.trip}
                                owner={this} app={this.props.app}
                                canUnwaitList={true} info={info} />)
                    }
                </ListGroupItem>
                <ListGroupItem hidden={isNewTrip || info.deleted.length === 0}>
                    <div onDragOver={onDragOver} onDrop={onDropOnDeleted}><b>Deleted</b></div>
                    {
                        info.deleted.map(p =>
                            <TripParticipant key={`${p.id}${p.displayPriority}${p.isDeleted}`} participantId={p.id}
                                data={JSON.stringify(p)} trip={this.props.trip}
                                owner={this} app={this.props.app} info={info} />)
                    }
                </ListGroupItem>
            </ListGroup>,
        ]
    }
}
